import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database
database_url = os.environ.get("DATABASE_URL", "sqlite:///blog.db")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the app with the extension
db.init_app(app)

# Simple hardcoded admin credentials - change these directly
ADMIN_KEYNAME = "admin"
ADMIN_PASSWORD = "changeme123"

# Define models

class Blog(db.Model):
    """Blog post model"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100), nullable=False, default="Anonymous")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Blog {self.title}>'

# Create tables
with app.app_context():
    db.create_all()
    logging.info(f"Admin credentials: keyname='{ADMIN_KEYNAME}', password='{ADMIN_PASSWORD}'")

@app.route('/')
def index():
    """Homepage showing all blog titles"""
    blogs = Blog.query.order_by(Blog.created_at.desc()).all()
    return render_template('index.html', blogs=blogs)

@app.route('/blog/<int:blog_id>')
def view_blog(blog_id):
    """View individual blog post"""
    blog = Blog.query.get_or_404(blog_id)
    return render_template('blog.html', blog=blog)

@app.route('/admin', methods=['GET', 'POST'])
def admin_login():
    """Admin login and dashboard"""
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'login':
            keyname = request.form.get('keyname')
            password = request.form.get('password')
            
            if keyname and password:
                if keyname == ADMIN_KEYNAME and password == ADMIN_PASSWORD:
                    session['admin_logged_in'] = True
                    flash('Login successful!', 'success')
                    return redirect(url_for('admin_login'))
                else:
                    flash('Invalid credentials!', 'error')
            else:
                flash('Please enter both keyname and password!', 'error')
        
        elif action == 'logout':
            session.pop('admin_logged_in', None)
            session.pop('admin_id', None)
            flash('Logged out successfully!', 'success')
            return redirect(url_for('index'))
        
        elif session.get('admin_logged_in'):
            if action == 'create_blog':
                title = request.form.get('title')
                content = request.form.get('content')
                author = request.form.get('author', 'Anonymous').strip()
                
                if title and content:
                    # Check if we already have 5 blogs
                    blog_count = Blog.query.count()
                    if blog_count >= 5:
                        flash('Maximum 5 blogs allowed! Please delete a blog first.', 'error')
                    else:
                        if not author:
                            author = 'Anonymous'
                        new_blog = Blog(title=title, content=content, author=author)
                        db.session.add(new_blog)
                        db.session.commit()
                        flash('Blog created successfully!', 'success')
                else:
                    flash('Title and content are required!', 'error')
            
            elif action == 'delete_blog':
                blog_id = request.form.get('blog_id')
                if blog_id:
                    blog = Blog.query.get(blog_id)
                    if blog:
                        # Check if we would go below minimum of 1 blog
                        blog_count = Blog.query.count()
                        if blog_count <= 1:
                            flash('Cannot delete the last blog! Minimum 1 blog required.', 'error')
                        else:
                            db.session.delete(blog)
                            db.session.commit()
                            flash('Blog deleted successfully!', 'success')
                    else:
                        flash('Blog not found!', 'error')
            
            elif action == 'change_password':
                flash('To change password, edit ADMIN_PASSWORD in app.py file!', 'error')
    
    # Get data for admin dashboard
    if session.get('admin_logged_in'):
        blogs = Blog.query.order_by(Blog.created_at.desc()).all()
        blog_count = len(blogs)
        return render_template('admin.html', blogs=blogs, blog_count=blog_count, logged_in=True)
    else:
        return render_template('admin.html', logged_in=False)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
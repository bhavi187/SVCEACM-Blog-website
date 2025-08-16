// Rich Text Editor Functions
document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('editor');
    const contentInput = document.getElementById('content');
    
    if (editor && contentInput) {
        // Update hidden textarea when editor content changes
        editor.addEventListener('input', function() {
            contentInput.value = editor.innerHTML;
            updatePreview();
        });

        // Set initial focus
        editor.addEventListener('focus', function() {
            if (editor.innerHTML.trim() === '') {
                editor.innerHTML = '<p><br></p>';
                setCursorToEnd(editor);
            }
        });

        // Handle form submission
        const form = editor.closest('form');
        if (form) {
            form.addEventListener('submit', function(e) {
                contentInput.value = editor.innerHTML;
                
                // Basic validation
                if (editor.innerText.trim().length === 0) {
                    e.preventDefault();
                    alert('Please add some content to your blog post.');
                    return false;
                }
            });
        }

        // Handle paste events to preserve formatting
        editor.addEventListener('paste', function(e) {
            e.preventDefault();
            
            // Get clipboard data
            const clipboardData = e.clipboardData || window.clipboardData;
            
            // Try to get HTML first (preserves formatting)
            let pastedData = clipboardData.getData('text/html');
            
            // If no HTML data, fall back to plain text
            if (!pastedData) {
                pastedData = clipboardData.getData('text/plain');
                // Convert line breaks to <br> tags for plain text
                pastedData = pastedData.replace(/\n/g, '<br>');
            } else {
                // Clean up the HTML but preserve basic formatting
                pastedData = cleanPastedHTML(pastedData);
            }
            
            // Insert the content
            document.execCommand('insertHTML', false, pastedData);
        });
    }

    // Auto-hide flash messages after 5 seconds
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(function(message) {
        setTimeout(function() {
            message.style.opacity = '0';
            setTimeout(function() {
                message.remove();
            }, 300);
        }, 5000);
    });
});

// Format text function
function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById('editor').focus();
}

// Change font size
function changeFontSize(size) {
    if (size) {
        document.execCommand('fontSize', false, '7');
        const fontElements = document.querySelectorAll('font[size="7"]');
        fontElements.forEach(function(el) {
            el.removeAttribute('size');
            el.style.fontSize = size;
        });
        document.getElementById('editor').focus();
    }
}

// Change font family
function changeFontFamily(font) {
    if (font) {
        document.execCommand('fontName', false, font);
        document.getElementById('editor').focus();
    }
}

// Insert link
function insertLink() {
    const url = prompt('Enter the URL:');
    if (url) {
        const text = prompt('Enter the link text:') || url;
        const link = `<a href="${url}" target="_blank">${text}</a>`;
        document.execCommand('insertHTML', false, link);
        document.getElementById('editor').focus();
    }
}

// Clean pasted HTML while preserving basic formatting
function cleanPastedHTML(html) {
    // Create a temporary div to parse and clean the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove unwanted elements and attributes
    const elementsToRemove = tempDiv.querySelectorAll('script, style, meta, link, head, title');
    elementsToRemove.forEach(el => el.remove());
    
    // List of allowed tags for basic formatting
    const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'span', 'div'];
    
    // List of allowed attributes
    const allowedAttributes = ['href', 'target', 'style'];
    
    // Clean all elements recursively
    function cleanElement(element) {
        // Remove elements not in allowed list
        if (element.nodeType === 1 && !allowedTags.includes(element.tagName.toLowerCase())) {
            // Replace with its content
            const parent = element.parentNode;
            while (element.firstChild) {
                parent.insertBefore(element.firstChild, element);
            }
            parent.removeChild(element);
            return;
        }
        
        // Clean attributes
        if (element.nodeType === 1) {
            const attrs = Array.from(element.attributes);
            attrs.forEach(attr => {
                if (!allowedAttributes.includes(attr.name.toLowerCase())) {
                    element.removeAttribute(attr.name);
                }
            });
            
            // Clean style attribute to only keep basic formatting
            if (element.style) {
                const style = element.style;
                const allowedStyles = ['font-weight', 'font-style', 'text-decoration', 'font-size', 'font-family', 'color'];
                const newStyle = [];
                
                allowedStyles.forEach(prop => {
                    const value = style.getPropertyValue(prop);
                    if (value) {
                        newStyle.push(`${prop}: ${value}`);
                    }
                });
                
                if (newStyle.length > 0) {
                    element.setAttribute('style', newStyle.join('; '));
                } else {
                    element.removeAttribute('style');
                }
            }
        }
        
        // Recursively clean child elements
        const children = Array.from(element.childNodes);
        children.forEach(child => {
            if (child.nodeType === 1) {
                cleanElement(child);
            }
        });
    }
    
    // Clean the content
    Array.from(tempDiv.childNodes).forEach(child => {
        if (child.nodeType === 1) {
            cleanElement(child);
        }
    });
    
    return tempDiv.innerHTML;
}

// Preview functionality
let isPreviewMode = false;

function togglePreview() {
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const container = document.querySelector('.editor-container');
    const toggleBtn = document.getElementById('previewToggle');
    
    isPreviewMode = !isPreviewMode;
    
    if (isPreviewMode) {
        // Show split view
        container.classList.add('split-view');
        preview.style.display = 'block';
        toggleBtn.classList.add('active');
        toggleBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
        updatePreview();
    } else {
        // Show editor only
        container.classList.remove('split-view');
        preview.style.display = 'none';
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Preview';
    }
}

function updatePreview() {
    if (!isPreviewMode) return;
    
    const editor = document.getElementById('editor');
    const previewContent = document.getElementById('previewContent');
    const previewTitle = document.getElementById('previewTitle');
    const titleInput = document.getElementById('title');
    
    // Update preview title
    if (titleInput && titleInput.value.trim()) {
        previewTitle.textContent = titleInput.value;
    } else {
        previewTitle.textContent = 'Blog Preview';
    }
    
    // Update preview content
    if (editor && previewContent) {
        let content = editor.innerHTML;
        
        // If empty, show placeholder
        if (!content || content.trim() === '' || content === '<p><br></p>') {
            previewContent.innerHTML = '<p style="color: #999; font-style: italic;">Start typing to see your blog preview...</p>';
        } else {
            previewContent.innerHTML = content;
        }
    }
}

// Update preview when title changes
document.addEventListener('DOMContentLoaded', function() {
    const titleInput = document.getElementById('title');
    if (titleInput) {
        titleInput.addEventListener('input', updatePreview);
    }
});



// Helper function to set cursor to end of element
function setCursorToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

// Confirm deletion
function confirmDelete(blogTitle) {
    return confirm(`Are you sure you want to delete the blog "${blogTitle}"?\n\nThis action cannot be undone.`);
}

// Form validation for password change
document.addEventListener('DOMContentLoaded', function() {
    const passwordForm = document.querySelector('.password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            const newPassword = document.getElementById('new_password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            
            if (newPassword !== confirmPassword) {
                e.preventDefault();
                alert('New passwords do not match!');
                return false;
            }
            
            if (newPassword.length < 6) {
                e.preventDefault();
                alert('Password must be at least 6 characters long!');
                return false;
            }
        });
    }
});

// Auto-save functionality (optional enhancement)
let autoSaveTimer;
function setupAutoSave() {
    const editor = document.getElementById('editor');
    const titleInput = document.getElementById('title');
    
    if (editor && titleInput) {
        function saveToLocalStorage() {
            const content = {
                title: titleInput.value,
                content: editor.innerHTML,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('blog_draft', JSON.stringify(content));
        }
        
        function loadFromLocalStorage() {
            const saved = localStorage.getItem('blog_draft');
            if (saved) {
                const content = JSON.parse(saved);
                // Only load if it's from today
                const savedDate = new Date(content.timestamp);
                const today = new Date();
                if (savedDate.toDateString() === today.toDateString()) {
                    if (confirm('Found a saved draft from today. Would you like to load it?')) {
                        titleInput.value = content.title;
                        editor.innerHTML = content.content;
                    }
                }
            }
        }
        
        // Load draft on page load
        loadFromLocalStorage();
        
        // Auto-save every 30 seconds
        editor.addEventListener('input', function() {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(saveToLocalStorage, 30000);
        });
        
        titleInput.addEventListener('input', function() {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(saveToLocalStorage, 30000);
        });
        
        // Clear draft on successful submission
        const form = editor.closest('form');
        if (form) {
            form.addEventListener('submit', function() {
                localStorage.removeItem('blog_draft');
            });
        }
    }
}

// Password toggle functionality
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(inputId + '-eye');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// Enhanced delete confirmation
function confirmDelete(blogTitle) {
    return confirm(`Are you sure you want to delete the blog "${blogTitle}"?\n\nThis action cannot be undone.`);
}



// Initialize auto-save
document.addEventListener('DOMContentLoaded', setupAutoSave);

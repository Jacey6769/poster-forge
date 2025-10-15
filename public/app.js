// Canvas setup
const canvas = document.getElementById('posterCanvas');
const ctx = canvas.getContext('2d');

// Undo/Redo state
let history = [];
let historyStep = -1;
const MAX_HISTORY = 50;

// Preview state
let previewState = null;
let isPreviewMode = false;

// State
let currentPage = 1;
let currentSort = 'new';
let currentTag = '';
let likedPosters = new Set(JSON.parse(localStorage.getItem('likedPosters') || '[]'));
let adminToken = localStorage.getItem('adminToken') || '';

// Save canvas state to history (only called when "Save" is pressed)
function saveState() {
  historyStep++;
  if (historyStep < history.length) {
    history.length = historyStep;
  }
  history.push(canvas.toDataURL());
  if (history.length > MAX_HISTORY) {
    history.shift();
    historyStep--;
  }
  updateUndoRedoButtons();
  showNotification('Saved checkpoint!');
}

// Start preview mode - save current state before making changes
function startPreview() {
  if (!isPreviewMode) {
    previewState = canvas.toDataURL();
    isPreviewMode = true;
    document.getElementById('previewActions').classList.add('active');
    console.log('Preview mode started');
  }
}

// Commit preview changes to history
function commitPreview() {
  console.log('Commit preview called');
  if (isPreviewMode) {
    isPreviewMode = false;
    previewState = null;
    document.getElementById('previewActions').classList.remove('active');
    saveState();
    console.log('Preview committed');
  }
}

// Cancel preview and restore previous state
function cancelPreview() {
  console.log('Cancel preview called');
  if (isPreviewMode && previewState) {
    restoreCanvas(previewState);
    currentBgColor = document.getElementById('bgColor').value; // Update tracking
    isPreviewMode = false;
    previewState = null;
    document.getElementById('previewActions').classList.remove('active');
    console.log('Preview cancelled, restored previous state');
  }
}

// Show temporary notification
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  if (notification) {
    notification.textContent = message;
    notification.className = 'notification show ' + type;
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
}

// Custom confirm dialog
function showConfirm(message, title = 'Confirm Action') {
  return new Promise((resolve) => {
    const dialog = document.getElementById('confirmDialog');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    dialog.classList.add('active');
    
    const handleYes = () => {
      dialog.classList.remove('active');
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      resolve(true);
    };
    
    const handleNo = () => {
      dialog.classList.remove('active');
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      resolve(false);
    };
    
    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
  });
}

// Restore canvas from data URL
function restoreCanvas(dataURL) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = dataURL;
}

// Undo
function undo() {
  if (historyStep > 0) {
    historyStep--;
    restoreCanvas(history[historyStep]);
    updateUndoRedoButtons();
  }
}

// Redo
function redo() {
  if (historyStep < history.length - 1) {
    historyStep++;
    restoreCanvas(history[historyStep]);
    updateUndoRedoButtons();
  }
}

// Update undo/redo button states
function updateUndoRedoButtons() {
  document.getElementById('undoBtn').disabled = historyStep <= 0;
  document.getElementById('redoBtn').disabled = historyStep >= history.length - 1;
}

// Navigation
document.getElementById('createBtn').addEventListener('click', () => {
  switchSection('createSection');
  document.getElementById('createBtn').classList.add('active');
  document.getElementById('galleryBtn').classList.remove('active');
});

document.getElementById('galleryBtn').addEventListener('click', () => {
  switchSection('gallerySection');
  document.getElementById('galleryBtn').classList.add('active');
  document.getElementById('createBtn').classList.remove('active');
  loadGallery();
});

function switchSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');
}

// Canvas drawing functions
let currentBgColor = '#ffffff';

// Generate AI title
document.getElementById('generateTitleBtn').addEventListener('click', async () => {
  const btn = document.getElementById('generateTitleBtn');
  const titleInput = document.getElementById('posterTitle');
  
  try {
    btn.disabled = true;
    btn.textContent = '⏳ Generating...';
    
    const imageDataURL = canvas.toDataURL('image/png');
    
    const response = await fetch('/api/generate-title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageDataURL })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate title');
    }
    
    const { title } = await response.json();
    titleInput.value = title;
    showNotification(`✨ Generated title: "${title}"`, 'success');
  } catch (error) {
    console.error('Error generating title:', error);
    showNotification('Failed to generate title. Try again or enter manually.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ AI Title';
  }
});

function clearCanvas(skipSave = false) {
  const bgColor = document.getElementById('bgColor').value;
  currentBgColor = bgColor;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!skipSave && !isPreviewMode) {
    saveState();
  }
}

// Change background color preserving content
function changeBackgroundColor(color) {
  console.log('changeBackgroundColor called with:', color);
  console.log('currentBgColor:', currentBgColor);
  
  if (currentBgColor === color) {
    console.log('Color unchanged, skipping');
    return; // No change
  }
  
  // Get current canvas content as image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Get RGB of current background
  const oldBg = hexToRgb(currentBgColor);
  
  // Fill with new background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  console.log('Filled new background:', color);
  
  // Put back all non-background pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // If pixel is not the old background color (with some tolerance)
    if (a > 0 && (Math.abs(r - oldBg.r) > 5 || Math.abs(g - oldBg.g) > 5 || Math.abs(b - oldBg.b) > 5)) {
      // Keep this pixel (it's content, not background)
      const x = (i / 4) % canvas.width;
      const y = Math.floor((i / 4) / canvas.width);
      ctx.fillStyle = `rgba(${r},${g},${b},${a/255})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  
  currentBgColor = color;
  console.log('Updated currentBgColor to:', currentBgColor);
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

// Initialize canvas with white background
currentBgColor = '#ffffff';
ctx.fillStyle = currentBgColor;
ctx.fillRect(0, 0, canvas.width, canvas.height);
saveState(); // Save initial state

// Background color change - preview mode
document.getElementById('bgColor').addEventListener('input', (e) => {
  console.log('Background color input event:', e.target.value);
  startPreview();
  changeBackgroundColor(e.target.value);
});

// Save/Cancel change buttons
document.getElementById('saveChangeBtn').addEventListener('click', commitPreview);
document.getElementById('cancelChangeBtn').addEventListener('click', cancelPreview);

// Undo button
document.getElementById('undoBtn').addEventListener('click', () => {
  if (isPreviewMode) {
    cancelPreview();
  }
  undo();
});

// Redo button
document.getElementById('redoBtn').addEventListener('click', redo);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    redo();
  }
});

// Clear canvas button
document.getElementById('clearBtn').addEventListener('click', async () => {
  const confirmed = await showConfirm('Are you sure you want to clear the canvas?', 'Clear Canvas');
  if (confirmed) {
    if (isPreviewMode) {
      cancelPreview();
    }
    clearCanvas();
    // Reset background color to white
    document.getElementById('bgColor').value = '#ffffff';
  }
});

// Font size slider
document.getElementById('fontSize').addEventListener('input', (e) => {
  document.getElementById('fontSizeLabel').textContent = e.target.value + 'px';
});

// Emoji size slider
document.getElementById('emojiSize').addEventListener('input', (e) => {
  document.getElementById('emojiSizeLabel').textContent = e.target.value + 'px';
});

// Text color preview
document.getElementById('textColor').addEventListener('input', () => {
  // Just visual feedback, no canvas change
});

// Add text
document.getElementById('addTextBtn').addEventListener('click', () => {
  const text = document.getElementById('textInput').value;
  if (!text) {
    showNotification('Please enter some text', 'warning');
    return;
  }

  if (isPreviewMode) {
    commitPreview(); // Save the background color change first
  }

  const fontSize = document.getElementById('fontSize').value;
  const color = document.getElementById('textColor').value;

  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw text in center
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  document.getElementById('textInput').value = '';
  saveState();
});

// Shape color preview
document.getElementById('shapeColor').addEventListener('input', () => {
  // Just visual feedback, no canvas change
});

// Add rectangle
document.getElementById('addRectBtn').addEventListener('click', () => {
  if (isPreviewMode) {
    commitPreview(); // Save the background color change first
  }
  
  const color = document.getElementById('shapeColor').value;
  ctx.fillStyle = color;
  
  // Random position and size
  const width = 100 + Math.random() * 200;
  const height = 80 + Math.random() * 150;
  const x = Math.random() * (canvas.width - width);
  const y = Math.random() * (canvas.height - height);
  
  ctx.fillRect(x, y, width, height);
  saveState();
});

// Add circle
document.getElementById('addCircleBtn').addEventListener('click', () => {
  if (isPreviewMode) {
    commitPreview(); // Save the background color change first
  }
  
  const color = document.getElementById('shapeColor').value;
  ctx.fillStyle = color;
  
  // Random position and size
  const radius = 40 + Math.random() * 100;
  const x = radius + Math.random() * (canvas.width - 2 * radius);
  const y = radius + Math.random() * (canvas.height - 2 * radius);
  
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
  saveState();
});

// Add emoji
document.getElementById('addEmojiBtn').addEventListener('click', () => {
  const emoji = document.getElementById('emojiInput').value;
  if (!emoji) {
    showNotification('Please enter an emoji', 'warning');
    return;
  }

  if (isPreviewMode) {
    commitPreview(); // Save the background color change first
  }

  const size = document.getElementById('emojiSize').value;
  ctx.font = `${size}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Random position
  const x = Math.random() * canvas.width;
  const y = Math.random() * canvas.height;
  
  ctx.fillText(emoji, x, y);
  
  document.getElementById('emojiInput').value = '';
  saveState();
});

// Click to add text at position
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const text = document.getElementById('textInput').value;
  if (text) {
    if (isPreviewMode) {
      commitPreview(); // Save the background color change first
    }
    
    const fontSize = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    
    document.getElementById('textInput').value = '';
    saveState();
  }
});

// Touch support for mobile devices
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  
  const text = document.getElementById('textInput').value;
  if (text) {
    if (isPreviewMode) {
      commitPreview();
    }
    
    const fontSize = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    
    document.getElementById('textInput').value = '';
    saveState();
  }
}, { passive: false });


// Publish poster
document.getElementById('publishBtn').addEventListener('click', async () => {
  const title = document.getElementById('posterTitle').value.trim();
  if (!title) {
    showNotification('Please enter a poster title', 'warning');
    return;
  }

  const tagsInput = document.getElementById('posterTags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

  const imageDataURL = canvas.toDataURL('image/png');
  
  // Save poster data for re-editing
  const posterData = {
    canvasState: imageDataURL,
    bgColor: document.getElementById('bgColor').value,
    timestamp: Date.now()
  };

  try {
    showNotification('Publishing poster...', 'info');
    
    const response = await fetch('/api/posters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        tags,
        imageDataURL,
        posterData
      })
    });

    if (!response.ok) {
      throw new Error('Failed to publish poster');
    }

    const result = await response.json();
    showNotification('🎉 Poster published successfully!', 'success');
    
    // Clear form
    document.getElementById('posterTitle').value = '';
    document.getElementById('posterTags').value = '';
    clearCanvas();
    
    // Switch to gallery after 1 second
    setTimeout(() => {
      document.getElementById('galleryBtn').click();
    }, 1000);
  } catch (error) {
    console.error('Error publishing poster:', error);
    showNotification('Failed to publish poster. Please try again.', 'error');
  }
});

// Export poster as JSON
document.getElementById('exportBtn').addEventListener('click', () => {
  const posterData = {
    title: document.getElementById('posterTitle').value || 'Untitled',
    tags: document.getElementById('posterTags').value,
    canvasImage: canvas.toDataURL('image/png'),
    bgColor: document.getElementById('bgColor').value,
    timestamp: Date.now(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(posterData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `poster-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Poster exported successfully!', 'success');
});

// Import poster from JSON
document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (isPreviewMode) {
    cancelPreview();
  }
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const posterData = JSON.parse(event.target.result);
      
      // Restore canvas
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        saveState();
      };
      img.src = posterData.canvasImage;
      
      // Restore form data
      document.getElementById('posterTitle').value = posterData.title || '';
      document.getElementById('posterTags').value = posterData.tags || '';
      document.getElementById('bgColor').value = posterData.bgColor || '#ffffff';
      
      showNotification('Poster imported successfully!', 'success');
    } catch (error) {
      console.error('Error importing poster:', error);
      showNotification('Failed to import poster. Invalid file format.', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// Import image file (PNG/JPG) onto canvas
document.getElementById('importImageBtn').addEventListener('click', () => {
  document.getElementById('imageFileInput').click();
});

document.getElementById('imageFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.type.match('image/(png|jpeg|jpg)')) {
    showNotification('Please select a PNG or JPG image file.', 'error');
    return;
  }
  
  if (isPreviewMode) {
    cancelPreview();
  }
  
  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      // Clear canvas first
      ctx.fillStyle = currentBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate scaling to fit canvas while maintaining aspect ratio
      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      );
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // Center the image
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;
      
      // Draw image
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      // Save state
      saveState();
      
      showNotification('Image imported successfully! You can now add text or shapes.', 'success');
    };
    
    img.onerror = () => {
      showNotification('Failed to load image file.', 'error');
    };
    
    img.src = event.target.result;
  };
  
  reader.readAsDataURL(file);
  e.target.value = ''; // Reset file input
});

// Gallery functions
async function loadGallery(page = 1) {
  currentPage = page;
  
  try {
    const params = new URLSearchParams({
      sort: currentSort,
      page: currentPage,
      limit: 12
    });

    if (currentTag) {
      params.append('tag', currentTag);
    }

    const response = await fetch(`/api/posters?${params}`);
    if (!response.ok) {
      throw new Error('Failed to load gallery');
    }

    const data = await response.json();
    displayGallery(data);
    updatePagination(data);
  } catch (error) {
    console.error('Error loading gallery:', error);
    document.getElementById('galleryGrid').innerHTML = '<p>Failed to load posters</p>';
  }
}

function displayGallery(data) {
  const grid = document.getElementById('galleryGrid');
  
  if (data.posters.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: white; font-size: 1.2rem;">No posters found. Be the first to create one! 🎨</p>';
    return;
  }

  grid.innerHTML = data.posters.map(poster => `
    <div class="poster-card animate-in" data-id="${poster.id}">
      <img src="${poster.imagePath}" alt="${poster.title}">
      <div class="poster-info">
        <h3>${escapeHtml(poster.title)}</h3>
        <div class="poster-tags">
          ${poster.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        ${poster.palette && poster.palette.length ? `
          <div class="color-palette">
            ${poster.palette.slice(0, 5).map(color => `<span class="color-swatch" style="background-color: ${color}" title="${color}"></span>`).join('')}
          </div>
        ` : ''}
        <div class="poster-meta">
          <span>${formatDate(poster.createdAt)}</span>
          <div class="poster-actions">
            <button class="like-btn ${likedPosters.has(poster.id) ? 'liked' : ''}" data-id="${poster.id}">
              ❤️ ${poster.likes}
            </button>
            ${adminToken ? `<button class="delete-btn" data-id="${poster.id}" title="Delete">🗑️</button>` : ''}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Add click handlers
  document.querySelectorAll('.poster-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.classList.contains('like-btn')) {
        const posterId = card.dataset.id;
        const poster = data.posters.find(p => p.id == posterId);
        showPosterModal(poster);
      }
    });
  });

  // Add like handlers
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const posterId = parseInt(btn.dataset.id);
      await likePoster(posterId, btn);
    });
  });

  // Add delete handlers (admin only)
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const posterId = parseInt(btn.dataset.id);
      await deletePoster(posterId);
    });
  });
}

async function likePoster(posterId, btn) {
  const isCurrentlyLiked = likedPosters.has(posterId);
  
  try {
    if (isCurrentlyLiked) {
      // Unlike
      const response = await fetch(`/api/posters/${posterId}/like`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      
      // Update UI
      btn.textContent = `❤️ ${result.likes}`;
      btn.classList.remove('liked');
      
      // Remove from localStorage
      likedPosters.delete(posterId);
      localStorage.setItem('likedPosters', JSON.stringify([...likedPosters]));
      
      showNotification('Unliked', 'info');
    } else {
      // Like
      const response = await fetch(`/api/posters/${posterId}/like`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      
      // Update UI
      btn.textContent = `❤️ ${result.likes}`;
      btn.classList.add('liked');
      
      // Save to localStorage
      likedPosters.add(posterId);
      localStorage.setItem('likedPosters', JSON.stringify([...likedPosters]));
      
      showNotification('Liked! ❤️', 'success');
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    showNotification(error.message || 'Failed to update like', 'error');
  }
}

function showPosterModal(poster) {
  const modal = document.getElementById('posterModal');
  const modalBody = document.getElementById('modalBody');
  
  modalBody.innerHTML = `
    <img src="${poster.imagePath}" alt="${poster.title}">
    <div class="modal-info">
      <h2>${escapeHtml(poster.title)}</h2>
      <div class="poster-tags">
        ${poster.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <p><strong>Created:</strong> ${formatDate(poster.createdAt)}</p>
      <p><strong>Likes:</strong> ❤️ ${poster.likes}</p>
    </div>
  `;
  
  modal.classList.add('active');
}

// Close modal
document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('posterModal').classList.remove('active');
});

window.addEventListener('click', (e) => {
  const modal = document.getElementById('posterModal');
  if (e.target === modal) {
    modal.classList.remove('active');
  }
});

function updatePagination(data) {
  document.getElementById('pageInfo').textContent = `Page ${data.page} of ${data.totalPages}`;
  document.getElementById('prevPage').disabled = data.page === 1;
  document.getElementById('nextPage').disabled = data.page >= data.totalPages;
}

// Pagination
document.getElementById('prevPage').addEventListener('click', () => {
  loadGallery(currentPage - 1);
});

document.getElementById('nextPage').addEventListener('click', () => {
  loadGallery(currentPage + 1);
});

// Sort
document.getElementById('sortSelect').addEventListener('change', (e) => {
  currentSort = e.target.value;
  loadGallery(1);
});

// Filter
document.getElementById('filterBtn').addEventListener('click', () => {
  currentTag = document.getElementById('tagFilter').value.trim();
  loadGallery(1);
});

document.getElementById('clearFilterBtn').addEventListener('click', () => {
  currentTag = '';
  document.getElementById('tagFilter').value = '';
  loadGallery(1);
});

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

// Admin functions
document.getElementById('adminLoginBtn')?.addEventListener('click', async () => {
  const token = prompt('Enter admin token:');
  if (!token) return;
  
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    if (response.ok) {
      adminToken = token;
      localStorage.setItem('adminToken', token);
      showNotification('✅ Admin logged in successfully!', 'success');
      loadGallery(currentPage); // Reload to show delete buttons
    } else {
      showNotification('❌ Invalid admin token', 'error');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    showNotification('Failed to login', 'error');
  }
});

document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
  adminToken = '';
  localStorage.removeItem('adminToken');
  showNotification('Logged out', 'info');
  loadGallery(currentPage);
});

async function deletePoster(posterId) {
  const confirmed = await showConfirm('Are you sure you want to delete this poster? This action cannot be undone.', 'Delete Poster');
  if (!confirmed) return;
  
  try {
    const response = await fetch(`/api/posters/${posterId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminToken })
    });
    
    if (response.ok) {
      showNotification('Poster deleted successfully!', 'success');
      loadGallery(currentPage);
    } else {
      const error = await response.json();
      showNotification('Failed to delete: ' + error.error, 'error');
    }
  } catch (error) {
    console.error('Error deleting poster:', error);
    showNotification('Failed to delete poster', 'error');
  }
}

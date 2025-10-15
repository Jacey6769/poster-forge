const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const sharp = require('sharp');
const OpenAI = require('openai');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI (only if API key is provided)
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here'
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (!openai) {
  console.log('⚠️  OpenAI API key not configured. AI title generation will be disabled.');
  console.log('   Add OPENAI_API_KEY to your .env file to enable this feature.');
} else {
  console.log('✅ OpenAI API configured for AI title generation');
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Initialize database
const db = new Database('posters.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS posters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    tagsJson TEXT,
    imagePath TEXT NOT NULL,
    paletteJson TEXT,
    posterDataJson TEXT,
    likes INTEGER DEFAULT 0,
    createdAt INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS likes (
    posterId INTEGER,
    ipAddress TEXT,
    createdAt INTEGER,
    PRIMARY KEY (posterId, ipAddress),
    FOREIGN KEY (posterId) REFERENCES posters(id) ON DELETE CASCADE
  )
`);

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Helper function to get client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
}

// API Routes

// Helper function to extract color palette from base64 image
async function extractPalette(base64Data) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Resize and convert to raw RGB (no alpha to avoid transparency issues)
    const { data } = await sharp(buffer)
      .resize(100, 100, { fit: 'inside' })
      .removeAlpha() // Remove alpha channel entirely - flatten to RGB
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Sample colors from the resized image
    const colorMap = new Map();
    const channels = 3; // RGB only after removeAlpha
    
    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Group similar colors by rounding to nearest 16 (not too aggressive)
      const roundedR = Math.min(255, Math.round(r / 16) * 16);
      const roundedG = Math.min(255, Math.round(g / 16) * 16);
      const roundedB = Math.min(255, Math.round(b / 16) * 16);
      
      const hexR = roundedR.toString(16).padStart(2, '0');
      const hexG = roundedG.toString(16).padStart(2, '0');
      const hexB = roundedB.toString(16).padStart(2, '0');
      const color = `#${hexR}${hexG}${hexB}`;
      
      colorMap.set(color, (colorMap.get(color) || 0) + 1);
    }
    
    // Sort colors by frequency
    const allColors = [...colorMap.entries()]
      .sort((a, b) => b[1] - a[1]);
    
    console.log('Top 15 colors:', allColors.slice(0, 15).map(([c, cnt]) => `${c}(${cnt})`));
    
    // Select diverse colors: pick most frequent, then add most distinct colors
    const selectedColors = [];
    
    if (allColors.length > 0) {
      // Always include the most frequent color (usually background)
      selectedColors.push(allColors[0][0]);
      console.log('Added dominant color:', allColors[0][0]);
      
      // Add remaining colors based on distinctness from already selected
      for (let i = 1; i < allColors.length; i++) {
        if (selectedColors.length >= 5) break;
        
        const [color, count] = allColors[i];
        
        // Calculate color distance from already selected colors
        const rgb = hexToRgb(color);
        let minDistance = Infinity;
        
        for (const selectedColor of selectedColors) {
          const selectedRgb = hexToRgb(selectedColor);
          const distance = Math.sqrt(
            Math.pow(rgb.r - selectedRgb.r, 2) +
            Math.pow(rgb.g - selectedRgb.g, 2) +
            Math.pow(rgb.b - selectedRgb.b, 2)
          );
          minDistance = Math.min(minDistance, distance);
        }
        
        // Add if sufficiently different (distance > 60 for better diversity)
        if (minDistance > 60) {
          selectedColors.push(color);
          console.log(`Added color ${color} (distance: ${minDistance.toFixed(0)}, rank: ${i+1})`);
        }
      }
    }
    
    console.log('Final palette:', selectedColors);
    
    return selectedColors.length > 0 ? selectedColors : ['#ff0000'];
  } catch (error) {
    console.error('Palette extraction error:', error);
    return ['#ff0000'];
  }
}

// Helper to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// AI-powered title generation
async function generateAITitle(imageDataURL) {
  if (!openai) {
    // Fallback to color-based title
    return generateColorBasedTitle(imageDataURL);
  }

  try {
    console.log('🤖 Generating AI title...');
    console.log('Image data URL length:', imageDataURL.length, 'characters');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and generate a short, descriptive title (2-4 words). Focus on what you actually see in the image - describe the main subject, colors, objects, text, or visual elements. Be concrete and specific, not abstract. For example: 'Golden Payment Logo' instead of 'Vibrant Design', or 'Red Sunset Ocean' instead of 'Beautiful Canvas'. Just return the title, nothing else."
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataURL
              }
            }
          ]
        }
      ],
      max_tokens: 20
    });

    const title = response.choices[0].message.content.trim().replace(/['"]/g, '');
    console.log('✅ AI generated title:', title);
    return title;
  } catch (error) {
    console.error('❌ AI title generation error:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('API response status:', error.response.status);
      console.error('API response data:', error.response.data);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    // Smart fallback based on error type
    if (error.code === 'insufficient_quota') {
      console.log('💡 Using color-based title generation (OpenAI quota exceeded)');
    }
    
    // Generate a color-based descriptive title
    return generateColorBasedTitle(imageDataURL);
  }
}

// Generate title based on image colors
async function generateColorBasedTitle(imageDataURL) {
  try {
    // Extract palette from the image
    const base64Data = imageDataURL.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const palette = await extractPalette(base64Data);
    
    // Analyze dominant color
    const dominantColor = palette[0];
    const rgb = hexToRgb(dominantColor);
    const { r, g, b } = rgb;
    
    // Calculate hue, saturation, lightness
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2 / 255;
    const s = max === min ? 0 : (max - min) / (255 - Math.abs(2 * l * 255 - 255));
    
    let h = 0;
    if (max !== min) {
      if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / (max - min) + 2) / 6;
      else h = ((r - g) / (max - min) + 4) / 6;
    }
    h *= 360;
    
    // Determine color name and characteristics
    let colorName = '';
    let mood = '';
    
    // Lightness-based moods
    if (l < 0.2) {
      mood = ['Dark', 'Mysterious', 'Deep', 'Shadow'][Math.floor(Math.random() * 4)];
    } else if (l > 0.8) {
      mood = ['Bright', 'Light', 'Pale', 'Soft'][Math.floor(Math.random() * 4)];
    } else if (s > 0.6) {
      mood = ['Vibrant', 'Bold', 'Rich', 'Vivid'][Math.floor(Math.random() * 4)];
    } else {
      mood = ['Muted', 'Subtle', 'Gentle', 'Calm'][Math.floor(Math.random() * 4)];
    }
    
    // Hue-based color names
    if (s < 0.1) {
      colorName = l > 0.5 ? 'Gray' : 'Charcoal';
    } else if (h < 15 || h >= 345) {
      colorName = 'Red';
    } else if (h < 45) {
      colorName = 'Orange';
    } else if (h < 70) {
      colorName = 'Golden';
    } else if (h < 150) {
      colorName = 'Green';
    } else if (h < 200) {
      colorName = palette.length > 1 ? 'Aqua' : 'Cyan';
    } else if (h < 260) {
      colorName = 'Blue';
    } else if (h < 290) {
      colorName = 'Purple';
    } else {
      colorName = 'Pink';
    }
    
    // Check for multi-color compositions
    const nouns = palette.length > 2 
      ? ['Spectrum', 'Palette', 'Mix', 'Fusion', 'Blend']
      : ['Poster', 'Design', 'Art', 'Visual', 'Canvas'];
    
    // Generate title patterns
    const patterns = [
      `${mood} ${colorName}`,
      `${colorName} ${nouns[Math.floor(Math.random() * nouns.length)]}`,
      palette.length > 2 ? `${colorName} ${nouns[0]}` : `${mood} ${nouns[Math.floor(Math.random() * nouns.length)]}`
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
  } catch (error) {
    console.error('Color analysis error:', error.message);
    // Final fallback
    const adjectives = ['Creative', 'Modern', 'Artistic', 'Bold'];
    const nouns = ['Design', 'Poster', 'Visual', 'Canvas'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  }
}

// POST /api/generate-title - Generate AI title for image
app.post('/api/generate-title', async (req, res) => {
  try {
    const { imageDataURL } = req.body;

    if (!imageDataURL) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const title = await generateAITitle(imageDataURL);
    res.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    res.status(500).json({ error: 'Failed to generate title' });
  }
});

// POST /api/posters - Create a new poster

// POST /api/posters - Create a new poster
app.post('/api/posters', async (req, res) => {
  try {
    let { title, tags, imageDataURL, posterData } = req.body;

    if (!imageDataURL) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Auto-generate title if empty
    if (!title || title.trim() === '') {
      console.log('No title provided, generating AI title...');
      title = await generateAITitle(imageDataURL);
      console.log('Generated title:', title);
    }

    // Validate data URL
    if (!imageDataURL.startsWith('data:image/png;base64,')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const createdAt = Date.now();
    const base64Data = imageDataURL.replace(/^data:image\/png;base64,/, '');
    
    // Extract color palette (now async)
    const palette = await extractPalette(base64Data);
    
    // Insert poster into database first to get ID
    const stmt = db.prepare(`
      INSERT INTO posters (title, tagsJson, imagePath, paletteJson, posterDataJson, likes, createdAt)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);
    
    const result = stmt.run(
      title,
      JSON.stringify(tags || []),
      '', // Will update after saving file
      JSON.stringify(palette),
      JSON.stringify(posterData || null),
      createdAt
    );

    const posterId = result.lastInsertRowid;

    // Save image to file
    const imagePath = `uploads/${posterId}.png`;
    fs.writeFileSync(imagePath, base64Data, 'base64');

    // Update poster with image path
    const updateStmt = db.prepare('UPDATE posters SET imagePath = ? WHERE id = ?');
    updateStmt.run(imagePath, posterId);

    res.json({ 
      id: posterId,
      title,
      tags: tags || [],
      imagePath,
      palette,
      likes: 0,
      createdAt
    });
  } catch (error) {
    console.error('Error creating poster:', error);
    res.status(500).json({ error: 'Failed to create poster' });
  }
});

// GET /api/posters - Get all posters with optional filters
app.get('/api/posters', (req, res) => {
  try {
    const { sort = 'new', tag, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT * FROM posters';
    let params = [];

    // Filter by tag
    if (tag) {
      query += ' WHERE tagsJson LIKE ?';
      params.push(`%"${tag}"%`);
    }

    // Sort
    if (sort === 'likes') {
      query += ' ORDER BY likes DESC, createdAt DESC';
    } else {
      query += ' ORDER BY createdAt DESC';
    }

    // Pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const stmt = db.prepare(query);
    const posters = stmt.all(...params);

    // Parse tags JSON and palette
    const postersWithTags = posters.map(poster => ({
      ...poster,
      tags: JSON.parse(poster.tagsJson || '[]'),
      palette: JSON.parse(poster.paletteJson || '[]')
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM posters';
    let countParams = [];
    if (tag) {
      countQuery += ' WHERE tagsJson LIKE ?';
      countParams.push(`%"${tag}"%`);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      posters: postersWithTags,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching posters:', error);
    res.status(500).json({ error: 'Failed to fetch posters' });
  }
});

// POST /api/posters/:id/like - Like a poster
app.post('/api/posters/:id/like', (req, res) => {
  try {
    const posterId = parseInt(req.params.id);
    const ipAddress = getClientIp(req);

    // Check if already liked
    const checkStmt = db.prepare('SELECT 1 FROM likes WHERE posterId = ? AND ipAddress = ?');
    const alreadyLiked = checkStmt.get(posterId, ipAddress);

    if (alreadyLiked) {
      return res.status(400).json({ error: 'Already liked this poster' });
    }

    // Add like
    const insertStmt = db.prepare(`
      INSERT INTO likes (posterId, ipAddress, createdAt)
      VALUES (?, ?, ?)
    `);
    insertStmt.run(posterId, ipAddress, Date.now());

    // Increment like count
    const updateStmt = db.prepare('UPDATE posters SET likes = likes + 1 WHERE id = ?');
    updateStmt.run(posterId);

    // Get updated poster
    const poster = db.prepare('SELECT * FROM posters WHERE id = ?').get(posterId);

    res.json({ 
      likes: poster.likes,
      message: 'Liked successfully' 
    });
  } catch (error) {
    console.error('Error liking poster:', error);
    res.status(500).json({ error: 'Failed to like poster' });
  }
});

// DELETE /api/posters/:id/like - Unlike a poster
app.delete('/api/posters/:id/like', (req, res) => {
  try {
    const posterId = parseInt(req.params.id);
    const ipAddress = getClientIp(req);

    // Check if liked
    const checkStmt = db.prepare('SELECT 1 FROM likes WHERE posterId = ? AND ipAddress = ?');
    const isLiked = checkStmt.get(posterId, ipAddress);

    if (!isLiked) {
      return res.status(400).json({ error: 'You have not liked this poster' });
    }

    // Remove like
    const deleteStmt = db.prepare('DELETE FROM likes WHERE posterId = ? AND ipAddress = ?');
    deleteStmt.run(posterId, ipAddress);

    // Decrement like count
    const updateStmt = db.prepare('UPDATE posters SET likes = likes - 1 WHERE id = ?');
    updateStmt.run(posterId);

    // Get updated poster
    const poster = db.prepare('SELECT * FROM posters WHERE id = ?').get(posterId);

    res.json({ 
      likes: poster.likes,
      message: 'Unliked successfully' 
    });
  } catch (error) {
    console.error('Error unliking poster:', error);
    res.status(500).json({ error: 'Failed to unlike poster' });
  }
});

// GET /api/posters/:id/data - Get poster data for re-editing
app.get('/api/posters/:id/data', (req, res) => {
  try {
    const posterId = parseInt(req.params.id);
    const poster = db.prepare('SELECT * FROM posters WHERE id = ?').get(posterId);

    if (!poster) {
      return res.status(404).json({ error: 'Poster not found' });
    }

    res.json({
      id: poster.id,
      title: poster.title,
      tags: JSON.parse(poster.tagsJson || '[]'),
      posterData: JSON.parse(poster.posterDataJson || 'null'),
      palette: JSON.parse(poster.paletteJson || '[]')
    });
  } catch (error) {
    console.error('Error fetching poster data:', error);
    res.status(500).json({ error: 'Failed to fetch poster data' });
  }
});

// POST /api/admin/login - Verify admin token
app.post('/api/admin/login', (req, res) => {
  try {
    const { token } = req.body;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';

    if (token === ADMIN_TOKEN) {
      res.json({ success: true, message: 'Admin authenticated' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid admin token' });
    }
  } catch (error) {
    console.error('Error in admin login:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posters/:id - Delete a poster (admin only)
app.delete('/api/posters/:id', (req, res) => {
  try {
    const { adminToken } = req.body;
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';

    if (adminToken !== ADMIN_TOKEN) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const posterId = parseInt(req.params.id);
    const poster = db.prepare('SELECT * FROM posters WHERE id = ?').get(posterId);

    if (!poster) {
      return res.status(404).json({ error: 'Poster not found' });
    }

    // Delete image file
    if (fs.existsSync(poster.imagePath)) {
      fs.unlinkSync(poster.imagePath);
    }

    // Delete from database
    db.prepare('DELETE FROM posters WHERE id = ?').run(posterId);
    db.prepare('DELETE FROM likes WHERE posterId = ?').run(posterId);

    res.json({ message: 'Poster deleted successfully' });
  } catch (error) {
    console.error('Error deleting poster:', error);
    res.status(500).json({ error: 'Failed to delete poster' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🎨 Poster Forge running on http://localhost:${PORT}`);
});

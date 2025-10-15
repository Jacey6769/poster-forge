# 🎨 Poster Forge

A tiny web app where you design posters (shapes, text, stickers, colors) on a canvas and publish them to a public gallery. Visitors can like posters and filter/sort the gallery.

## Features

### Create Poster
- Canvas editor with drawing tools
- Add text with custom colors and font sizes
- Add shapes (rectangles and circles)
- Add emojis/stickers
- Custom background colors
- Click to place text at specific positions
- **Undo/Redo** support (Ctrl+Z / Ctrl+Y)
- **Export poster as JSON** for re-editing later
- **Import JSON** to continue editing

### Gallery
- Browse all published posters
- Sort by newest or most liked
- Filter by tags
- **Like/Unlike posters** (toggle with one click, tracked per IP)
- **Color palette** extraction displayed for each poster
- Pagination support
- View full poster details in modal
- **Smooth animations** on card hover and entrance
- **Admin controls** to delete posters (with login)

## Tech Stack

- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: Vanilla HTML/CSS/JS with Canvas API
- **Storage**: SQLite database + file system for images

## Installation

1. Install dependencies:
```bash
npm install
```

2. (Optional) Create a `.env` file for admin token:
```bash
cp .env.example .env
# Edit .env and set your own ADMIN_TOKEN
```

3. Run in development mode:
```bash
npm run dev
```

4. Or run in production:
```bash
npm start
```

5. Open your browser to `http://localhost:3000`

## Project Structure

```
poster-forge/
├── server.js           # Express server & API routes
├── package.json        # Dependencies
├── posters.db          # SQLite database (auto-created)
├── uploads/            # Poster images (auto-created)
├── public/
│   ├── index.html      # Main HTML
│   ├── styles.css      # Styles
│   └── app.js          # Frontend JavaScript
└── README.md
```

## API Endpoints

- `POST /api/posters` - Create a new poster
- `GET /api/posters?sort=likes|new&tag=...` - List posters with filters
- `GET /api/posters/:id/data` - Get poster data for re-editing
- `POST /api/posters/:id/like` - Like a poster (IP-based)
- `DELETE /api/posters/:id/like` - Unlike a poster (IP-based)
- `POST /api/admin/login` - Verify admin token
- `DELETE /api/posters/:id` - Delete poster (admin only)

## Admin Features

### Login
Click "Admin Login" in the header and enter your admin token (default: `admin123`).

### Delete Posters
Once logged in as admin, you'll see a delete button (🗑️) on each poster in the gallery.

### Set Custom Admin Token
Create a `.env` file in the project root:
```env
ADMIN_TOKEN=your-secure-token-here
```

Or set it when running:
```bash
ADMIN_TOKEN=my-secret-token npm run dev
```

## New Features

### Undo/Redo
- Click the Undo/Redo buttons or use keyboard shortcuts:
  - **Ctrl+Z** - Undo last action
  - **Ctrl+Y** or **Ctrl+Shift+Z** - Redo

### Export/Import
- **Export**: Save your poster as JSON file to continue editing later
- **Import**: Load a previously exported JSON file to resume editing
- The JSON includes canvas state, colors, title, and tags

### Color Palette
- Automatically extracts dominant colors from each poster
- Displayed as color swatches in the gallery
- Hover over swatches to see hex color codes

## License

MIT

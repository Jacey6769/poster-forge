# AI Title Generation Setup Guide

## Overview
Your Poster Forge app now includes AI-powered title generation using OpenAI's GPT-4 Vision API. When users don't provide a title, the AI will analyze the image and generate a creative, descriptive title automatically.

## Setup Steps

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Click "Create new secret key"
4. Copy your API key (starts with `sk-...`)

### 2. Add API Key to Project

1. Create a `.env` file in your project root:
   ```bash
   copy .env.example .env
   ```

2. Open `.env` and add your API key:
   ```env
   ADMIN_TOKEN=admin123
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. Save the file

### 3. Restart Server

```bash
npm run dev
```

You should see:
```
✅ OpenAI API configured for AI title generation
🎨 Poster Forge running on http://localhost:3000
```

## Features

### Automatic Title Generation
- **When publishing**: If the title field is empty, AI will automatically generate one
- **Manual generation**: Click the "✨ AI Title" button to generate a title anytime
- **Fallback**: If OpenAI is not configured, it generates simple random titles like "Vibrant Design"

### How It Works

1. **Image Analysis**: Sends the canvas image to GPT-4 Vision
2. **AI Processing**: AI analyzes colors, composition, text, and visual elements
3. **Title Generation**: Returns a short, creative title (2-4 words)
4. **Display**: Title appears in the input field

### Example Titles

For different images, the AI might generate:
- "Golden Crypto Payment" (for BNB Pay logo)
- "Vibrant Abstract Art" (for colorful posters)
- "Minimalist Typography" (for text-heavy designs)
- "Nature's Green Canvas" (for nature images)

## Cost Information

OpenAI API pricing (as of 2024):
- **GPT-4o-mini**: ~$0.00015 per image analysis
- Very affordable for small projects
- First $5 credit is free for new accounts

## Troubleshooting

### "OpenAI API key not configured" message
- Make sure `.env` file exists in project root
- Check that `OPENAI_API_KEY` is set correctly
- Restart the server after adding the key

### "Failed to generate title" error
- Check your API key is valid
- Ensure you have credits in your OpenAI account
- Check internet connection

### Rate limits
- Free tier: 60 requests/minute
- If hitting limits, add delay between requests

## Without OpenAI (Free Mode)

If you don't want to use OpenAI, the app still works:
- Auto-generates simple titles like "Creative Poster"
- Random combinations of adjectives and nouns
- No AI analysis, but fully functional

## Privacy & Security

- ✅ API key stored securely in `.env` (not committed to git)
- ✅ Images sent directly to OpenAI (encrypted HTTPS)
- ✅ No data stored by OpenAI (as per their API policy)
- ✅ `.env` file is in `.gitignore` (safe from version control)

## Next Steps

1. Get your OpenAI API key
2. Add it to `.env` file
3. Restart server
4. Try creating a poster without a title
5. Watch the AI magic happen! ✨

Enjoy your AI-powered poster creation! 🎨

# SecondBrain Chrome Extension

A Chrome extension designed to ingest web content into your SecondBrain knowledge management system.

## Features

- Record any URL (blog/video)
- Scrape the title and content of the page
- Ingest web content into your knowledge base
- Secure, encrypted storage for sensitive data
- Progress tracking during ingestion
- Smart error handling and recovery

## Recent Optimizations

The extension has undergone significant improvements:

### Enhanced Content Scraping
- **Robust Content Extraction**: Enhanced page content extraction with multiple fallback methods
- **Progressive Enhancement**: Tries specialized extractors before falling back to generic methods
- **Error Resilience**: Better error handling during content extraction to prevent failures
- **Consistent Response Format**: Standardized response format for reliable communication between components
- **Empty Content Detection**: Automatically tries alternative extraction methods if initial content is empty

### Better State Management
- **Improved Storage**: Better handling of user preferences and data
- **Enhanced Logging**: More detailed logging for debugging
- **Progress Tracking**: Improved progress feedback during ingestion

### Security Enhancements
- **Enhanced Data Security**: Better encryption and storage of sensitive data
- **Secure Connection Handling**: Improved connection validation

## Installation

### From Source

1. Clone or download this repository
2. **Create the icon files**: Before loading the extension, make sure to create icon files in the `icons` directory:
   - Create `icon16.png` (16x16 pixels)
   - Create `icon48.png` (48x48 pixels)
   - Create `icon128.png` (128x128 pixels)
   - You can use tools like Canva, favicon.cc, or Flaticon to create these icons
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select this extension directory
6. The extension should now be installed and visible in your toolbar

## Setup

### Server Configuration

1. Set up your SecondBrain server using the instructions in the main SecondBrain repository
2. Make sure your server is running and accessible from your browser
3. Click the extension icon and go to Settings
4. Enter your SecondBrain server URL (default: http://localhost:8000)
5. Toggle encryption if desired for enhanced security
6. Save settings

## Usage

1. Navigate to any webpage you want to ingest
2. Click the extension icon in your toolbar
3. Click "Ingest Knowledge"
4. Watch the progress bar as content is extracted and processed
5. The ingestion status will appear in the extension popup

## Security Features

- **Data Encryption**: All sensitive data is encrypted before storage using the Web Crypto API
- **Local Storage Only**: Your data is stored only in your browser's secure storage
- **Optional Encryption**: You can toggle encryption on/off in settings (enabled by default)

## Git Security Considerations

If you're planning to push this code to a Git repository:

1. **Check Before Committing**: Always review your changes before committing to ensure no secrets are included
2. **Consider Adding .gitignore**: Add any development-specific files to .gitignore

## Troubleshooting

If the extension doesn't work properly, check the following:

1. **Icons are missing**: Make sure you've created the icon files in the `icons` directory
2. **Server connection issues**: Verify your SecondBrain server URL in the settings
3. **Content scraping issues**: 
   - Some websites use complex layouts or dynamic content that can be difficult to scrape
   - For sites with content loading issues, try waiting for the page to fully load before ingesting
   - If you're getting "Failed to scrape content" errors, try reloading the page and trying again
   - Some sites block content extraction; in these cases, you may need to try a different approach
   - Check the DevTools console (right-click extension popup → Inspect → Console) for specific error messages
4. **Message handling errors**: If you see progress stuck at 0%, try reloading the extension or browser

## Project Structure

```
secondbrain/
├── manifest.json         # Extension configuration
├── README.md             # This file
├── background/           # Background service worker
│   └── background.js     # Handles ingestion logic
├── content/              # Content scripts
│   └── content.js        # Scrapes webpage content
├── popup/                # Extension popup UI
│   ├── popup.html        # Popup HTML structure
│   ├── popup.css         # Popup styling
│   └── popup.js          # Popup interaction logic
├── settings/             # Settings page
│   ├── settings.html     # Settings UI
│   ├── settings.css      # Settings styling
│   └── settings.js       # Settings logic with encryption
└── icons/                # Extension icons
    ├── icon16.png        # 16x16 icon
    ├── icon48.png        # 48x48 icon
    └── icon128.png       # 128x128 icon
```

## Limitations

- Long pages may be truncated due to browser limitations
- Some pages with complex layouts may not be scraped correctly
- Some sites may block content extraction through technical measures

## Tools Used

- Chrome Extension APIs
- Web Crypto API for secure encryption
- SecondBrain API for knowledge ingestion

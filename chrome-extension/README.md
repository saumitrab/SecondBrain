# SecondBrain Chrome Extension

This Chrome extension extracts visible content from webpages, including text, images (with alt text for OCR), and video elements for transcription. The extracted data is sent to a FastAPI server for embedding and storage.

## Features

- Extract visible text content from webpages
- Capture images with alt text and metadata for OCR
- Identify video elements for speech-to-text processing
- Send extracted content to the FastAPI server
- Simple UI with extraction status and results

## Installation

### Development Mode

1. Clone the repository and navigate to this directory
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `chrome-extension` directory
5. The extension should now be installed and visible in your extensions list

### Building for Distribution

1. Zip the contents of this directory
2. Upload to the Chrome Web Store (requires developer account)

## Usage

1. Navigate to any webpage you want to extract information from
2. Click on the SecondBrain extension icon to open the popup
3. Press the "Extract Content" button to process the current page
4. View the extraction status and summary of extracted content
5. The data is automatically sent to your local FastAPI server

## Keyboard Shortcuts

The default keyboard shortcut for extraction is `Ctrl+Shift+E` (or `Cmd+Shift+E` on Mac).

To customize shortcuts:
1. Go to `chrome://extensions/shortcuts`
2. Find SecondBrain in the list
3. Set your preferred shortcut

## Development

### Files Overview

- `manifest.json`: Extension configuration
- `popup.html`, `popup.css`, `popup.js`: UI for the extension popup
- `content_script.js`: Script that runs on the webpage to extract content
- `background.js`: Handles communication with the FastAPI server

### Adding New Features

To extend the extension's functionality:

1. Modify `content_script.js` to extract additional types of content
2. Update the server communication in `background.js` if needed
3. Enhance the UI in `popup.html` and `popup.js` to display new information

## Troubleshooting

- **Content Not Extracting**: Make sure the page is fully loaded before extraction
- **Server Connection Error**: Verify that the FastAPI server is running at http://localhost:8000
- **Permission Issues**: Check that the extension has all required permissions in `manifest.json`

# SecondBrain

A system that combines a Chrome extension and FastAPI server for content extraction, embedding generation, and LLM-powered Q&A.

## Overview

SecondBrain enables users to:
1. Extract content (text, images with OCR, video transcriptions) from webpages using a Chrome extension
2. Process and embed the content into vector space using a FastAPI server
3. Query the embedded knowledge through a Streamlit chat interface powered by a local LLM

## Components

- **Chrome Extension**: Extracts content from webpages and sends it to the FastAPI server
- **FastAPI Server**: Processes content, generates embeddings, and provides query capabilities
- **Streamlit Chat**: User interface for querying the knowledge base

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js and npm (for Chrome extension development)
- Docker and Docker Compose (for containerized deployment)
- LMStudio (for local LLM processing)

### Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/saumitrab/SecondBrain.git
cd SecondBrain
```

2. **Install the Chrome Extension**
   - Follow the instructions in [chrome-extension/README.md](chrome-extension/README.md)

3. **Start the FastAPI Server**
   - Follow the instructions in [fastapi-server/README.md](fastapi-server/README.md)

4. **Launch the Streamlit Chat Interface**
   - Follow the instructions in [streamlit-chat/README.md](streamlit-chat/README.md)

5. **Using Docker Compose (Recommended)**
   - Run all components with a single command:
   ```bash
   docker compose up -d
   ```

## Project Structure

```
/SecondBrain
├── chrome-extension/     # Chrome extension for content extraction
├── fastapi-server/       # FastAPI backend server
├── streamlit-chat/       # Streamlit-based chat interface
└── docker-compose.yml    # Docker Compose configuration
```

## License

[MIT License](LICENSE)

## Contributors

- Saumitra Bhanage

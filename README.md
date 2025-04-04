# SecondBrain

A system that combines a Chrome extension and FastAPI server for content extraction, embedding generation, and LLM-powered Q&A.

## Overview

SecondBrain enables users to:
1. Extract content (text, images with OCR, video transcriptions) from webpages using a Chrome extension
2. Process and embed the content into vector space using a FastAPI server
3. Query the embedded knowledge through a beautiful Streamlit chat interface powered by:
   - Local LLM (LM-Studio)
   - Cloud-based LLM (Groq API) with multiple model options

## Components

- **Chrome Extension**: Extracts content from webpages and sends it to the FastAPI server
- **FastAPI Server**: Processes content, generates embeddings, and provides query capabilities
- **Streamlit Chat**: Modern user interface for querying the knowledge base with LLM selection options:
  - Local LLM (using LM-Studio)
  - Remote LLM (using Groq API with multiple models)

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js and npm (for Chrome extension development)
- Docker and Docker Compose (for containerized deployment)
- LMStudio (for local LLM processing)
- Groq API key (optional, for using Groq's cloud LLM service)

### Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/saumitrab/SecondBrain.git
cd SecondBrain
```

2. **Install Python Dependencies**

```bash
# Install all required Python packages
pip install -r requirements.txt

# If you're using Python 3 specifically:
pip3 install -r requirements.txt
```

3. **Install the Chrome Extension**
   - Follow the instructions in [chrome-extension/README.md](chrome-extension/README.md)

4. **Start the Application**
   - Run the application using the provided convenience scripts:
     - On Windows: Double-click `run.bat` or run it from the command line
     - On macOS/Linux: Execute `./run.sh` from the terminal
   - Or run directly with Python:
   ```bash
   python main.py
   # Or if you're using Python 3 specifically:
   python3 main.py
   ```
   - This starts both the FastAPI server and the Streamlit UI

5. **Using Docker Compose (Recommended)**
   - Run all components with a single command:
   ```bash
   docker compose up -d
   ```

## LLM Options

SecondBrain now supports multiple LLM options for answering your questions:

### Local LLM (LM-Studio)

- **Pros**: Complete privacy, no API costs, works offline
- **Cons**: Requires local resources, potentially slower
- **Setup**: 
  1. Download and install [LM-Studio](https://lmstudio.ai/)
  2. Start the local server in LM-Studio (default port: 1234)
  3. Select "Local LLM" in the SecondBrain UI

### Remote LLM (Groq API)

- **Pros**: Fast, powerful models, minimal local resources
- **Cons**: Requires internet, API key, potential cost
- **Setup**:
  1. Create an account on [Groq](https://console.groq.com/)
  2. Get your API key from the Groq dashboard
  3. **Important**: Enter your Groq API key in the SecondBrain UI (required to use cloud models)
  4. Choose from multiple models:
     - **Llama-3 8B**: Good balance of speed and quality
     - **Llama-3 70B**: Highest quality responses
     - **Gemma 7B**: Fast and efficient
     - **Mixtral 8x7B**: Strong performance with longer context

## Enhanced User Interface

The Streamlit UI has been redesigned for a minimal, distraction-free experience:

- **Simplified Design**: Clean, minimal interface focusing only on essential elements
- **Everything on One Page**: All controls and chat in a single view without sidebar distractions
- **Collapsible Settings**: Access model selection and settings through a simple expandable panel
- **Source Attribution**: Clear display of information sources
- **Streamlined Experience**: Focused entirely on the Q&A interaction

## Project Structure

```
/SecondBrain
├── main.py               # Main application entry point
├── requirements.txt      # Python dependencies
├── run.sh                # Convenience script for Unix-based systems
├── run.bat               # Convenience script for Windows
├── chrome-extension/     # Chrome extension for content extraction
├── fastapi-server/       # FastAPI backend server modules
├── streamlit-chat/       # Streamlit-based chat interface
└── docker-compose.yml    # Docker Compose configuration
```

## Accessing the Application

After starting the server:
- FastAPI Server: http://localhost:8000
- Streamlit UI: http://localhost:8501 (or http://localhost:8000/ui)
- API Documentation: http://localhost:8000/docs

## Troubleshooting

If you encounter a `ModuleNotFoundError` when running the application, make sure you've installed all required dependencies:

```bash
pip3 install -r requirements.txt
```

For LLM-related issues:
- **Local LLM**: Make sure LM-Studio is running and serving on port 1234
- **Groq API**: Verify your API key is correct and has not expired

## License

[MIT License](LICENSE)

## Contributors

- Saumitra Bhanage
- Tanmay S.
- Sandeep Kumar Shitala

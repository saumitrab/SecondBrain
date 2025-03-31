# FastAPI Server for SecondBrain

This directory contains the FastAPI server modules for SecondBrain:
- API endpoints for ingesting webpage content asynchronously (/ingest)
- API endpoints for querying the embedded knowledge (/query)
- API endpoints for checking system status (/status)
- API endpoint for redirecting to the Streamlit UI (/ui)

It uses a Sentence Transformer model for generating embeddings and a simple in-memory solution simulating a vector database.

## Architecture

The FastAPI server components are housed in this directory, but the main application entry point (`main.py`) has been moved to the root directory of the project for easier startup.

## Features

- REST API for ingestion and querying
- Automatic Streamlit UI integration (starts with the FastAPI server)
- Simple to use and deploy

## Setup & Running

### Prerequisites
- Python 3.8+
- Required Python packages:
  - fastapi
  - uvicorn
  - sentence-transformers
  - streamlit

### Installation

```bash
# Install required dependencies
pip install -r requirements.txt
```

### Running the Server

To run the server, navigate to the project root directory and run:

```bash
# Start the server from the root directory
python main.py
```

This will start both the FastAPI server and the Streamlit UI automatically.

## Accessing the Application

After starting the server:
- FastAPI Server: http://localhost:8000
- Streamlit UI: http://localhost:8501 (or http://localhost:8000/ui)
- API Documentation: http://localhost:8000/docs

## How It Works

The FastAPI server automatically starts the Streamlit UI when it's launched. This provides a seamless experience where you only need to start one server to get both the API and the UI running.

The integration works by:
1. Running the Streamlit server as a subprocess when the FastAPI server starts
2. Providing a redirect endpoint (/ui) that points to the Streamlit UI
3. Automatically terminating the Streamlit process when the FastAPI server shuts down

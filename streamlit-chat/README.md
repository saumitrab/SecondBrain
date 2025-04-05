# Streamlit Chat UI for SecondBrain

This is a Streamlit-based chat interface for interacting with the SecondBrain knowledge base using either a local LLM or cloud-based Groq API.

## Overview

The Streamlit UI provides a clean, minimalist interface to:
- Ask questions about your saved content
- Choose between local LLM (LM-Studio) or cloud-based LLM (Groq API)
- Select from multiple Groq models with different capabilities
- View answers, reasoning, and sources used to generate answers

![SecondBrain System Overview](resources/SecondBrainOverView.png)
*System architecture overview showing data flow between components*

## Key Features

- **Clean Minimalist Design**: Simple, uncluttered interface with pleasant color scheme
- **Light and Dark Mode Support**: Optimized UI for both light and dark themes
- **Sidebar Settings**: Easy access to all controls in an organized sidebar
- **Multiple AI Models**: Support for both local and cloud-based LLMs
- **Source Attribution**: See where information comes from with clickable source links
- **Reasoning Transparency**: View the AI's reasoning process separately from its final answer
- **Advanced RAG Implementation**: Enhanced retrieval with document chunking for better context

## Knowledge Management

### ChromaDB Vector Database
- Persistent vector storage using ChromaDB
- Efficient similarity search for relevant content
- Automatic backup and recovery for database integrity

### RAG with Smart Chunking
- Intelligent text chunking during ingestion
- Overlapping chunks to maintain context
- Multiple relevant chunks retrieved during queries

## Chrome Extension

A Chrome extension is available for easy content ingestion:
- **One-Click Ingestion**: Capture web content with a single click
- **Background Processing**: Content is processed asynchronously
- **Server Configuration**: Easily configure your SecondBrain server URL
- **Error Handling**: Robust error handling and recovery

## LLM Options

### Local LLM (LM-Studio)
- Uses a local instance of LM-Studio running on your machine
- Provides complete privacy and works offline
- Free to use but requires local compute resources

### Remote LLM (Groq API)
- Uses Groq's cloud API for fast processing
- **Requires** an API key from Groq (get one at https://console.groq.com/)
- Available models:
  - **Llama-3 8B**: Balanced speed and quality
  - **Llama-3 70B**: Highest quality responses
  - **Gemma 7B**: Fast, efficient model
  - **Mixtral 8x7B**: Strong performance with longer context

## UI Components

### Sidebar
- **Model Selection**: Radio buttons to choose between local and cloud AI
- **API Key Management**: Enter your Groq API key (required for cloud models)
- **Model Dropdown**: Select from multiple Groq models
- **Model Information**: Brief descriptions of each model's strengths
- **Chat Management**: Clear chat history

### Main Chat Area
- **Message Display**: Clean visualization of user and AI messages
- **Reasoning Display**: View the AI's thought process in a separate section
- **Answer Display**: Clearly distinguished final answers
- **Sources Section**: Clearly displayed reference links
- **Input Box**: Simple text area for asking questions
- **Ask Button**: Submit questions with a single click

## Accessing the UI

After starting the application:
- Direct access: http://localhost:8501
- Via redirect: http://localhost:8000/ui

## Running the Application

To start both the FastAPI server and this Streamlit UI, run from the project root:

```bash
# Run from the project root directory
python main.py
```

## Manual Start (if needed)

If you need to run the Streamlit UI separately:

```bash
cd streamlit-chat
streamlit run app.py
```

## Dependencies

- streamlit
- requests (for API communication)

## Configuration

The UI is configured to communicate with the FastAPI server at `http://localhost:8000`. If your FastAPI server runs on a different host or port, you'll need to update the API endpoint in the Streamlit code.
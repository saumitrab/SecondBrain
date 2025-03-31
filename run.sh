#!/bin/bash

# Run script for SecondBrain
# This script runs the SecondBrain application which includes:
# 1. FastAPI Server
# 2. Streamlit UI (automatically launched)

# Check if dependencies are installed
echo "Checking dependencies..."
if ! python -c "import fastapi" &> /dev/null; then
    echo "FastAPI is not installed. Installing dependencies..."
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies. Please run 'pip install -r requirements.txt' manually."
        exit 1
    fi
fi

echo "Starting SecondBrain..."
python main.py

# Note: Use Ctrl+C to stop the application 
@echo off
REM Run script for SecondBrain
REM This script runs the SecondBrain application which includes:
REM 1. FastAPI Server
REM 2. Streamlit UI (automatically launched)

echo Checking dependencies...
python -c "import fastapi" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo FastAPI is not installed. Installing dependencies...
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install dependencies. Please run 'pip install -r requirements.txt' manually.
        exit /b 1
    )
)

echo Starting SecondBrain...
python main.py

REM Note: Use Ctrl+C to stop the application 
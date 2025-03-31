"""
Main application file for SecondBrain.
This file serves as the entry point for the application and runs:
1. The FastAPI server (for content processing and API endpoints)
2. The Streamlit Chat UI (automatically started as a subprocess)

The FastAPI server runs on port 8000 by default, while the Streamlit UI 
runs on port 8501.
"""

import logging
import os
import subprocess
import threading
import time
import signal
import sys
import importlib.util
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# Import API routes - need to adjust the path for imports to work from root directory
sys.path.append(os.path.join(os.path.dirname(__file__), 'fastapi-server'))
from api.ingest import router as ingest_router
from api.query import router as query_router
from api.status import router as status_router

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("secondbrain.log")
    ]
)
logger = logging.getLogger(__name__)

# Global variable to store the Streamlit process
streamlit_process = None

def check_streamlit_installed():
    """Check if Streamlit is installed."""
    try:
        spec = importlib.util.find_spec("streamlit")
        return spec is not None
    except ImportError:
        return False

# Create FastAPI app
app = FastAPI(
    title="SecondBrain API",
    description="API for SecondBrain content extraction, embedding, and LLM Q&A",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For MVP, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(ingest_router)
app.include_router(query_router)
app.include_router(status_router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint returning basic API information."""
    return {
        "name": "SecondBrain API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/ingest - Process and embed content",
            "/query - Query the knowledge base",
            "/status - Get system status information",
            "/ui - Redirect to the Streamlit UI",
        ]
    }

# Streamlit UI redirect endpoint
@app.get("/ui", response_class=RedirectResponse, status_code=302)
async def redirect_to_streamlit():
    """Redirect to the Streamlit UI."""
    return "http://localhost:8501"

def start_streamlit_server():
    """Start the Streamlit server as a subprocess."""
    global streamlit_process
    
    # Check if streamlit is installed
    if not check_streamlit_installed():
        logger.error("Streamlit is not installed. Cannot start Streamlit server.")
        logger.info("Install Streamlit with: pip install streamlit")
        return
    
    try:
        # Get the path to the Streamlit app - now from root directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        streamlit_app_path = os.path.join(current_dir, "streamlit-chat", "app.py")
        
        # Verify app path exists
        if not os.path.exists(streamlit_app_path):
            logger.error(f"Streamlit app not found at: {streamlit_app_path}")
            logger.info(f"Current directory: {os.getcwd()}")
            logger.info(f"Trying to find app.py in nearby directories...")
            
            # Try to find app.py in a more flexible way
            for root, dirs, files in os.walk(current_dir):
                if "app.py" in files and "streamlit-chat" in root:
                    streamlit_app_path = os.path.join(root, "app.py")
                    logger.info(f"Found Streamlit app at: {streamlit_app_path}")
                    break
            else:
                logger.error("Could not find Streamlit app.py file.")
                return
        
        # Create streamlit command
        cmd = ["streamlit", "run", streamlit_app_path, "--server.port", "8501"]
        
        # Start streamlit process
        logger.info(f"Starting Streamlit server: {' '.join(cmd)}")
        
        # Use different start method based on platform
        kwargs = {
            "stdout": subprocess.PIPE,
            "stderr": subprocess.PIPE,
            "text": True,
        }
        
        # On Unix-like systems, create a new process group
        if sys.platform != "win32":
            kwargs["preexec_fn"] = os.setsid
        
        streamlit_process = subprocess.Popen(cmd, **kwargs)
        
        # Log process output in a separate thread
        def log_output():
            try:
                for line in iter(streamlit_process.stdout.readline, ''):
                    if not line:
                        break
                    logger.info(f"Streamlit: {line.strip()}")
            except Exception as e:
                logger.error(f"Error reading Streamlit stdout: {e}")
                
            try:
                for line in iter(streamlit_process.stderr.readline, ''):
                    if not line:
                        break
                    logger.error(f"Streamlit Error: {line.strip()}")
            except Exception as e:
                logger.error(f"Error reading Streamlit stderr: {e}")
        
        threading.Thread(target=log_output, daemon=True).start()
        
        # Check if process started successfully
        time.sleep(2)
        if streamlit_process.poll() is not None:
            logger.error(f"Streamlit process failed to start with return code {streamlit_process.returncode}")
        else:
            logger.info("Streamlit server started successfully at http://localhost:8501")
    
    except Exception as e:
        logger.error(f"Failed to start Streamlit server: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize components on application startup."""
    logger.info("Starting SecondBrain API")
    
    # Start Streamlit server
    start_streamlit_server()
    
    # Print helpful message
    logger.info("==========================================================")
    logger.info("SecondBrain is running!")
    logger.info("API server is available at: http://localhost:8000")
    logger.info("Streamlit UI is available at: http://localhost:8501")
    logger.info("==========================================================")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on application shutdown."""
    logger.info("Shutting down SecondBrain API")
    
    # Terminate Streamlit process if it's running
    global streamlit_process
    if streamlit_process and streamlit_process.poll() is None:
        logger.info("Terminating Streamlit server")
        try:
            if sys.platform == "win32":
                streamlit_process.terminate()
            else:
                # On Unix, kill the entire process group
                os.killpg(os.getpgid(streamlit_process.pid), signal.SIGTERM)
            
            # Wait for process to terminate
            streamlit_process.wait(timeout=5)
            logger.info("Streamlit server terminated successfully")
        except Exception as e:
            logger.error(f"Error terminating Streamlit server: {str(e)}")
            # Force kill if graceful termination fails
            try:
                if sys.platform == "win32":
                    streamlit_process.kill()
                else:
                    os.killpg(os.getpgid(streamlit_process.pid), signal.SIGKILL)
            except Exception as kill_error:
                logger.error(f"Error force killing Streamlit server: {str(kill_error)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
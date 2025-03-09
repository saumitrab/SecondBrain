# Product Requirements Document (PRD)
## Project: Chrome Extension & FastAPI Server for Content Extraction, Embedding, and LLM Q&A

### 1. Overview
This project is aimed at building a unified system that combines a Chrome extension and a FastAPI-backed Python server. The system enables users to extract visible content from a webpage—including text, images (with OCR), and transcribed video audio—along with the top-level URLs, embed that content into vector space, and interact with a local LLM (powered by LMStudio) via a chat interface built using Streamlit. The entire solution will reside in a single GitHub repository with detailed documentation for both developers and users.

### 2. Objectives
- **Content Extraction:** Allow users to manually extract visible text, images (with OCR), and speech-to-text transcriptions of video audio, along with the top-level source URL from a webpage.
- **Embedding and Storage:** Process the extracted text using a Sentence Transformer model to generate embeddings and store them in a local vector database (ChromaDB).
- **LLM-based Q&A with RAG:** Enable users to query the embedded knowledge through a chat interface. The LLM will answer queries strictly based on the embedded content, providing clickable reference URLs (similar to perplexity) to indicate knowledge sources.
- **Unified Codebase:** Develop the entire project within a monorepo containing separate folders for the Chrome extension and the FastAPI server, accompanied by thorough documentation, inline code comments, automated tests, and setup scripts.

### 3. Functional Requirements

#### 3.1 Chrome Extension
- **Content Extraction:**
  - **Visible Text:** Extract only the visible text from the webpage.
  - **Images:** Extract image URLs and alt text. Additionally, perform OCR on images to capture any textual content within them.
  - **Video Audio:** Use a speech-to-text process to extract transcriptions from video audio.
  - **URLs:** Extract only the top-level URL of the current page (to be used as the source reference).
- **User Interaction:**
  - Extraction is initiated manually by the user, either via a clickable button or a designated keyboard shortcut.
  - The extension displays the extraction status for the processed page.
- **Simplicity:**
  - The extension will process the entire page content rather than allowing area selections.
- **Platform:**
  - The MVP will support Chrome only.

#### 3.2 FastAPI Server
- **API Endpoints:**
  1. **/ingest:**  
     - Receives the extracted content (text, OCR results, transcriptions, and source URL) from the Chrome extension.
     - Processes the content asynchronously to generate embeddings.
  2. **/query:**  
     - Provides a synchronous chat API endpoint for querying the knowledge base.
     - Answers are generated strictly from the embedded content. If the knowledge is insufficient, the system will respond with "I don't know."
  3. **/status:**  
     - Provides status information about the current state of the knowledge base (e.g., total number of documents/embeddings).
- **Processing & Logging:**
  - The embedding process is asynchronous.
  - Detailed logging is implemented at all critical steps (e.g., during embedding, retrieval, and error events).
- **Security:**
  - No authentication or authorization is required in the MVP, as the system is intended for local deployment only.

#### 3.3 Embedding and Retrieval (RAG Setup)
- **Embedding:**
  - Use a widely adopted Sentence Transformer model (hardcoded for MVP) to generate embeddings.
- **Vector Database:**
  - Use local ChromaDB as the primary storage solution for embeddings.
  - Although Supabase is considered for cloud-based setups, it is not required for the MVP.
- **Retrieval Augmented Generation (RAG):**
  - Ensure that the LLM query responses are strictly based on the knowledge embedded in the system.
  - Include clickable reference URLs in the answers that direct users to the original source page.

#### 3.4 LLM Integration and Chat Interface
- **LLM:**
  - Leverage LMStudio as the local LLM for processing queries.
  - The system must ensure that the LLM only uses the extracted and embedded knowledge.
- **Chat Interface:**
  - Build a Streamlit-based chat interface that interacts with the FastAPI server's /query endpoint.
  - The interface will display answers along with clickable reference URLs that point to the original sources.

### 4. Technical Requirements

#### 4.1 Technology Stack
- **Chrome Extension:**
  - Built using HTML, CSS, and JavaScript.
  - Communicates with the FastAPI server via HTTP requests.
- **FastAPI Server:**
  - Python-based using FastAPI.
  - Integrates with a Sentence Transformer model for text embedding.
  - Uses local ChromaDB for vector storage.
- **LLM & Chat Interface:**
  - LMStudio for local LLM processing.
  - Streamlit for a user-friendly chat interface.

#### 4.2 Configuration & Flexibility
- **Embedding Model:**
  - The default Sentence Transformer model is hardcoded for MVP but can be made configurable in future iterations.
- **Database:**
  - Local ChromaDB is the default; future extensions may support Supabase for online hosting.
- **API Processing:**
  - Asynchronous processing for content embedding.
  - Synchronous processing for the chat query endpoint.
- **Deployment:**
  - The project will include Dockerfiles and detailed README instructions to streamline local deployment.

### 5. Repository Structure & Documentation

#### 5.1 Repository Layout (Monorepo)
/project-root
├── chrome-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content_script.js
│   ├── popup.html
│   └── README.md        # Instructions and setup for the Chrome extension
├── fastapi-server/
│   ├── main.py
│   ├── requirements.txt
│   ├── api/
│   │   ├── ingest.py
│   │   ├── query.py
│   │   └── status.py
│   ├── models/
│   │   └── embedding_model.py
│   ├── db/
│   │   └── vector_db.py
│   ├── tests/
│   │   ├── test_ingest.py
│   │   ├── test_query.py
│   │   └── test_status.py
│   └── README.md        # Instructions, Dockerfiles, and deployment info for the server
├── streamlit-chat/
│   ├── app.py           # Streamlit-based chat interface
│   └── README.md        # Setup and usage instructions for the chat interface
└── README.md            # Project overview, overall setup instructions, and CI/CD guidelines



#### 5.2 Documentation Requirements
- **Inline Code Comments:**  
  - Every major function, class, and module should include detailed inline comments.
- **README Files:**  
  - Each folder (Chrome extension, FastAPI server, Streamlit chat) will have a dedicated README file explaining setup, configuration, and deployment instructions.
- **Setup Instructions:**
  - Include Dockerfiles and CI/CD scripts to facilitate a smooth setup process for local deployment.
  - Provide detailed steps for running unit and integration tests.

### 6. Deployment & Testing

#### 6.1 Deployment
- **Local Deployment:**
  - The entire system is intended for local deployment in the MVP stage.
  - Detailed instructions (including Dockerfiles) will be provided to help users set up the environment with minimal effort.
- **Future Cloud Deployment:**
  - Cloud deployment options (e.g., using Supabase for database hosting) are considered for future enhancements.

#### 6.2 Testing & CI
- **Automated Testing:**
  - Develop unit tests and integration tests for both the FastAPI server and the Chrome extension.
- **CI Pipeline:**
  - Set up a CI pipeline that runs the tests and builds the Docker images automatically.
- **Error Handling & Logging:**
  - Implement robust error handling and logging throughout the system to aid in troubleshooting and maintenance.

### 7. Open Questions & Future Considerations
- **OCR & Speech-to-Text Performance:**
  - Evaluate the performance and accuracy of OCR and speech-to-text modules and refine as needed.
- **Scalability:**
  - For future releases, consider supporting additional browsers and cloud deployment.
- **Authentication:**
  - While not needed for MVP, plan for implementing authentication if the system is extended for broader deployment.
- **Extensibility:**
  - Future iterations might include support for LMStudio alternatives (e.g., Groqcloud) and online vector databases if needed.

### 8. Summary & Next Steps
- **Review:**  
  - Ensure that all team members review this PRD.
- **Feedback:**  
  - Collect and incorporate feedback regarding any further details or improvements.
- **Implementation:**  
  - Begin development following the detailed structure and instructions provided in this document.
- **Documentation:**  
  - Maintain comprehensive code and README documentation throughout development.

---

*This document is intended to be comprehensive enough to guide the engineering team through implementation, testing, and deployment of the project. For any further clarifications or updates, please refer back to this PRD or contact the product management team.*

# MVP Implementation Plan

This document outlines the MVP (Minimum Viable Product) implementation plan for the Chrome Extension & FastAPI Server project as described in the PRD. The goal is to deliver a functional MVP that allows users to extract webpage content, generate embeddings, and interact with a local LLM for knowledge-based Q&A.

---

## 1. Overview

- **Objective:**  
  Build a monorepo that contains:
  - A Chrome extension to extract visible text, images (with OCR), video transcriptions, and top-level URLs.
  - A FastAPI server that:
    - Ingests extracted content.
    - Processes embeddings asynchronously using a Sentence Transformer model.
    - Stores embeddings in a local ChromaDB.
    - Exposes endpoints for querying (synchronously) and checking status.
  - A Streamlit-based chat interface for users to interact with the local LLM (LMStudio) to get answers based solely on embedded knowledge.

- **Key Technologies:**  
  Chrome Extension (HTML, CSS, JavaScript), FastAPI (Python), Sentence Transformer, ChromaDB, LMStudio, and Streamlit.

---

## 2. High-Level Architecture
+----------------------+
|  Chrome Extension   |
|  (Content Extraction)|
+----------------------+
          |
          v
+----------------------+
|    FastAPI Server   |
|  - /ingest Endpoint |
|  - /query Endpoint  |
|  - /status Endpoint |
+----------------------+
          |
          v
+------------------------+
|   Embedding Module    |
| (Sentence Transformer)|
+------------------------+
          |
          v
+------------------------+
|   Vector Database     |
|    (Local ChromaDB)   |
+------------------------+
          |
          v
+------------------------+
|  LLM Interface (LMStudio) |
+------------------------+
          |
          v
+------------------------+
|    Streamlit Chat UI   |
+------------------------+


---

## 3. Implementation Phases

### Phase 1: Repository & Environment Setup
- **Repository Initialization:**
  - Set up a monorepo structure with separate directories for `chrome-extension`, `fastapi-server`, and `streamlit-chat`.
  - Create a top-level `README.md` with project overview and initial setup instructions.
- **Development Environment:**
  - Create virtual environments (e.g., using `venv` or `conda`) for the FastAPI server.
  - Prepare Dockerfiles for local deployment (one for the FastAPI server and one optionally for the Chrome extension if needed).

### Phase 2: Chrome Extension Development
- **Basic Setup:**
  - Implement manifest file (`manifest.json`) and basic extension files (e.g., `background.js`, `content_script.js`, and `popup.html`).
- **Content Extraction:**
  - Extract visible text from the webpage.
  - Extract image URLs and alt text.
  - Integrate OCR for images (use a lightweight OCR library or API wrapper; ensure performance is acceptable for MVP).
  - Extract video audio transcription using a speech-to-text service.
  - Extract the top-level URL.
- **User Interaction:**
  - Implement a manual trigger (button and/or keyboard shortcut) to initiate extraction.
  - Display extraction status on the extension (e.g., via a badge or simple text update).

### Phase 3: FastAPI Server Development
- **API Endpoints:**
  - **/ingest:**  
    - Accept JSON payloads containing the extracted data.
    - Process the payload asynchronously to generate embeddings.
  - **/query:**  
    - Accept user questions and return answers synchronously.
    - Use the embedded knowledge strictly; return “I don't know” if no relevant data is found.
  - **/status:**  
    - Return the current status of the knowledge base (e.g., total number of documents/embeddings).
- **Embedding Module:**
  - Integrate a popular Sentence Transformer model to generate embeddings.
  - Ensure asynchronous processing for scalability.
- **Vector Database:**
  - Integrate with local ChromaDB to store and retrieve embeddings.
- **Logging & Error Handling:**
  - Implement detailed logging for key events (embedding, retrieval, errors).
  - Set up basic error handling in all endpoints.

### Phase 4: LLM Integration (LMStudio)
- **Local LLM Setup:**
  - Integrate LMStudio as the local LLM.
  - Ensure that query responses are generated solely based on the embedded knowledge.
  - Validate that reference URLs are included in responses (to simulate clickable links).

### Phase 5: Streamlit Chat Interface
- **UI Development:**
  - Build a simple, user-friendly Streamlit app that connects to the `/query` endpoint.
  - Display a chat-like interface where users can ask questions and see answers with reference URLs.
- **Integration:**
  - Ensure that the chat UI handles user sessions and displays real-time responses.

### Phase 6: Testing & Integration
- **Unit & Integration Tests:**
  - Develop unit tests for:
    - Chrome extension extraction functions.
    - FastAPI endpoints (`ingest`, `query`, `status`).
  - Develop integration tests to simulate end-to-end data flow (from extraction to LLM response).
- **CI Pipeline:**
  - Set up a CI pipeline that runs tests automatically on code pushes.
  - Use GitHub Actions or another CI tool to automate testing and Docker builds.

### Phase 7: Documentation & Deployment
- **Documentation:**
  - Update README files in each folder with detailed setup, usage, and deployment instructions.
  - Ensure inline code comments are comprehensive.
  - Provide Dockerfiles and instructions to facilitate local deployment.
- **Local Deployment:**
  - Finalize Docker-compose (if applicable) to run all components locally.
  - Provide troubleshooting guides and ensure that deployment is as simple as “clone and run”.

---

## 4. Timeline & Milestones

- **Week 1:**
  - Repository setup and environment configuration.
  - Initial setup of Chrome extension and FastAPI skeleton.
- **Week 2:**
  - Develop content extraction functionality in the Chrome extension.
  - Implement basic API endpoints in FastAPI.
- **Week 3:**
  - Integrate Sentence Transformer for embedding and setup ChromaDB.
  - Develop asynchronous processing for the `/ingest` endpoint.
- **Week 4:**
  - Integrate LMStudio and develop the `/query` endpoint.
  - Begin developing the Streamlit chat interface.
- **Week 5:**
  - Conduct thorough testing (unit and integration tests).
  - Set up CI/CD pipeline.
- **Week 6:**
  - Finalize documentation, deployment scripts, and Dockerfiles.
  - Perform end-to-end integration testing.
  - Prepare MVP for demonstration.

---

## 5. Risks & Mitigation

- **OCR & Speech-to-Text Performance:**  
  - *Risk:* Potential delays or inaccuracies.  
  - *Mitigation:* Use well-tested libraries and allow asynchronous processing to handle delays.

- **Integration Challenges:**  
  - *Risk:* Integration between multiple components (Chrome extension, FastAPI, LLM, and Streamlit) might introduce bugs.  
  - *Mitigation:* Incremental integration with continuous testing and logging at each step.

- **Local Deployment Complexity:**  
  - *Risk:* Users might face issues with local deployment.  
  - *Mitigation:* Provide clear, detailed documentation and Docker-based deployment options.

---

## 6. Summary

This MVP implementation plan provides a clear, phased roadmap to build a fully functional prototype of the system described in the PRD. Each phase focuses on delivering a key component of the overall system, ensuring that by the end of Week 6, the MVP is ready for internal demonstration and further iteration.


import streamlit as st
import requests
import json
import time

# Set page config for a cleaner UI
st.set_page_config(
    page_title="SecondBrain Chat",
    page_icon="🧠",
    layout="wide",
)

# Apply custom CSS for a clean, responsive design with proper light/dark mode support
st.markdown("""
<style>
    /* Theme-aware variables */
    :root {
        --text-color: #1F2937;
        --bg-color: #FFFFFF;
        --card-bg: #F9FAFB;
        --primary-color: #4F46E5;
        --success-color: #10B981;
        --warning-color: #F59E0B;
        --info-color: #3B82F6;
        --border-color: #E5E7EB;
        --sidebar-bg: #1F2937;
        --sidebar-text: #F9FAFB;
        --sidebar-section-bg: #374151;
        --sidebar-border: #4B5563;
    }
    
    /* Dark mode overrides */
    [data-theme="dark"] {
        --text-color: #F9FAFB;
        --bg-color: #111827;
        --card-bg: #1F2937;
        --primary-color: #6366F1;
        --border-color: #4B5563;
        --sidebar-bg: #111827;
        --sidebar-text: #F9FAFB;
        --sidebar-section-bg: #1F2937;
        --sidebar-border: #374151;
    }
    
    /* Base styles */
    .main {
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
        color: var(--text-color);
    }
    
    /* Button styles */
    .stButton button {
        width: 100%;
        border-radius: 6px;
        height: 3em;
        font-weight: 600;
        background-color: var(--primary-color);
        color: white;
        border: none;
        transition: all 0.3s ease;
    }
    
    .stButton button:hover {
        filter: brightness(1.1);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    /* Input field styles */
    .stTextInput input, .stTextArea textarea {
        border-radius: 6px;
        font-size: 16px;
        padding: 10px;
        border: 1px solid var(--border-color);
        background-color: var(--bg-color);
        color: var(--text-color);
    }
    
    /* Chat message styles - IMPROVED SPACING */
    .chat-message {
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .chat-message.user {
        background-color: rgba(79, 70, 229, 0.1);
        border-left: 3px solid var(--primary-color);
        color: var(--text-color);
    }
    
    .chat-message.assistant {
        background-color: var(--card-bg);
        border-left: 3px solid var(--success-color);
        color: var(--text-color);
    }
    
    /* Chat headers - IMPROVED SPACING */
    .chat-header {
        font-weight: 600;
        margin-bottom: 0.8rem;
        display: flex;
        align-items: center;
        font-size: 1.1rem;
    }
    
    .chat-header-user {
        color: var(--primary-color);
    }
    
    .chat-header-assistant {
        color: var(--success-color);
    }
    
    .chat-content {
        line-height: 1.7;
        color: var(--text-color);
    }
    
    /* Source section styles - IMPROVED SPACING */
    .sources-section {
        margin-top: 1.2rem;
        padding-top: 0.8rem;
        border-top: 1px solid var(--border-color);
        color: var(--text-color);
    }
    
    .source-item {
        margin: 0.5rem 0;
        padding: 0.3rem 0;
        display: flex;
        align-items: center;
    }
    
    .source-icon {
        margin-right: 0.5rem;
    }
    
    .source-item a {
        color: var(--primary-color);
        padding: 0.2rem 0;
    }
    
    /* Sidebar styles */
    [data-testid="stSidebar"] {
        background-color: var(--sidebar-bg);
        padding: 1.5rem;
    }
    
    .sidebar-title {
        font-weight: 600;
        color: var(--sidebar-text);
        margin-bottom: 1.2rem;
        font-size: 1.1rem;
    }
    
    .sidebar-section {
        background-color: var(--sidebar-section-bg);
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        border: 1px solid var(--sidebar-border);
        color: var(--sidebar-text);
    }
    
    /* Fix spacing issues */
    div[data-testid="stVerticalBlock"] {
        gap: 0.8rem !important;
    }
    
    /* Radio button styles - IMPROVED SPACING */
    .stRadio > div {
        padding: 0.7rem 0;
        color: var(--sidebar-text);
    }
    
    .stRadio label p {
        color: var(--sidebar-text) !important;
        padding: 0.3rem 0;
    }
    
    /* Select box styles */
    .stSelectbox > div > label {
        color: var(--sidebar-text) !important;
        padding-bottom: 0.5rem;
    }
    
    .stSelectbox > div > div > div {
        background-color: var(--sidebar-section-bg);
        color: var(--sidebar-text);
        border-radius: 6px;
        padding: 0.2rem;
    }
    
    /* Model info styles */
    .model-info {
        font-size: 0.95rem;
        color: var(--sidebar-text);
        opacity: 0.9;
        padding: 0.5rem 0;
        white-space: pre-line;
        line-height: 1.6;
    }
    
    /* Alert styles - IMPROVED SPACING */
    .sidebar-info {
        background-color: var(--info-color);
        color: white;
        padding: 0.8rem;
        border-radius: 6px;
        margin-top: 0.8rem;
    }
    
    .sidebar-warning {
        background-color: var(--warning-color);
        padding: 0.8rem;
        border-radius: 6px;
        margin-top: 0.8rem;
        font-weight: 500;
        color: #1F2937;
    }
    
    /* Fix markdown container colors */
    [data-testid="stMarkdownContainer"] {
        color: inherit;
        margin-bottom: 0.5rem;
    }
    
    /* Fix text input label colors and spacing */
    .stTextInput label {
        color: var(--sidebar-text) !important;
        padding-bottom: 0.5rem;
    }
    
    .stTextArea label {
        margin-bottom: 0.5rem;
    }
    
    .stTextInput input::placeholder, .stTextArea textarea::placeholder {
        color: rgba(156, 163, 175, 0.8);
    }
    
    /* Improved spacing utilities */
    .sidebar-elem-spacing {
        margin-bottom: 1.2rem;
    }
    
    .sidebar-large-spacing {
        margin-bottom: 2rem;
    }
    
    .sidebar-section-spacing {
        margin-top: 2.5rem;
        margin-bottom: 1.5rem;
    }
    
    /* Fix caption color and add space */
    .stCaption {
        color: var(--text-color);
        margin-top: 0.3rem;
        margin-bottom: 0.3rem;
    }
    
    /* Ensure links are visible in both modes */
    a {
        color: var(--primary-color);
        text-decoration: underline;
        padding: 0.1rem 0;
    }
    
    /* Status message colors */
    [data-testid="stStatus"] {
        background-color: var(--card-bg);
        color: var(--text-color);
        padding: 1rem;
        margin: 1rem 0;
    }
    
    /* Add space before and after dividers */
    hr {
        margin: 1.5rem 0;
    }
    
    /* Improve text area spacing */
    div.stTextArea {
        padding-bottom: 1rem;
    }
    
    /* Better spacing for inputs */
    div.block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
    }
    
    /* Add space between consecutive chats */
    div.chat-container > div {
        margin-bottom: 1.5rem;
    }
    
    /* Improve paragraph spacing in chat messages */
    .chat-content p {
        margin-bottom: 0.8rem;
    }
    
    /* Add proper spacing for lists in chat messages */
    .chat-content ul, .chat-content ol {
        padding-left: 1.5rem;
        margin-bottom: 0.8rem;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state for chat history if it doesn't exist
if 'chat_history' not in st.session_state:
    st.session_state.chat_history = []

if 'llm_choice' not in st.session_state:
    st.session_state.llm_choice = "local"  # Default to local LLM

if 'groq_model' not in st.session_state:
    st.session_state.groq_model = "llama3-8b-8192"  # Default Groq model

# Add flag for input clearing - this is the fix
if 'clear_input' not in st.session_state:
    st.session_state.clear_input = False

# List of available Groq models
GROQ_MODELS = {
    "llama3-8b-8192": "Llama-3 8B",
    "llama3-70b-8192": "Llama-3 70B",
    "gemma-7b-it": "Gemma 7B",
    "mixtral-8x7b-32768": "Mixtral 8x7B"
}

# Sidebar for settings
with st.sidebar:
    st.title("⚙️ Settings")
    
    st.markdown('<div class="sidebar-elem-spacing"></div>', unsafe_allow_html=True)
    
    # LLM Selection Section
    st.markdown('<div class="sidebar-section">', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-title">AI Model Selection</div>', unsafe_allow_html=True)
    
    st.markdown('<div class="sidebar-elem-spacing"></div>', unsafe_allow_html=True)
    
    # Radio buttons for LLM selection
    llm_choice = st.radio(
        "Choose AI provider:",
        options=["Local LLM (LM-Studio)", "Groq Cloud API"],
        index=0 if st.session_state.llm_choice == "local" else 1,
    )
    st.session_state.llm_choice = "local" if "Local" in llm_choice else "groq"
    
    st.markdown('<div class="sidebar-large-spacing"></div>', unsafe_allow_html=True)
    
    # Show additional settings based on selection
    if st.session_state.llm_choice == "groq":
        # API Key input with validation
        groq_api_key = st.text_input(
            "Groq API Key (Required)", 
            type="password",
            value=st.session_state.get("groq_api_key", ""),
            placeholder="Enter your Groq API key...",
            help="Get a key at console.groq.com"
        )
        
        st.markdown('<div class="sidebar-large-spacing"></div>', unsafe_allow_html=True)
        
        # Save API key in session state
        if groq_api_key:
            st.session_state.groq_api_key = groq_api_key
            
            # Model selection dropdown
            model_choice = st.selectbox(
                "Select model:",
                options=list(GROQ_MODELS.keys()),
                format_func=lambda x: f"{GROQ_MODELS[x]}",
                index=list(GROQ_MODELS.keys()).index(st.session_state.groq_model) 
                    if st.session_state.groq_model in GROQ_MODELS 
                    else 0
            )
            st.session_state.groq_model = model_choice
            
            st.markdown('<div class="sidebar-large-spacing"></div>', unsafe_allow_html=True)
            
            # Display model info with more detailed descriptions
            model_info = {
                "llama3-8b-8192": "✓ Fast responses with good quality\n✓ Ideal for general knowledge queries\n✓ 8K context window for moderate-length documents",
                "llama3-70b-8192": "✓ Premium quality responses with nuanced understanding\n✓ Excellent for complex reasoning and detailed explanations\n✓ Best for professional or academic use cases",
                "gemma-7b-it": "✓ Efficient and lightweight model\n✓ Great for quick, factual responses\n✓ Lower resource usage for faster processing",
                "mixtral-8x7b-32768": "✓ Strong performance across diverse topics\n✓ Massive 32K context window for long documents\n✓ Excellent for summarizing large amounts of text"
            }
            
            formatted_info = model_info.get(model_choice, "").replace("\n", "<br>")
            st.markdown(f'<div class="model-info">{formatted_info}</div>', unsafe_allow_html=True)
        else:
            st.markdown('<div class="sidebar-warning">⚠️ API key is required for Groq models</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="sidebar-info">Using local LM-Studio</div>', unsafe_allow_html=True)
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Add a large gap before Chat Management section
    st.markdown('<div class="sidebar-section-spacing"></div>', unsafe_allow_html=True)
    
    # Chat Management Section
    st.markdown('<div class="sidebar-section">', unsafe_allow_html=True)
    st.markdown('<div class="sidebar-title">Chat Management</div>', unsafe_allow_html=True)
    
    st.markdown('<div class="sidebar-elem-spacing"></div>', unsafe_allow_html=True)
    
    if st.button("Clear Chat History", use_container_width=True, type="secondary"):
        st.session_state.chat_history = []
        st.rerun()
    
    st.markdown('</div>', unsafe_allow_html=True)

# Main chat area
main_container = st.container()
with main_container:
    st.title("🧠 SecondBrain Chat")
    
    # Chat display area
    chat_area = st.container()
    with chat_area:
        if not st.session_state.chat_history:
            pass
            
        for message in st.session_state.chat_history:
            if message["role"] == "user":
                st.markdown(
                    f"""<div class="chat-message user">
                        <div class="chat-header chat-header-user">You</div>
                        <div class="chat-content">{message['content']}</div>
                    </div>""", 
                    unsafe_allow_html=True
                )
            else:
                st.markdown(
                    f"""<div class="chat-message assistant">
                        <div class="chat-header chat-header-assistant">SecondBrain</div>
                        <div class="chat-content">{message['content']}</div>
                    </div>""", 
                    unsafe_allow_html=True
                )
                
                # Show sources if available
                if "sources" in message and message["sources"]:
                    st.markdown(
                        """<div class="sources-section">
                            <div style="font-weight: 600; color: #4B5563;">Sources:</div>
                        </div>""", 
                        unsafe_allow_html=True
                    )
                    
                    for url in message["sources"]:
                        st.markdown(
                            f"""<div class="source-item">
                                <span class="source-icon">🔗</span>
                                <a href="{url}" target="_blank">{url}</a>
                            </div>""", 
                            unsafe_allow_html=True
                        )
    
    # Input area
    st.divider()
    with st.container():
        # Check if we need to clear the input - this implements the fix
        if st.session_state.clear_input:
            st.session_state.clear_input = False
            question = st.text_area(
                "", 
                value="",  # Clear the input
                key="question_input",
                height=100,
                placeholder="Type your question here..."
            )
        else:
            question = st.text_area(
                "", 
                key="question_input",
                height=100,
                placeholder="Type your question here..."
            )
        
        # Layout for Ask button and model indicator
        col1, col2 = st.columns([3, 1])
        
        with col1:
            # Show which model is being used
            if st.session_state.llm_choice == "local":
                st.caption("Using Local LM-Studio")
            else:
                st.caption(f"Using Groq: {GROQ_MODELS[st.session_state.groq_model]}")
        
        with col2:
            ask_button = st.button("Ask", type="primary", use_container_width=True)

# Process question when Ask button is clicked
if ask_button and question.strip():
    # Clean up question
    question = question.strip()
    
    # Add user question to chat history
    st.session_state.chat_history.append({"role": "user", "content": question})
    
    # Create a loading placeholder
    with st.status("Processing...", expanded=True) as status:
        try:
            # Prepare payload with LLM choice and model selection
            payload = {
                "question": question,
                "llm_choice": st.session_state.llm_choice
            }
            
            # Add model selection if using Groq
            if st.session_state.llm_choice == "groq":
                # Check if API key is available
                if not ('groq_api_key' in st.session_state and st.session_state.groq_api_key):
                    status.update(label="Error: API key missing", state="error", expanded=True)
                    
                    # Add error to chat history
                    st.session_state.chat_history.append({
                        "role": "assistant", 
                        "content": "⚠️ Please provide a Groq API key in the sidebar settings to use cloud models.",
                        "sources": []
                    })
                    st.stop()
                
                # If we get here, API key is available
                payload["model"] = st.session_state.groq_model
                payload["api_key"] = st.session_state.groq_api_key
            
            status.update(label="Getting answer...")
            
            # Send request to backend
            response = requests.post(
                "http://localhost:8000/query", 
                json=payload,
                timeout=60  # Longer timeout for larger models
            )
            
            if response.ok:
                data = response.json()
                answer = data.get("answer", "")
                source_urls = data.get("source_urls", [])
                
                # Add response to chat history
                st.session_state.chat_history.append({
                    "role": "assistant", 
                    "content": answer,
                    "sources": source_urls
                })
                
                status.update(label="Done", state="complete", expanded=False)
                
            else:
                error_msg = f"Server error: {response.status_code} - {response.text}"
                
                # Add error to chat history
                st.session_state.chat_history.append({
                    "role": "assistant", 
                    "content": f"⚠️ I encountered an error: {error_msg}",
                    "sources": []
                })
                
        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            
            # Add error to chat history
            st.session_state.chat_history.append({
                "role": "assistant", 
                "content": f"⚠️ I encountered an error: {error_msg}",
                "sources": []
            })
    
    # Set the clear_input flag instead of directly modifying the input
    st.session_state.clear_input = True
    
    # Rerun to update the UI with the new message
    st.rerun()
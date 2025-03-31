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

# Apply custom CSS for a clean and minimalist design
st.markdown("""
<style>
    .main {
        padding: 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
    }
    .stButton button {
        width: 100%;
        border-radius: 6px;
        height: 3em;
        font-weight: 600;
        background-color: #4F46E5;
        color: white;
        border: none;
        transition: all 0.3s ease;
    }
    .stButton button:hover {
        background-color: #4338CA;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .stTextInput input {
        border-radius: 6px;
        font-size: 16px;
        padding: 10px;
        border: 1px solid #E5E7EB;
    }
    .stTextArea textarea {
        border-radius: 6px;
        font-size: 16px;
        border: 1px solid #E5E7EB;
    }
    .chat-message {
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .chat-message.user {
        background-color: #F3F4F6;
        border-left: 3px solid #4F46E5;
    }
    .chat-message.assistant {
        background-color: #F9FAFB;
        border-left: 3px solid #10B981;
    }
    .chat-header {
        font-weight: 600;
        margin-bottom: 0.4rem;
        display: flex;
        align-items: center;
    }
    .chat-header-user {
        color: #4F46E5;
    }
    .chat-header-assistant {
        color: #10B981;
    }
    .chat-content {
        line-height: 1.5;
    }
    .sources-section {
        margin-top: 0.8rem;
        padding-top: 0.5rem;
        border-top: 1px solid #E5E7EB;
    }
    .source-item {
        margin: 0.3rem 0;
        display: flex;
        align-items: center;
    }
    .source-icon {
        margin-right: 0.4rem;
        color: #6B7280;
    }
    [data-testid="stSidebar"] {
        background-color: #1F2937;
        padding: 1rem;
    }
    .sidebar-title {
        font-weight: 600;
        color: #FFFFFF;
        margin-bottom: 1rem;
    }
    .sidebar-section {
        background-color: #374151;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        border: 1px solid #4B5563;
        color: #F9FAFB;
    }
    div[data-testid="stVerticalBlock"] {
        gap: 0 !important;
    }
    .stRadio > div {
        padding: 0.5rem 0;
        color: #F9FAFB;
    }
    .stRadio label {
        color: #F9FAFB !important;
    }
    .stRadio label span {
        color: #F9FAFB !important;
    }
    .stSelectbox > div {
        color: #F9FAFB;
    }
    .stSelectbox > div > div > div {
        background-color: #4B5563;
        color: #F9FAFB;
        border-radius: 6px;
    }
    .model-info {
        font-size: 0.9rem;
        color: #D1D5DB;
        padding: 0.3rem 0;
        white-space: pre-line;
    }
    .sidebar-info {
        background-color: #3B82F6;
        color: white;
        padding: 0.5rem;
        border-radius: 6px;
        margin-top: 0.5rem;
    }
    .sidebar-warning {
        background-color: #F59E0B;
        color: #1F2937;
        padding: 0.5rem;
        border-radius: 6px;
        margin-top: 0.5rem;
        font-weight: 500;
    }
    [data-testid="stMarkdownContainer"] {
        color: inherit;
    }
    .stTextInput label {
        color: #F9FAFB !important;
    }
    .stTextInput input::placeholder {
        color: #9CA3AF;
    }
    .sidebar-elem-spacing {
        margin-bottom: 1rem;
    }
    .sidebar-large-spacing {
        margin-bottom: 3rem;
    }
    .sidebar-section-spacing {
        margin-top: 2.5rem;
        margin-bottom: 1.5rem;
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
        st.experimental_rerun()
    
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
    
    # Clear the input field
    st.session_state.question_input = ""
    
    # Rerun to update the UI with the new message
    st.experimental_rerun()
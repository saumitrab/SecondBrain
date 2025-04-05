import streamlit as st
import requests

# Set page config
st.set_page_config(
    page_title="SecondBrain",
    page_icon="🧠",
    layout="centered",
)

# Apply essential CSS only
st.markdown("""
<style>
    /* Core styling */
    .main {
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    /* Hide streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Chat message styling */
    .chat-message {
        display: flex;
        margin-bottom: 1.5rem;
        align-items: flex-start;
    }
    
    .chat-message-content {
        background-color: #F5F7F9;
        padding: 0.8rem 1.2rem;
        border-radius: 12px;
        max-width: 85%;
        font-size: 16px;
        line-height: 1.4;
    }
    
    /* Avatar styling */
    .avatar {
        width: 36px;
        height: 36px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        color: white;
        flex-shrink: 0;
    }
    
    .avatar.user {
        background-color: #FF6B6B;
    }
    
    .avatar.assistant {
        background-color: #FFB347;
    }
    
    /* Sources styling */
    .sources-section {
        margin-top: 0.8rem;
        font-size: 14px;
        opacity: 0.8;
    }
    
    .source-item {
        margin: 0.4rem 0;
        display: flex;
        align-items: center;
    }
    
    .source-icon {
        margin-right: 0.4rem;
    }
    
    .source-item a {
        color: #5E6AD2;
        text-decoration: underline;
    }
    
    /* Chat container spacing */
    .chat-container {
        padding-bottom: 60px;
    }
    
    /* New styles for reasoning */
    .reasoning-section {
        margin-top: 0.8rem;
        font-size: 0.9rem;
        padding: 0.8rem;
        background-color: #F8F9FA;
        border-left: 3px solid #6C757D;
        border-radius: 4px;
        color: #495057;
    }
    
    .reasoning-title {
        font-weight: 600;
        margin-bottom: 0.4rem;
        color: #495057;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state variables
def init_session_state():
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = []
    
    if 'llm_choice' not in st.session_state:
        st.session_state.llm_choice = "local"
    
    if 'groq_model' not in st.session_state:
        st.session_state.groq_model = "llama3-8b-8192"
    
    if 'lm_studio_url' not in st.session_state:
        st.session_state.lm_studio_url = "http://localhost:8000"
    
    if 'clear_input' not in st.session_state:
        st.session_state.clear_input = False

# Groq model definitions
GROQ_MODELS = {
    "llama3-8b-8192": "Llama-3 8B",
    "llama3-70b-8192": "Llama-3 70B",
    "gemma-7b-it": "Gemma 7B",
    "mixtral-8x7b-32768": "Mixtral 8x7B"
}

# Display chat messages function
def display_chat_messages():
    st.markdown('<div class="chat-container">', unsafe_allow_html=True)
    
    for message in st.session_state.chat_history:
        if message["role"] == "user":
            st.markdown(
                f"""<div class="chat-message">
                    <div class="avatar user">👤</div>
                    <div class="chat-message-content">{message['content']}</div>
                </div>""", 
                unsafe_allow_html=True
            )
        else:
            # Start the assistant message
            st.markdown(
                f"""<div class="chat-message">
                    <div class="avatar assistant">🤖</div>
                    <div class="chat-message-content">
                        {message['content']}
                    </div>""", 
                unsafe_allow_html=True
            )
            
            # Show reasoning in a collapsible expander if available
            if "reasoning" in message and message["reasoning"]:
                with st.expander("See reasoning"):
                    st.markdown(message["reasoning"])
            
            # Show sources if available
            if "sources" in message and message["sources"]:
                sources_html = """<div class="sources-section">
                    <div style="font-weight: 500; margin-bottom: 0.4rem;">Sources:</div>
                """
                
                for url in message["sources"]:
                    sources_html += f"""<div class="source-item">
                        <span class="source-icon">🔗</span>
                        <a href="{url}" target="_blank">{url}</a>
                    </div>"""
                
                sources_html += "</div>"
                st.markdown(sources_html, unsafe_allow_html=True)
            
            # Close the chat message div
            st.markdown("</div>", unsafe_allow_html=True)
    
    st.markdown('</div>', unsafe_allow_html=True)

# Sidebar settings
def render_sidebar():
    with st.sidebar:
        # Updated settings header with larger font and gear icon
        st.markdown('<div style="font-size: 28px; font-weight: 600; margin-bottom: 20px;">⚙️ Settings</div>', unsafe_allow_html=True)
        
        # Model selection
        st.subheader("Model Selection")
        llm_choice = st.radio(
            "Choose AI provider:",
            options=["Local LLM (LM-Studio)", "Groq Cloud API"],
            index=0 if st.session_state.llm_choice == "local" else 1,
        )
        st.session_state.llm_choice = "local" if "Local" in llm_choice else "groq"
        
        # LM Studio settings if local is selected
        if st.session_state.llm_choice == "local":
            lm_studio_url = st.text_input(
                "LM Studio URL (Required)",
                value=st.session_state.get("lm_studio_url", "http://localhost:8000"),
                placeholder="Enter URL (e.g., http://localhost:8000)",
                help="The URL where your LM Studio server is running"
            )
            
            if lm_studio_url:
                st.session_state.lm_studio_url = lm_studio_url
                st.info("Using LM-Studio at the specified URL")
            else:
                st.warning("LM Studio URL is required")
        
        # Groq settings if Groq is selected
        else:
            groq_api_key = st.text_input(
                "Groq API Key", 
                type="password",
                value=st.session_state.get("groq_api_key", ""),
                placeholder="Enter your Groq API key...",
                help="Get a key at console.groq.com"
            )
            
            if groq_api_key:
                st.session_state.groq_api_key = groq_api_key
                
                model_choice = st.selectbox(
                    "Select model:",
                    options=list(GROQ_MODELS.keys()),
                    format_func=lambda x: f"{GROQ_MODELS[x]}",
                    index=list(GROQ_MODELS.keys()).index(st.session_state.groq_model) 
                        if st.session_state.groq_model in GROQ_MODELS 
                        else 0
                )
                st.session_state.groq_model = model_choice
            else:
                st.warning("API key is required for Groq models")
        
        # Chat management
        st.subheader("Chat Management")
        if st.button("Clear Conversation"):
            st.session_state.chat_history = []
            st.rerun()

# Process user message and get response
def process_message(question):
    # Create a loading placeholder
    with st.status("Processing...", expanded=True) as status:
        try:
            # Prepare payload
            payload = {
                "question": question,
                "llm_choice": st.session_state.llm_choice
            }
            
            # Handle LM-Studio settings if selected
            if st.session_state.llm_choice == "local":
                if not ('lm_studio_url' in st.session_state and st.session_state.lm_studio_url):
                    status.update(label="Error: LM Studio URL missing", state="error", expanded=True)
                    
                    # Add error to chat history
                    st.session_state.chat_history.append({
                        "role": "assistant", 
                        "content": "⚠️ Please provide the LM Studio URL in the sidebar settings.",
                        "sources": []
                    })
                    return
                
                # Extract base URL without trailing slash
                base_url = st.session_state.lm_studio_url.rstrip('/')
            
            # Handle Groq settings if selected
            else:
                if not ('groq_api_key' in st.session_state and st.session_state.groq_api_key):
                    status.update(label="Error: API key missing", state="error", expanded=True)
                    
                    # Add error to chat history
                    st.session_state.chat_history.append({
                        "role": "assistant", 
                        "content": "⚠️ Please provide a Groq API key in the sidebar settings to use cloud models.",
                        "sources": []
                    })
                    return
                
                payload["model"] = st.session_state.groq_model
                payload["api_key"] = st.session_state.groq_api_key
                # Use default URL for backend
                base_url = "http://localhost:8000"
            
            status.update(label="Getting answer...")
            
            # Send request to backend using the appropriate URL
            response = requests.post(
                f"{base_url}/query", 
                json=payload,
                timeout=60
            )
            
            if response.ok:
                data = response.json()
                answer = data.get("answer", "")
                reasoning = data.get("reasoning", "")
                source_urls = data.get("source_urls", [])
                
                # Add response to chat history with reasoning
                st.session_state.chat_history.append({
                    "role": "assistant", 
                    "content": answer,
                    "reasoning": reasoning,
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

# Main function
def main():
    # Initialize session state
    init_session_state()
    
    # Render sidebar
    render_sidebar()
    
    # Main chat title
    st.title("SecondBrain Chat")

    # Add subheader with only the first line
    st.markdown("""
    <div style="margin-top: -10px; margin-bottom: 20px; color: rgba(49, 51, 63, 0.6);">
        <div style="font-size: 20px; font-weight: bold;">Chat with your personal knowledge base.</div>
    </div>
    """, unsafe_allow_html=True)
    
    # Display chat history
    display_chat_messages()
    
    # Chat input
    if st.session_state.clear_input:
        st.session_state.clear_input = False
        question = st.chat_input("How can I help you?")
    else:
        question = st.chat_input("How can I help you?")
    
    # Process the question when submitted
    if question:
        question = question.strip()
        
        # Add user question to chat history
        st.session_state.chat_history.append({"role": "user", "content": question})
        
        # Process the message
        process_message(question)
        
        # Set flag to clear input on next render
        st.session_state.clear_input = True
        
        # Rerun to update UI
        st.rerun()

# Run the app
if __name__ == "__main__":
    main()
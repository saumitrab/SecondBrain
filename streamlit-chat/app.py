import streamlit as st
import requests

st.title("SecondBrain Chat")

question = st.text_input("Enter your question:")

if st.button("Ask"):
    if question:
        try:
            response = requests.post("http://localhost:8000/query", json={"question": question})
            if response.ok:
                data = response.json()
                st.write("Answer:", data.get("answer", ""))
                if data.get("source_urls"):
                    st.write("Sources:")
                    for url in data["source_urls"]:
                        st.markdown(f"[{url}]({url})")
            else:
                st.error(f"Server error: {response.status_code} - {response.text}")
        except Exception as e:
            st.error(f"Request failed: {str(e)}")
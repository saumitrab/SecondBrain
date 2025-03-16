curl -X POST \
    "http://localhost:8000/ingest/" \
    -H "Content-Type: application/json" \
    -d '{
        "url": "https://example.com/article",
        "title": "Example Article",
        "textContent": "This is sample content from a webpage that would be processed and embedded.",
        "images": [
            {
                "src": "https://example.com/image1.jpg",
                "alt": "Example image description",
                "width": 800,
                "height": 600
            }
        ],
        "videoTranscriptions": [
            {
                "src": "https://example.com/video1.mp4",
                "type": "video/mp4",
                "duration": 120,
                "transcription": "This is an example video transcription."
            }
        ],
        "timestamp": "2023-11-10T15:30:00Z"
    }'

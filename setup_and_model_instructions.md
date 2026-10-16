# Setup & Execution Guide — CapAI Studio

This guide outlines system requirements, dependencies installation, and execution steps for running the **CapAI** application powered by the **Multi-Modal Contrastive Embedding Engine**.

---

## 1. Environment & Prerequisites

The backend requires Python 3.9+ with PyTorch and the Hugging Face Transformers ecosystem.

### Required Dependencies:
- **`torch`**: Deep learning tensor computation framework
- **`transformers`**: Dual-Tower Vision-Language Transformer implementation
- **`Pillow`**: High-performance image loading, decoding, and preprocessing
- **`flask`**: Lightweight WSGI application server
- **`werkzeug`**: WSGI utilities and multipart file handling

---

## 2. Installation Instructions

Open your terminal (PowerShell, Command Prompt, or bash) in the project root directory and run:

```powershell
pip install -r requirements.txt
```

Alternatively, install the core dependencies directly:

```powershell
pip install torch transformers Pillow flask werkzeug
```

---

## 3. How to Launch the Application

1. In your terminal, navigate to the project root directory:
   ```powershell
   cd "d:\Programming Languages\Python\PyProjects\Image Caption Generator"
   ```

2. Start the Flask application server:
   ```powershell
   python app.py
   ```

3. When the server launches, you will see initialization logs confirming the engine status:
   ```
   [CapAI Server] Preloading Dual-Tower Vision-Language Transformer...
   [Multi-Modal Contrastive Embedding Engine] Initializing on cpu...
   [Multi-Modal Contrastive Embedding Engine] Ready for cross-modal alignment.
   [CapAI Server] Multi-Modal Contrastive Embedding Engine loaded and ready.
   [CapAI Server] Launching application on http://127.0.0.1:5000
   ```

4. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```

---

## 4. Testing the Endpoint via cURL or Python

You can test the `/api/generate_caption` endpoint programmatically:

```python
import requests

url = "http://127.0.0.1:5000/api/generate_caption"
files = {"image": open("sample_sunset.jpg", "rb")}
data = {
    "platform": "Instagram",
    "tone": "Witty",
    "keyword": "Sunset",
    "generate_hashtags": "true"
}

response = requests.post(url, files=files, data=data)
print(response.json())
```

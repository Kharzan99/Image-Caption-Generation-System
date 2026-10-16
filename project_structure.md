# Project Directory Structure

This document provides a comprehensive overview of the **CapAI** project architecture and directory layout.

```
Image Caption Generator/
│
├── app.py                            # Flask server exposing REST API (/api/generate_caption)
├── requirements.txt                  # Python dependencies (Flask, Pillow, Werkzeug, torch, transformers)
│
├── engine/                           # Multi-Modal Contrastive Embedding Engine module
│   ├── multimodal_encoder.py         # Dual-Tower Vision-Language Transformer & cosine similarity alignment
│   └── caption_bank.json             # Contextual Style Matrix (9 platform x tone pools)
│
├── templates/                        # Jinja2 HTML templates
│   └── index.html                    # Single-page SaaS UI (Tailwind CSS, Lucide icons, CapAI emblem)
│
├── static/                           # Static client assets
│   ├── css/
│   │   └── style.css                 # Dark theme styling, glassmorphism, glowing gradients
│   └── js/
│       └── app.js                    # Reactive client controller (drag & drop, API, instant preview)
│
├── models/                           # Auxiliary model weights & tokenizer storage
│   ├── README.md                     # Model directory documentation
│   ├── model.keras                   # Custom trained neural model
│   └── tokenizer.pkl                 # Tokenizer pickle file
│
├── project_structure.md              # [This file] Complete project tree view
├── workflow.md                       # Deep Contrastive Vision-Language Alignment Pipeline documentation
├── setup_and_model_instructions.md   # Setup, environment, and execution guide
└── antigravity_tracker.md            # Chronological execution log and milestone history
```

---

## Component Responsibilities

### 1. Multi-Modal Contrastive Embedding Engine (`engine/`)
- **`engine/multimodal_encoder.py`**:
  - Implements the `ContrastiveEmbeddingEngine` class.
  - Houses the **Dual-Tower Vision-Language Transformer** loaded once during server initialization.
  - Takes raw input images and candidate textual descriptions, maps them into a joint continuous metric space, computes normalized cosine similarity across dual projection vectors, and outputs the Top-1 aligned candidate.
- **`engine/caption_bank.json`**:
  - Defines the **Contextual Style Matrix** containing curated, high-impact candidate captions categorized across 9 combinations of Platform (`Instagram`, `LinkedIn`, `X`) and Tone (`Professional`, `Witty`, `Minimalist`).

### 2. Application Server (`app.py`)
- Coordinates request validation, image decoding via Pillow, Contextual Style Matrix filtering, and similarity ranking.
- Implements keyword injection (`" | [Keyword]"`) and platform-appropriate generic hashtag appending.
- Exposes `GET /`, `GET /api/health`, and `POST /api/generate_caption`.

### 3. Frontend Interface (`templates/` & `static/`)
- **`templates/index.html`**: Clean, modern dark-themed SaaS interface with centered `CapAI` branding, platform/tone selectors, custom keyword input, and auto-hashtag toggle.
- **`static/js/app.js`**: Manages drag-and-drop image staging, real-time image preview, asynchronous `FormData` payload dispatch to `/api/generate_caption`, and one-click clipboard copying.

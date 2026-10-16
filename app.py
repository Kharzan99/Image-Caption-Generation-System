"""
app.py
==============================================================================
CapAI Studio Server — Multi-Modal Contrastive Embedding Service
==============================================================================
Integrates a Dual-Tower Vision-Language Transformer to project image and text
representations into a shared metric space. Ranks contextual candidate captions
from a curated style matrix using cosine similarity and formats the Top-1 result.
==============================================================================
"""

import os
import json
import time
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from engine.multimodal_encoder import get_embedding_engine

app = Flask(__name__)

# Security & Upload Configuration
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max upload
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

# Load Contextual Style Matrix (Caption Bank)
CAPTION_BANK_PATH = os.path.join(os.path.dirname(__file__), "engine", "caption_bank.json")
with open(CAPTION_BANK_PATH, "r", encoding="utf-8") as f:
    CONTEXTUAL_STYLE_MATRIX = json.load(f)

# Generic Platform-Appropriate Hashtags
GENERIC_PLATFORM_HASHTAGS = {
    "Instagram": ["#visuals", "#aesthetic", "#explorepage"],
    "LinkedIn": ["#leadership", "#innovation", "#professional"],
    "X": ["#trending", "#perspective", "#vibes"],
}

# Initialize and warm up the Multi-Modal Contrastive Embedding Engine once upon startup
print("[CapAI Server] Preloading Dual-Tower Vision-Language Transformer...")
embedding_engine = get_embedding_engine()
print("[CapAI Server] Multi-Modal Contrastive Embedding Engine loaded and ready.")


def allowed_file(filename: str) -> bool:
    """Check if the uploaded file has an allowed image extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index():
    """Serves the main single-page SaaS interface."""
    return render_template("index.html")


@app.route("/api/health", methods=["GET"])
def health_check():
    """Returns server and embedding engine health status."""
    return jsonify({
        "status": "online",
        "service": "CapAI Studio",
        "version": "2.0.0",
        "engine": "Multi-Modal Contrastive Embedding Engine",
        "architecture": "Dual-Tower Vision-Language Transformer",
        "supported_platforms": ["Instagram", "LinkedIn", "X"],
        "supported_tones": ["Professional", "Witty", "Minimalist"],
    })


@app.route("/api/generate_caption", methods=["POST"])
@app.route("/api/generate-caption", methods=["POST"])
def generate_caption_endpoint():
    """
    Primary API endpoint for cross-modal caption selection and styling.

    Accepts multipart/form-data:
      - 'image' (file): The uploaded image file
      - 'platform' (str): Target platform ('Instagram', 'LinkedIn', 'X')
      - 'tone' (str): Desired tone ('Professional', 'Witty', 'Minimalist')
      - 'keyword' (str, optional): Custom focus keyword (e.g., 'Sunset')
      - 'generate_hashtags' / 'include_hashtags' (bool/str): Toggle flag
    """
    start_time = time.time()

    # 1. Validate file presence (supports one or more images)
    raw_images = request.files.getlist("images") or request.files.getlist("image")
    valid_images = [
        f for f in raw_images 
        if f and f.filename != "" and allowed_file(secure_filename(f.filename))
    ]

    if not valid_images:
        return jsonify({
            "success": False,
            "error": f"No valid images selected. Please upload one or more images in formats: {', '.join(ALLOWED_EXTENSIONS).upper()}."
        }), 400

    # 2. Extract and normalize parameters
    raw_platform = request.form.get("platform", "Instagram").strip()
    platform_map = {"instagram": "Instagram", "linkedin": "LinkedIn", "x": "X"}
    platform = platform_map.get(raw_platform.lower(), "Instagram")

    raw_tone = request.form.get("tone", "Professional").strip()
    tone_map = {"professional": "Professional", "witty": "Witty", "minimalist": "Minimalist"}
    tone = tone_map.get(raw_tone.lower(), "Professional")

    keyword = request.form.get("keyword", "").strip()

    # Support both 'generate_hashtags' and 'include_hashtags' parameter names
    raw_hashtags = request.form.get("generate_hashtags") or request.form.get("include_hashtags", "true")
    generate_hashtags = str(raw_hashtags).lower() in ("true", "1", "yes", "on")

    try:
        # Step 1: Filter Contextual Style Matrix by requested platform and tone
        candidate_pool = CONTEXTUAL_STYLE_MATRIX.get(platform, {}).get(tone, [])
        if not candidate_pool:
            candidate_pool = [
                "A captivating visual captured with intentional clarity and perspective."
            ]

        # Step 2: Pass all uploaded images and filtered captions to ContrastiveEmbeddingEngine
        # Step 2: Compute per-image alignment for every uploaded image
        alignments = embedding_engine.compute_per_image_alignment(
            images=valid_images,
            candidate_captions=candidate_pool
        )

        hashtags_list = GENERIC_PLATFORM_HASHTAGS.get(platform, ["#visuals", "#aesthetic", "#explorepage"])
        hashtags_str = " ".join(hashtags_list) if generate_hashtags else ""

        # Step 3: Format distinct, tailored captions for each image
        image_results = []
        for k, (base_caption, sim_score) in enumerate(alignments):
            clean_base = base_caption.rstrip(".")
            if keyword:
                caption_core = f"{clean_base} | [{keyword}]"
            else:
                caption_core = f"{clean_base}."

            if generate_hashtags and hashtags_str:
                final_caption = f"{caption_core} {hashtags_str}".strip()
            else:
                final_caption = caption_core.strip()

            img_filename = secure_filename(valid_images[k].filename) if valid_images[k].filename else f"image_{k+1}.jpg"

            image_results.append({
                "image_index": k + 1,
                "filename": img_filename,
                "caption": final_caption,
                "similarity_score": round(sim_score, 4),
                "stats": {
                    "character_count": len(final_caption),
                    "word_count": len(final_caption.split()),
                }
            })

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        # Step 4: Return matched per-image captions to the client
        return jsonify({
            "success": True,
            "images_count": len(valid_images),
            "results": image_results,
            "caption": image_results[0]["caption"] if image_results else "",
            "platform": platform,
            "tone": tone,
            "keyword": keyword if keyword else None,
            "has_hashtags": generate_hashtags,
            "hashtags": hashtags_list if generate_hashtags else [],
            "inference_time_ms": elapsed_ms,
            "engine": "Multi-Modal Contrastive Embedding Engine",
        }), 200

    except Exception as exc:
        app.logger.exception("Inference alignment failed")
        return jsonify({
            "success": False,
            "error": f"Caption generation failed: {str(exc)}"
        }), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handles oversized uploads gracefully."""
    return jsonify({
        "success": False,
        "error": "File size exceeds the 16MB limit. Please upload a smaller image."
    }), 413


if __name__ == "__main__":
    print("[CapAI Server] Launching application on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)

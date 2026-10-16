"""
engine/multimodal_encoder.py
==============================================================================
Multi-Modal Contrastive Embedding Engine
==============================================================================
Encapsulates a Dual-Tower Vision-Language Transformer to map visual imagery
and semantic text representations into a shared latent metric space.
Computes normalized cosine similarity across dual projection spaces to select
the optimal contextual caption for single or multi-image inputs.
==============================================================================
"""

import os
from typing import List, Tuple, Union
from PIL import Image
import torch
from transformers import AutoProcessor, AutoModel

# Suppress verbose backend logs
os.environ["TOKENIZERS_PARALLELISM"] = "false"


class ContrastiveEmbeddingEngine:
    """
    Dual-Tower Vision-Language Transformer Engine.

    Encapsulates visual feature extraction and cross-modal projection
    alignment via joint representation space cosine matching.
    Supports single-image and multi-image per-image distinct alignment.
    """

    MODEL_IDENTIFIER = "openai/clip-vit-base-patch32"

    def __init__(self, device: str = None):
        """
        Initializes and loads model weights once upon startup.
        """
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        print(f"[Multi-Modal Contrastive Embedding Engine] Initializing on {self.device}...")
        self.multimodal_preprocessor = AutoProcessor.from_pretrained(
            self.MODEL_IDENTIFIER,
            use_fast=True
        )
        self.vision_language_model = AutoModel.from_pretrained(
            self.MODEL_IDENTIFIER
        ).to(self.device)
        self.vision_language_model.eval()
        print("[Multi-Modal Contrastive Embedding Engine] Ready for cross-modal alignment.")

    def _prepare_image_objects(
        self,
        images: Union[List[Union[Image.Image, str, object]], Union[Image.Image, str, object]]
    ) -> List[Image.Image]:
        """Converts diverse image input formats into a list of RGB PIL Image objects."""
        if not isinstance(images, (list, tuple)):
            raw_list = [images]
        else:
            raw_list = list(images)

        pil_images = []
        for img in raw_list:
            if isinstance(img, str):
                pil_images.append(Image.open(img).convert("RGB"))
            elif isinstance(img, Image.Image):
                pil_images.append(img.convert("RGB"))
            else:
                # FileStorage or byte buffer
                img.seek(0)
                pil_images.append(Image.open(img).convert("RGB"))

        return pil_images

    def compute_similarity_alignment(
        self,
        images: Union[List[Union[Image.Image, str, object]], Union[Image.Image, str, object]],
        candidate_captions: List[str]
    ) -> Tuple[str, float]:
        """
        Backward-compatible collective alignment for a single image or mean across images.
        """
        res = self.compute_per_image_alignment(images, candidate_captions)
        return res[0]

    def compute_per_image_alignment(
        self,
        images: Union[List[Union[Image.Image, str, object]], Union[Image.Image, str, object]],
        candidate_captions: List[str]
    ) -> List[Tuple[str, float]]:
        """
        Computes cosine similarity for EACH uploaded image individually against the candidate pool.
        Ensures each image receives its distinct, highest-affinity caption.

        Args:
            images: Single image or list of images
            candidate_captions: List of candidate captions

        Returns:
            List of (best_caption, score) tuples matching the exact order and length of images.
        """
        if not candidate_captions:
            raise ValueError("Candidate captions list cannot be empty.")

        pil_images = self._prepare_image_objects(images)
        if not pil_images:
            raise ValueError("At least one valid image is required.")

        # Prepare joint multimodal batch inputs
        inputs = self.multimodal_preprocessor(
            text=candidate_captions,
            images=pil_images,
            return_tensors="pt",
            padding=True
        ).to(self.device)

        with torch.no_grad():
            outputs = self.vision_language_model(**inputs)

            # Extract normalized dual-tower embeddings
            image_embeddings = outputs.image_embeds / outputs.image_embeds.norm(dim=-1, keepdim=True)
            text_embeddings = outputs.text_embeds / outputs.text_embeds.norm(dim=-1, keepdim=True)

            # Cosine similarity matrix: shape (num_images, num_candidates)
            similarity_matrix = (image_embeddings @ text_embeddings.T).cpu().numpy()

        results = []
        assigned_indices = set()

        for k in range(len(pil_images)):
            scores = similarity_matrix[k]
            # Rank candidates descending
            sorted_indices = scores.argsort()[::-1]

            # Find best distinct candidate not yet used in this request
            chosen_idx = None
            for idx in sorted_indices:
                if idx not in assigned_indices:
                    chosen_idx = idx
                    assigned_indices.add(idx)
                    break

            # Fallback if pool is smaller than number of uploaded images
            if chosen_idx is None:
                chosen_idx = int(sorted_indices[0])

            best_caption = candidate_captions[chosen_idx]
            best_score = float(scores[chosen_idx])
            results.append((best_caption, best_score))

        return results


# Global engine instance loaded once on startup
_global_embedding_engine = None


def get_embedding_engine() -> ContrastiveEmbeddingEngine:
    """Returns the singleton instance of the Multi-Modal Contrastive Embedding Engine."""
    global _global_embedding_engine
    if _global_embedding_engine is None:
        _global_embedding_engine = ContrastiveEmbeddingEngine()
    return _global_embedding_engine

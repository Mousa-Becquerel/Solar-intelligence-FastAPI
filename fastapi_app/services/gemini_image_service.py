"""
Gemini Image Generation Service
Wrapper around Google Gemini API for BIPV image generation
"""
import os
import io
import base64
import logging
from typing import Optional, List, Dict, Any
from PIL import Image

logger = logging.getLogger(__name__)

# Lazy import for google.genai to avoid startup issues if not configured
_genai_client = None
_genai_types = None


def _get_genai_modules():
    """Lazy load Google GenAI modules"""
    global _genai_client, _genai_types
    if _genai_client is None:
        try:
            from google import genai
            from google.genai import types
            _genai_client = genai
            _genai_types = types
        except ImportError as e:
            logger.error(f"Failed to import google.genai: {e}")
            raise ImportError("google-generativeai package not installed. Install with: pip install google-generativeai")
    return _genai_client, _genai_types


class GeminiImageService:
    """Service for Gemini image generation"""

    def __init__(self):
        """Initialize Gemini client"""
        genai, types = _get_genai_modules()

        # Import settings to get GEMINI_API_KEY from .env file
        from fastapi_app.core.config import settings
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")

        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-3-pro-image-preview"
        # Allow both IMAGE and TEXT modalities - let the model decide what to return
        # Documentation: https://ai.google.dev/gemini-api/docs/image-generation
        self.config = types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        )
        # Session storage: conversation_id -> contents list
        self._sessions: Dict[str, List] = {}
        logger.info("GeminiImageService initialized successfully")

    def _image_to_part(self, img: Image.Image):
        """Convert PIL Image to Gemini Part"""
        _, types = _get_genai_modules()

        buffer = io.BytesIO()
        if img.mode == 'RGBA':
            img.save(buffer, format="PNG")
            mime_type = "image/png"
        else:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(buffer, format="JPEG")
            mime_type = "image/jpeg"

        return types.Part.from_bytes(data=buffer.getvalue(), mime_type=mime_type)

    def _image_to_base64(self, img: Image.Image) -> tuple:
        """Convert PIL Image to base64 string and mime type"""
        buffer = io.BytesIO()
        if img.mode == 'RGBA':
            img.save(buffer, format="PNG")
            mime_type = "image/png"
        else:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(buffer, format="JPEG")
            mime_type = "image/jpeg"

        return base64.b64encode(buffer.getvalue()).decode('utf-8'), mime_type

    def generate_bipv_image(
        self,
        conversation_id: str,
        prompt: str,
        images: Optional[List[Image.Image]] = None
    ) -> Dict[str, Any]:
        """
        Generate BIPV visualization or text response (synchronous)
        The model decides whether to return an image based on the conversation context.

        Args:
            conversation_id: For maintaining conversation history
            prompt: Text prompt describing desired visualization
            images: Optional list of input images (building, PV modules)

        Returns:
            Dict with 'image_data', 'mime_type', 'text_response', 'success'
        """
        _, types = _get_genai_modules()

        try:
            # Get or create session
            if conversation_id not in self._sessions:
                self._sessions[conversation_id] = []

            contents = self._sessions[conversation_id]

            # Build parts list
            parts = [types.Part.from_text(text=prompt)]
            if images:
                for img in images:
                    parts.append(self._image_to_part(img))

            # Add user message to history
            contents.append(types.Content(role="user", parts=parts))

            logger.info(f"Calling Gemini API for conversation {conversation_id}")

            # Generate response - model decides whether to include image
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=self.config,
            )

            # Add response to history and extract parts
            result_image_data = None
            result_mime_type = None
            text_response = ""

            if response.candidates and len(response.candidates) > 0:
                candidate_content = response.candidates[0].content
                contents.append(candidate_content)

                # Debug: log all parts
                logger.info(f"Response has {len(candidate_content.parts)} parts")
                for i, part in enumerate(candidate_content.parts):
                    part_attrs = [attr for attr in dir(part) if not attr.startswith('_')]
                    logger.info(f"Part {i} attributes: {part_attrs}")
                    logger.info(f"Part {i} has text: {hasattr(part, 'text') and bool(part.text)}")
                    logger.info(f"Part {i} has inline_data: {hasattr(part, 'inline_data') and bool(part.inline_data)}")

                # Extract results from candidate parts
                for part in candidate_content.parts:
                    if hasattr(part, 'text') and part.text:
                        text_response += part.text
                    if hasattr(part, 'inline_data') and part.inline_data:
                        # inline_data is a Blob with 'data' (bytes) and 'mime_type'
                        blob = part.inline_data
                        result_image_data = base64.b64encode(blob.data).decode('utf-8')
                        result_mime_type = blob.mime_type
                        logger.info(f"Extracted image: {len(blob.data)} bytes, {blob.mime_type}")

            if result_image_data:
                logger.info(f"Image generated successfully for conversation {conversation_id}")
                return {
                    "image_data": result_image_data,
                    "mime_type": result_mime_type,
                    "text_response": text_response,
                    "success": True
                }

            logger.warning(f"No image generated for conversation {conversation_id}")
            return {
                "image_data": None,
                "mime_type": None,
                "text_response": text_response or "Unable to generate image. Please try a different prompt.",
                "success": False,
                "error": "No image generated"
            }

        except Exception as e:
            logger.error(f"Gemini API error for conversation {conversation_id}: {e}")
            return {
                "image_data": None,
                "mime_type": None,
                "text_response": None,
                "success": False,
                "error": str(e)
            }

    def clear_session(self, conversation_id: str):
        """Clear conversation history for a session"""
        if conversation_id in self._sessions:
            del self._sessions[conversation_id]
            logger.info(f"Cleared session for conversation {conversation_id}")

    def get_session_length(self, conversation_id: str) -> int:
        """Get number of turns in a conversation session"""
        return len(self._sessions.get(conversation_id, []))

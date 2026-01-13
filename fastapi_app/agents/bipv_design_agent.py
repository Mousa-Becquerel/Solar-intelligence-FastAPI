"""
BIPV Design Agent
Agent logic for BIPV (Building-Integrated Photovoltaics) visualization generation
Uses Google Gemini for image generation with multi-turn conversation support
"""
import io
import json
import logging
from typing import Optional, List, Dict, Any, AsyncGenerator
from PIL import Image

logger = logging.getLogger(__name__)

DESIGN_AGENT_SYSTEM_PROMPT = """You are Aria, a BIPV (Building-Integrated Photovoltaics) design visualization expert at Becquerel Institute.
Your role is to help users visualize different PV module styles on buildings that already have integrated photovoltaics.

IMPORTANT CONTEXT:
- The building images uploaded already have PV modules/panels installed (on rooftops, facades, or other surfaces)
- When users upload PV module images, they want to see how THOSE specific modules would look replacing the existing ones
- Keep the PV installation in the SAME LOCATION as the original (rooftop stays rooftop, facade stays facade, etc.)
- Replace the existing module appearance with the new module style/color/texture provided

CRITICAL REQUIREMENTS (apply to ALL generated images, including follow-up modifications):
- ALWAYS maintain the EXACT same dimensions as the original building image
- NEVER change the image size, aspect ratio, or resolution
- NEVER alter the shape, structure, or proportions of the building
- Each follow-up edit must preserve the original building dimensions exactly

When generating visualizations:
- Replace existing PV modules with the new module style while keeping them in the same position
- Maintain architectural integrity and aesthetics of the original building
- Preserve building proportions, style, and surrounding environment
- Create photorealistic visualizations that blend naturally with the structure

If no images are provided on the first turn, ask the user to upload a building image to get started."""


class BIPVDesignAgent:
    """Agent for BIPV design visualization using Gemini"""

    def __init__(self):
        """Initialize the agent (Gemini service loaded lazily)"""
        self._gemini_service = None
        self.system_prompt = DESIGN_AGENT_SYSTEM_PROMPT
        logger.info("BIPVDesignAgent initialized")

    def _get_gemini_service(self):
        """Lazy load Gemini service"""
        if self._gemini_service is None:
            from fastapi_app.services.gemini_image_service import GeminiImageService
            self._gemini_service = GeminiImageService()
        return self._gemini_service

    async def analyze_stream(
        self,
        query: str,
        conversation_id: str,
        images: Optional[List[Image.Image]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream response for design query

        Args:
            query: User's prompt
            conversation_id: For conversation history
            images: List of PIL Image objects from uploads

        Yields:
            JSON strings for SSE events
        """
        try:
            gemini_service = self._get_gemini_service()

            # Images are already PIL Images from the endpoint
            pil_images = None
            if images:
                pil_images = []
                for img in images:
                    try:
                        # Already a PIL Image, just validate and log
                        logger.info(f"Received image: {img.size} {img.mode}")
                        pil_images.append(img)
                    except Exception as img_error:
                        logger.error(f"Failed to process image: {img_error}")

            # Build full prompt with system context
            full_prompt = f"{self.system_prompt}\n\nUser request: {query}"

            # Yield processing status
            yield json.dumps({
                "type": "processing",
                "message": "Processing your request..."
            })

            # Generate response - model decides whether to return image or text
            result = gemini_service.generate_bipv_image(
                conversation_id=conversation_id,
                prompt=full_prompt,
                images=pil_images
            )

            # Yield text response if any
            if result.get("text_response"):
                # Clean up Gemini's image references from text (e.g., "image_1.png")
                import re
                text_response = result["text_response"]
                # Remove image reference patterns like "image_1.png", "(based on image_1.png)", etc.
                text_response = re.sub(r'\s*\(?\s*(?:based on\s+)?image_\d+\.(?:png|jpg|jpeg)\s*\)?\s*', ' ', text_response, flags=re.IGNORECASE)
                text_response = re.sub(r'\s+', ' ', text_response).strip()  # Clean up extra whitespace

                yield json.dumps({
                    "type": "text_chunk",
                    "content": text_response
                })

            # Yield image if generated
            if result.get("success") and result.get("image_data"):
                yield json.dumps({
                    "type": "image",
                    "content": {
                        "image_data": result["image_data"],
                        "mime_type": result["mime_type"],
                        "title": "BIPV Visualization"
                    }
                })
                yield json.dumps({"type": "done", "has_image": True})
            elif not result.get("success"):
                error_msg = result.get("error", "Failed to generate visualization")
                if not result.get("text_response"):
                    yield json.dumps({
                        "type": "text_chunk",
                        "content": f"I encountered an issue: {error_msg}. Please try rephrasing your request or uploading different images."
                    })
                yield json.dumps({"type": "done", "has_image": False})
            else:
                yield json.dumps({"type": "done", "has_image": False})

        except Exception as e:
            logger.error(f"BIPV Design agent error: {e}")
            yield json.dumps({
                "type": "error",
                "message": f"An error occurred: {str(e)}"
            })

    def clear_conversation(self, conversation_id: str):
        """Clear conversation history"""
        try:
            gemini_service = self._get_gemini_service()
            gemini_service.clear_session(conversation_id)
        except Exception as e:
            logger.error(f"Error clearing conversation {conversation_id}: {e}")

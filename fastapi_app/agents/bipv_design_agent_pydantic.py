"""
BIPV Design Agent (Pydantic AI Version)
Agent logic for BIPV (Building-Integrated Photovoltaics) visualization generation
Uses Pydantic AI with dual-model architecture:
- gemini-2.5-flash for routing and technical Q&A
- gemini-3-pro-image-preview for image generation

Maintains SSE streaming format compatible with existing frontend.
"""
import io
import os
import json
import base64
import logging
from typing import Optional, List, Dict, Any, AsyncGenerator
from dataclasses import dataclass, field
from PIL import Image

from pydantic import BaseModel
from pydantic_ai import Agent, RunContext

logger = logging.getLogger(__name__)


# ============================================
# Module Detection from Filename
# ============================================
# Maps filename patterns to FuturaSun module names
FUTURASUN_MODULE_PATTERNS = {
    'futurasun-silk-nova-ab': 'FuturaSun Silk Nova All Black',
    'futurasun-silk-nova-all-black': 'FuturaSun Silk Nova All Black',
    'futurasun-silk-nova-red': 'FuturaSun Silk Nova Red',
    'futurasun-silk-nova-green': 'FuturaSun Silk Nova Green Duetto',
    'futurasun-silk-nova-green-duetto': 'FuturaSun Silk Nova Green Duetto',
}


def detect_module_from_filename(filename: str) -> Optional[str]:
    """
    Detect FuturaSun module type from uploaded image filename.

    Sample modules create files with names like:
    - futurasun-silk-nova-ab.png
    - futurasun-silk-nova-red.png
    - futurasun-silk-nova-green.png

    Args:
        filename: The uploaded file's name

    Returns:
        Module name (e.g. "FuturaSun Silk Nova Red") or None if not detected
    """
    if not filename:
        return None

    # Normalize filename: lowercase, remove extension
    normalized = filename.lower()
    if '.' in normalized:
        normalized = normalized.rsplit('.', 1)[0]

    # Check against known patterns
    for pattern, module_name in FUTURASUN_MODULE_PATTERNS.items():
        if pattern in normalized:
            logger.info(f"[BIPV] Detected module from filename '{filename}': {module_name}")
            return module_name

    return None


def detect_modules_from_filenames(filenames: List[str]) -> Optional[str]:
    """
    Detect FuturaSun module from a list of filenames (typically PV module images).

    Args:
        filenames: List of uploaded file names

    Returns:
        First detected module name or None
    """
    if not filenames:
        return None

    for filename in filenames:
        module = detect_module_from_filename(filename)
        if module:
            return module

    return None


# ============================================
# System Prompt
# ============================================
DESIGN_AGENT_SYSTEM_PROMPT = """You are Aria, a BIPV (Building-Integrated Photovoltaics) design visualization expert at Becquerel Institute.

You specialize in FuturaSun Silk® Nova series modules and can help with:
1. IMAGE GENERATION: Creating photorealistic BIPV visualizations using the `generate_visualization` tool
2. TECHNICAL QUESTIONS: Answering questions about BIPV and FuturaSun modules (answer directly from your knowledge)

For visualization requests ("Show me...", "Create...", "Visualize...", "Generate...", "Add panels..."):
- Use the `generate_visualization` tool
- The building images uploaded already have PV modules/panels installed
- Replace existing modules with the new style/color while keeping the SAME LOCATION
- ALWAYS maintain the EXACT same building dimensions and proportions

For technical questions ("What is...", "How does...", "Tell me about...", "Compare..."):
- Answer directly from your knowledge below - NO tool needed

═══════════════════════════════════════════════════════════════════════════════
FUTURASUN SILK® NOVA SERIES - YOUR EXPERT KNOWLEDGE
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ FU 420/425/430 M Silk® Nova ALL BLACK                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ Power: 420-430 Wp | Efficiency: Up to 22%                                   │
│ Cells: N-Type monocrystalline, 108 half-cut (182mm)                         │
│ Size: 1722 x 1134 x 30 mm | Weight: 20.8 kg                                 │
│ Temp Coefficient: -0.29%/°C                                                 │
│ Design: Full all-black (cells, frame, backsheet)                            │
│ Warranty: 15 years product, 25 years performance                            │
│ Degradation: 99% Y1 → 92% Y20 → 89% Y25 (max 0.4%/year)                     │
│ Certifications: IEC EN 61730, IEC EN 61215, EPD Norway, Fire Class C        │
│ Best For: Premium residential rooftops, modern architecture, aesthetics     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ FU 370 M Silk® Nova RED                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Power: 370 Wp | Efficiency: ~20%                                            │
│ Cells: N-Type monocrystalline, 108 half-cut                                 │
│ Size: 1722 x 1134 x 34 mm | Weight: 20.8 kg                                 │
│ Temp Coefficient: -0.29%/°C                                                 │
│ Design: Brick red glass (RAL 3005) with color-matching frame                │
│ Warranty: 15 years product, 25 years performance                            │
│ Degradation: 99% Y1 → 92% Y20 → 89% Y25 (max 0.4%/year)                     │
│ Best For: Historical buildings, heritage areas, terracotta roof replacement │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ FU 400/405/410 M Silk® Nova GREEN DUETTO                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Power: 400-410 Wp | Bifacial: Yes (generates from both sides)               │
│ Cells: N-Type bifacial, 96 half-cut (182mm)                                 │
│ Size: 1762 x 1134 x 30 mm | Weight: 25.5 kg                                 │
│ Temp Coefficient: -0.29%/°C                                                 │
│ Design: Green glass (RAL 6000) + 2mm tempered glass both sides              │
│ Warranty: 15 years product, 30 years performance (longest!)                 │
│ Degradation: 99% Y1 → 92% Y20 → 87% Y30 (max 0.4%/year)                     │
│ Best For: Greenfield installations, PV fences, agrivoltaics, heavy snow     │
└─────────────────────────────────────────────────────────────────────────────┘

COMMON FEATURES (All Silk® Nova):
• N-Type cells (superior to P-Type) with half-cut multi-busbar design
• "Round ribbon" construction for better light reflection
• Two independent sections for improved shade tolerance
• Resistant to LID and LeTID degradation
• Enhanced low-light performance
• Manufacturer: FuturaSun (Italian company) - www.futurasun.com

═══════════════════════════════════════════════════════════════════════════════

If no images are provided and user requests visualization, ask them to upload images first.
Always be helpful and suggest follow-up actions."""


# ============================================
# Dependencies (Runtime context)
# ============================================
@dataclass
class BIPVDependencies:
    """Runtime dependencies passed to the agent"""
    conversation_id: str
    images: Optional[List[Image.Image]] = None
    gemini_service: Any = None  # GeminiImageService instance
    # For storing generated image data (set by tool, read by caller)
    generated_image: Dict[str, Any] = field(default_factory=dict)
    # For storing technical answer (set by tool, read by caller)
    technical_answer: Dict[str, Any] = field(default_factory=dict)


# ============================================
# Create the Pydantic AI Agent
# ============================================
def create_bipv_agent():
    """Create and return the BIPV Pydantic AI agent"""
    from fastapi_app.core.config import settings

    # Try different import paths for compatibility
    try:
        from pydantic_ai.models.google import GoogleModel
        from pydantic_ai.providers.google import GoogleProvider

        # Create provider with API key
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        provider = GoogleProvider(api_key=api_key)

        # Use gemini-2.5-flash for routing and text (faster, cheaper)
        # Image generation uses direct API call with gemini-3-pro-image-preview
        model = GoogleModel('gemini-2.5-flash', provider=provider)
    except ImportError:
        # Fallback for older pydantic-ai versions
        try:
            from pydantic_ai.models.gemini import GeminiModel
            model = GeminiModel('gemini-2.5-flash')
        except ImportError:
            raise ImportError("Could not import GoogleModel or GeminiModel from pydantic-ai. "
                            "Please ensure pydantic-ai is installed with google support.")

    agent = Agent(
        model,
        deps_type=BIPVDependencies,
        system_prompt=DESIGN_AGENT_SYSTEM_PROMPT,
    )

    return agent


# Create the global agent instance
_bipv_agent = None

def get_bipv_pydantic_agent():
    """Get or create the BIPV Pydantic AI agent"""
    global _bipv_agent
    if _bipv_agent is None:
        _bipv_agent = create_bipv_agent()
        _register_tools(_bipv_agent)
    return _bipv_agent


def _register_tools(agent: Agent):
    """Register tools on the agent"""

    @agent.tool
    async def generate_visualization(
        ctx: RunContext[BIPVDependencies],
        visualization_prompt: str,
        placement_areas: str = "existing location",
        style_notes: str = ""
    ) -> str:
        """Generate a BIPV visualization image.

        Use this tool when the user wants to CREATE, VISUALIZE, or SEE BIPV panels on a building.
        This tool generates photorealistic visualizations of buildings with integrated PV modules.

        Args:
            visualization_prompt: Description of what the user wants to visualize
            placement_areas: Where to place/replace PV panels (roof, facade, existing location, etc.)
            style_notes: Any specific style requirements (photorealistic, architectural, etc.)

        Returns:
            Status message about the visualization generation
        """
        deps = ctx.deps

        if not deps.images:
            return "I need building images to generate a visualization. Please upload a building image first, and optionally a PV module image showing the style you'd like to see."

        try:
            # Get the Gemini service for image generation
            gemini_service = deps.gemini_service
            if gemini_service is None:
                from fastapi_app.services.gemini_image_service import GeminiImageService
                gemini_service = GeminiImageService()

            # Build the visualization prompt with strong reference-matching instructions
            full_prompt = f"""Create a photorealistic BIPV visualization based on this request:
{visualization_prompt}

Placement: {placement_areas}
Style: {style_notes if style_notes else 'Photorealistic, professional quality'}

CRITICAL REQUIREMENTS - Follow these EXACTLY:

1. REFERENCE MODULE MATCHING (if PV module image provided):
   - The second image shows the EXACT PV module style to use
   - Copy the EXACT color, texture, cell pattern, and appearance from the reference module
   - Match the module's aspect ratio (approximately 1722mm x 1134mm, ratio ~1.52:1)
   - Preserve the exact visual characteristics: cell grid lines, frame color, surface finish

2. PANEL LAYOUT PRESERVATION:
   - Count the EXACT number of panels in the original building image
   - Keep the SAME number of panels in the output
   - Maintain the SAME panel arrangement/layout pattern
   - Preserve the SAME spacing between panels
   - Keep panels in the SAME locations on the building

3. BUILDING INTEGRITY:
   - Output image must have IDENTICAL dimensions to the input building image
   - Do NOT change the building structure, shape, or proportions
   - Preserve all architectural details (windows, doors, trim, etc.)
   - Match the original lighting conditions and shadows

4. COLOR REPLACEMENT ONLY:
   - This is a COLOR/TEXTURE swap operation, not a redesign
   - Replace ONLY the panel surface appearance
   - Keep everything else exactly as in the original

The goal is to show what the building would look like with a DIFFERENT module type installed in the EXACT same configuration."""

            # Use the existing Gemini service for image generation
            result = gemini_service.generate_bipv_image(
                conversation_id=deps.conversation_id,
                prompt=full_prompt,
                images=deps.images
            )

            if result.get("success") and result.get("image_data"):
                # Store the generated image in deps for the caller to access
                deps.generated_image = {
                    'image_data': result.get('image_data', ''),
                    'mime_type': result.get('mime_type', 'image/png'),
                    'title': 'BIPV Visualization',
                    'success': True
                }
                # Return a natural language response for the model to incorporate
                return "I've successfully generated the BIPV visualization. The image shows the building with the requested solar panel integration."
            else:
                error_msg = result.get("error", "Unknown error")
                text_response = result.get("text_response", "")
                if text_response:
                    return f"I couldn't generate the image, but here's what I can tell you: {text_response}"
                return f"I encountered an issue generating the visualization: {error_msg}. Please try rephrasing your request or uploading different images."

        except Exception as e:
            logger.error(f"Error in generate_visualization tool: {e}")
            return f"An error occurred while generating the visualization: {str(e)}"


# ============================================
# Main Agent Class (Interface compatible with existing code)
# ============================================
class BIPVDesignAgentPydantic:
    """BIPV Design Agent using Pydantic AI

    This class provides an interface compatible with the existing BIPVDesignAgent
    but uses Pydantic AI under the hood for routing and tool selection.
    """

    def __init__(self):
        """Initialize the agent"""
        self._gemini_service = None
        self._agent = None
        self._message_history: Dict[str, List] = {}  # conversation_id -> messages
        logger.info("BIPVDesignAgentPydantic initialized")

    def _get_gemini_service(self):
        """Lazy load Gemini service"""
        if self._gemini_service is None:
            from fastapi_app.services.gemini_image_service import GeminiImageService
            self._gemini_service = GeminiImageService()
        return self._gemini_service

    def _get_agent(self):
        """Lazy load Pydantic AI agent"""
        if self._agent is None:
            self._agent = get_bipv_pydantic_agent()
        return self._agent

    async def analyze_stream(
        self,
        query: str,
        conversation_id: str,
        images: Optional[List[Image.Image]] = None,
        image_filenames: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream response for design query

        Args:
            query: User's prompt
            conversation_id: For conversation history
            images: List of PIL Image objects from uploads
            image_filenames: List of original filenames (for module detection)

        Yields:
            JSON strings for SSE events (compatible with existing format)
        """
        try:
            # Yield processing status
            yield json.dumps({
                "type": "processing",
                "message": "Processing your request..."
            })

            # Prepare dependencies
            deps = BIPVDependencies(
                conversation_id=conversation_id,
                images=images,
                gemini_service=self._get_gemini_service()
            )

            # Get or create message history for this conversation
            if conversation_id not in self._message_history:
                self._message_history[conversation_id] = []

            message_history = self._message_history[conversation_id]

            # Run the agent with streaming
            agent = self._get_agent()

            # Detect module from filenames (sample modules have specific naming)
            detected_module = detect_modules_from_filenames(image_filenames) if image_filenames else None

            # Build context-aware query so the model knows images are available
            if images and len(images) > 0:
                if len(images) == 1:
                    image_context = "\n\n[CONTEXT: User has uploaded 1 building image. Use the generate_visualization tool to process this request - do NOT ask for more details.]"
                else:
                    # Build module context based on detection
                    if detected_module:
                        module_info = f"The user has selected the '{detected_module}' module from the sample library."
                    else:
                        module_info = "The module style is already provided in the uploaded reference image."

                    image_context = f"\n\n[CONTEXT: User has uploaded {len(images)} images - a building image AND a PV module reference image. {module_info} Use the generate_visualization tool to process this request immediately - do NOT ask which module to use.]"
                enhanced_query = query + image_context
            else:
                enhanced_query = query

            try:
                # Use run_stream for streaming text response
                async with agent.run_stream(
                    enhanced_query,
                    deps=deps,
                    message_history=message_history if message_history else None
                ) as result:
                    # Stream text chunks as they arrive
                    collected_text = ""
                    async for text in result.stream_text(delta=True):
                        collected_text += text
                        yield json.dumps({
                            "type": "text_chunk",
                            "content": text
                        })

                    # Wait for the result to complete (ensures tools have run)
                    await result.get_data()

                    # Update message history
                    self._message_history[conversation_id] = result.all_messages()

                # After streaming, check if the generate_visualization tool stored an image
                if deps.generated_image.get('success'):
                    yield json.dumps({
                        "type": "image",
                        "content": {
                            "image_data": deps.generated_image.get('image_data', ''),
                            "mime_type": deps.generated_image.get('mime_type', 'image/png'),
                            "title": deps.generated_image.get('title', 'BIPV Visualization')
                        }
                    })
                    yield json.dumps({"type": "done", "has_image": True})
                else:
                    # Done without image
                    yield json.dumps({"type": "done", "has_image": False})

            except Exception as agent_error:
                logger.error(f"Agent execution error: {agent_error}")
                # Fallback to direct Gemini call for image generation if agent fails
                # This maintains backward compatibility
                yield json.dumps({
                    "type": "text_chunk",
                    "content": "Let me try generating that for you..."
                })

                async for chunk in self._fallback_generate(query, conversation_id, images):
                    yield chunk

        except Exception as e:
            logger.error(f"BIPV Design agent error: {e}")
            yield json.dumps({
                "type": "error",
                "message": f"An error occurred: {str(e)}"
            })

    async def _fallback_generate(
        self,
        query: str,
        conversation_id: str,
        images: Optional[List[Image.Image]] = None
    ) -> AsyncGenerator[str, None]:
        """Fallback to direct Gemini API if Pydantic AI fails"""
        try:
            gemini_service = self._get_gemini_service()

            # Build full prompt with system context
            full_prompt = f"{DESIGN_AGENT_SYSTEM_PROMPT}\n\nUser request: {query}"

            result = gemini_service.generate_bipv_image(
                conversation_id=conversation_id,
                prompt=full_prompt,
                images=images
            )

            # Yield text response if any
            if result.get("text_response"):
                import re
                text_response = result["text_response"]
                text_response = re.sub(r'\s*\(?\s*(?:based on\s+)?image_\d+\.(?:png|jpg|jpeg)\s*\)?\s*', ' ', text_response, flags=re.IGNORECASE)
                text_response = re.sub(r'\s+', ' ', text_response).strip()

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
            else:
                yield json.dumps({"type": "done", "has_image": False})

        except Exception as e:
            logger.error(f"Fallback generation error: {e}")
            yield json.dumps({
                "type": "error",
                "message": f"An error occurred: {str(e)}"
            })

    def clear_conversation(self, conversation_id: str):
        """Clear conversation history"""
        try:
            # Clear Pydantic AI message history
            if conversation_id in self._message_history:
                del self._message_history[conversation_id]

            # Also clear Gemini session
            gemini_service = self._get_gemini_service()
            gemini_service.clear_session(conversation_id)
        except Exception as e:
            logger.error(f"Error clearing conversation {conversation_id}: {e}")

import os
from google import genai
from google.genai import types
from PIL import Image
import io


class BIPVEditor:
    def __init__(self):
        self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        self.model = "gemini-3-pro-image-preview"
        self.config = types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
            image_config=types.ImageConfig(
                aspect_ratio="16:9",
                image_size="2K",
            ),
        )
        self.contents = []  # Conversation history
    
    def _image_to_part(self, img: Image.Image) -> types.Part:
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
    
    def send(self, text: str, images: list[Image.Image] = None) -> Image.Image:
        """Send a message with optional images. Returns generated image."""
        
        # Build parts list
        parts = [types.Part.from_text(text=text)]
        if images:
            for img in images:
                parts.append(self._image_to_part(img))
        
        # Add user message to history
        self.contents.append(
            types.Content(role="user", parts=parts)
        )
        
        # Generate
        response = self.client.models.generate_content(
            model=self.model,
            contents=self.contents,
            config=self.config,
        )
        
        # Add model response to history
        self.contents.append(response.candidates[0].content)
        
        # Extract and return image
        result_image = None
        for part in response.parts:
            if part.text:
                print(part.text)
            if part.inline_data:
                result_image = part.as_image()
        
        return result_image
    
    def reset(self):
        """Clear conversation history"""
        self.contents = []


# === Usage ===
editor = BIPVEditor()

# Turn 1: With images
building = Image.open('building.jpg')
pv_module = Image.open('pv_module.png')

img1 = editor.send(
    "Create a BIPV visualization with panels on roof and facade",
    images=[building, pv_module]
)
img1.save("bipv_v1.png")

# Turn 2: Text-only edit
img2 = editor.send("Add panels to the east roof as well")
img2.save("bipv_v2.png")

# Turn 3: Another edit
img3 = editor.send("Make panels darker with subtle reflections")
img3.save("bipv_v3.png")

# Turn 4: Style change
img4 = editor.send("Give it photorealistic afternoon lighting")
img4.save("bipv_v4.png")
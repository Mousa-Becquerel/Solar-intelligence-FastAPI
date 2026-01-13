import os
from PIL import Image
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from google.genai import types

# === Pydantic Models for structured output ===
class BIPVResult(BaseModel):
    """Result of BIPV assistant"""
    response_type: str = Field(description="Either 'image_generated' or 'technical_answer'")
    content: str = Field(description="File path if image, or answer text if technical")
    suggestions: list[str] = Field(default_factory=list, description="Follow-up suggestions")


# === Dependencies ===
class BIPVDependencies(BaseModel):
    building_image_path: str
    pv_module_image_path: str
    output_dir: str = "./outputs"
    
    class Config:
        arbitrary_types_allowed = True


# === Image Generation Helper (direct Gemini API) ===
def generate_bipv_image(
    prompt: str,
    building_image: Image.Image,
    pv_module_image: Image.Image,
    aspect_ratio: str = "16:9",
    resolution: str = "2K"
) -> Image.Image | None:
    """Direct call to Gemini image generation API"""
    from google import genai
    
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[prompt, building_image, pv_module_image],
        config=types.GenerateContentConfig(
            response_modalities=['TEXT', 'IMAGE'],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
                image_size=resolution
            ),
        )
    )
    
    for part in response.parts:
        if part.inline_data is not None:
            return part.as_image()
    return None


# === Create the Agent ===
provider = GoogleProvider(api_key=os.environ.get("GEMINI_API_KEY"))
text_model = GoogleModel('gemini-2.5-flash', provider=provider)

bipv_agent = Agent(
    text_model,
    deps_type=BIPVDependencies,
    output_type=BIPVResult,
    system_prompt="""You are a BIPV (Building Integrated Photovoltaic) expert assistant.

    You have TWO capabilities:
    
    1. IMAGE GENERATION: When the user wants to visualize BIPV on a building
       - Use the `generate_visualization` tool
       - Specify placement areas: roof, facade, windows, shading
       
    2. TECHNICAL QUESTIONS: When the user asks about BIPV technical details
       - Use the `answer_technical_question` tool
       - Provide accurate, detailed technical information
    
    DECIDE which tool to use based on the user's request:
    - "Show me...", "Create...", "Visualize...", "Add panels..." → generate_visualization
    - "What is...", "How does...", "Explain...", "Compare..." → answer_technical_question
    
    Always be helpful and suggest follow-up actions.
    """
)


# === Tool 1: Generate BIPV Visualization ===
@bipv_agent.tool
async def generate_visualization(
    ctx: RunContext[BIPVDependencies],
    placement_areas: list[str],
    style_description: str,
    additional_instructions: str = ""
) -> str:
    """Generate a BIPV visualization image.
    
    Use this tool when the user wants to CREATE or VISUALIZE BIPV on a building.
    
    Args:
        placement_areas: Where to place PV panels. Options: roof, facade, windows, shading
        style_description: Visual style (photorealistic, architectural render, sketch, etc.)
        additional_instructions: Any extra requirements from the user
    """
    deps = ctx.deps
    
    # Load images
    building = Image.open(deps.building_image_path)
    pv_module = Image.open(deps.pv_module_image_path)
    
    # Build the prompt
    placement_str = ", ".join(placement_areas)
    prompt = f"""Create a {style_description} BIPV visualization for this building.
    
    Install PV panels on: {placement_str}
    
    Requirements:
    - Maintain architectural integrity and proportions
    - Match existing lighting conditions and shadows
    - Ensure realistic panel sizing and spacing
    - Professional quality rendering
    
    {additional_instructions}
    """
    
    # Generate image
    result_image = generate_bipv_image(prompt, building, pv_module)
    
    if result_image:
        os.makedirs(deps.output_dir, exist_ok=True)
        import time
        output_path = os.path.join(deps.output_dir, f"bipv_{int(time.time())}.png")
        result_image.save(output_path)
        return f"IMAGE_GENERATED|{output_path}|BIPV visualization with panels on {placement_str}"
    else:
        return "FAILED|Could not generate image. Please try again."


# === Tool 2: Answer Technical Questions ===
@bipv_agent.tool
async def answer_technical_question(
    ctx: RunContext[BIPVDependencies],
    question_topic: str,
    specific_question: str
) -> str:
    """Answer technical questions about BIPV systems.
    
    Use this tool when the user asks about technical details, costs, efficiency,
    installation, regulations, or comparisons related to BIPV.
    
    Args:
        question_topic: The main topic (efficiency, cost, installation, materials, regulations, comparison)
        specific_question: The user's specific question
    """
    
    # Knowledge base for BIPV technical information
    knowledge_base = {
        "efficiency": """
        BIPV Efficiency Information:
        - Monocrystalline BIPV: 18-22% efficiency
        - Polycrystalline BIPV: 15-18% efficiency  
        - Thin-film BIPV: 10-13% efficiency
        - Semi-transparent BIPV (windows): 5-10% efficiency
        
        Factors affecting efficiency:
        - Orientation: South-facing optimal in Northern Hemisphere
        - Tilt angle: Latitude ± 15° for best annual yield
        - Shading: Even partial shading significantly reduces output
        - Temperature: Efficiency decreases ~0.4%/°C above 25°C
        - BIPV facade vs rooftop: Facades typically 30-40% less efficient due to suboptimal angle
        """,
        
        "cost": """
        BIPV Cost Information:
        - BIPV roofing: $15-25 per watt installed
        - BIPV facades: $20-35 per watt installed
        - BIPV windows: $50-100 per square meter
        - Traditional PV panels: $2.50-4 per watt installed
        
        Cost factors:
        - BIPV replaces building materials (offset cost)
        - Custom sizing increases cost
        - Installation complexity
        - Building permits and structural requirements
        
        ROI typically: 10-20 years depending on location and electricity prices
        """,
        
        "installation": """
        BIPV Installation Considerations:
        
        Roof Integration:
        - Replace conventional roofing materials
        - Ensure waterproofing and ventilation
        - Load-bearing capacity check required
        
        Facade Integration:
        - Ventilated facade systems recommended
        - Cable management within wall cavity
        - Consider thermal expansion
        
        Window Integration:
        - Semi-transparent modules (5-40% transparency)
        - Double/triple glazing integration
        - Balance daylighting vs energy generation
        
        General Requirements:
        - Structural engineer approval
        - Electrical certification
        - Building permit (varies by jurisdiction)
        - Grid connection agreement
        """,
        
        "materials": """
        BIPV Materials and Types:
        
        1. Crystalline Silicon BIPV:
           - Most efficient, most common
           - Opaque, best for roofs
           
        2. Thin-Film BIPV (CdTe, CIGS, a-Si):
           - Flexible, can be curved
           - Lower efficiency but better in low light
           - Good for complex facades
           
        3. Organic PV (OPV):
           - Emerging technology
           - Semi-transparent possible
           - Lower durability currently
           
        4. Perovskite:
           - Emerging, high potential
           - Can be semi-transparent
           - Stability challenges being addressed
           
        Common BIPV Products:
        - Solar roof tiles (Tesla, GAF, CertainTeed)
        - Solar facades (Onyx Solar, Polysolar)
        - Solar windows (Ubiquitous Energy, ClearVue)
        """,
        
        "regulations": """
        BIPV Regulations and Standards:
        
        Key Standards:
        - IEC 61215: Crystalline silicon module design qualification
        - IEC 61646: Thin-film module design qualification
        - IEC 61730: PV module safety qualification
        - EN 50583: BIPV specific standard (Europe)
        
        Building Codes:
        - Must meet fire safety requirements
        - Structural load requirements
        - Electrical safety codes (NEC in US)
        - Local planning permission
        
        Incentives (vary by location):
        - Federal tax credits (US: 30% ITC)
        - Feed-in tariffs
        - Net metering
        - Green building certifications (LEED, BREEAM points)
        """,
        
        "comparison": """
        BIPV vs Traditional PV Comparison:
        
        | Aspect          | BIPV              | Traditional PV    |
        |-----------------|-------------------|-------------------|
        | Cost/Watt       | $15-35            | $2.50-4           |
        | Aesthetics      | Integrated        | Add-on            |
        | Efficiency      | 10-22%            | 18-22%            |
        | Installation    | During build      | Retrofit          |
        | Material offset | Yes               | No                |
        | Flexibility     | High              | Limited           |
        
        When to choose BIPV:
        - New construction or major renovation
        - Aesthetics are important
        - Limited roof space (use facades)
        - Premium building market
        
        When to choose traditional PV:
        - Retrofit on existing building
        - Maximum energy output priority
        - Budget constraints
        """
    }
    
    # Find relevant information
    topic_lower = question_topic.lower()
    
    relevant_info = ""
    for key, value in knowledge_base.items():
        if key in topic_lower or topic_lower in key:
            relevant_info = value
            break
    
    if not relevant_info:
        # Default: combine all relevant info
        relevant_info = "General BIPV Information:\n"
        for key, value in knowledge_base.items():
            if any(word in specific_question.lower() for word in key.split()):
                relevant_info += value + "\n"
    
    if not relevant_info:
        relevant_info = knowledge_base["comparison"]  # Default fallback
    
    return f"TECHNICAL_ANSWER|{question_topic}|{relevant_info}"


# === Result Parser (optional helper) ===
def parse_tool_result(result: str) -> dict:
    """Parse the tool result string"""
    parts = result.split("|")
    if parts[0] == "IMAGE_GENERATED":
        return {
            "type": "image",
            "path": parts[1],
            "description": parts[2] if len(parts) > 2 else ""
        }
    elif parts[0] == "TECHNICAL_ANSWER":
        return {
            "type": "technical",
            "topic": parts[1],
            "answer": parts[2] if len(parts) > 2 else ""
        }
    else:
        return {"type": "error", "message": result}


# === Usage ===
async def main():
    deps = BIPVDependencies(
        building_image_path="Building.jpg",
        pv_module_image_path="Module.png",
        output_dir="./bipv_outputs"
    )
    
    print("=" * 60)
    print("BIPV Assistant Ready")
    print("=" * 60)
    
    # Example 1: Technical Question
    print("\n[User]: What's the efficiency of different BIPV types?")
    result = await bipv_agent.run(
        "What's the efficiency of different BIPV types?",
        deps=deps
    )
    print(f"[Assistant]: {result.output}")
    
    # Example 2: Image Generation
    print("\n[User]: Create a visualization with panels on the roof")
    result = await bipv_agent.run(
        "Create a BIPV visualization with panels on the roof. Make it photorealistic.",
        deps=deps
    )
    print(f"[Assistant]: {result.output}")
    
    # Example 3: Follow-up Technical Question
    print("\n[User]: How much would this installation cost?")
    result = await bipv_agent.run(
        "How much would a BIPV roof installation typically cost?",
        deps=deps,
        message_history=result.all_messages()
    )
    print(f"[Assistant]: {result.output}")
    
    # Example 4: Another Visualization
    print("\n[User]: Now add panels to the facade too")
    result = await bipv_agent.run(
        "Now also add BIPV panels to the south-facing facade",
        deps=deps,
        message_history=result.all_messages()
    )
    print(f"[Assistant]: {result.output}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())


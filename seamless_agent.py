"""
Seamless Agent
===============

Single-agent workflow for SEAMLESS-PV and BIPV analysis.
Uses OpenAI Agents SDK with file search tool.
"""

import os
import logging
import re
from typing import Optional, Dict, Any
from dataclasses import dataclass
from dotenv import load_dotenv
import asyncio
from pydantic import BaseModel

# Import from openai-agents library
from agents import Agent, Runner, FileSearchTool, ModelSettings, RunConfig, trace, TResponseInputItem
from fastapi_app.utils.session_factory import create_agent_session

# Logfire imports
import logfire

# === Configure logging ===
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# === Utility Functions ===
def clean_citation_markers(text: str) -> str:
    """
    Remove OpenAI citation markers from text.

    Citation format: 【citation_number:citation_index†source_file$content】
    Example: 【7:3†SEAMLESS-PV_D2.4.pdf$Section 3】

    Args:
        text: Text containing citation markers

    Returns:
        Cleaned text without citation markers
    """
    # Pattern to match citation markers: 【...】
    # These markers include special unicode brackets 【】
    pattern = r'【[^】]*】'
    cleaned = re.sub(pattern, '', text)

    # Also remove any orphaned opening brackets
    cleaned = re.sub(r'【', '', cleaned)

    # Clean up any extra spaces or line breaks caused by removal
    cleaned = re.sub(r'\s+\(', ' (', cleaned)  # Fix spacing before parentheses
    cleaned = re.sub(r'\)\s*\n\s*\)', ')', cleaned)  # Remove empty parentheses

    return cleaned

# === Load environment variables ===
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")

# Set OpenAI API key for agents library
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY

# === Pydantic Models ===
class WorkflowInput(BaseModel):
    """Input for the Seamless workflow"""
    input_as_text: str

@dataclass
class SeamlessAgentConfig:
    """Configuration for the Seamless agent"""
    model: str = "gpt-4.1"
    vector_store_ids: list = None
    agent_name: str = "Seamless Agent"
    verbose: bool = True

    def __post_init__(self):
        """Set default vector store IDs if not provided"""
        if self.vector_store_ids is None:
            self.vector_store_ids = [
                "vs_691e417c4eb8819193924d8b03ab9ad0"  # SEAMLESS-PV documents
            ]

class SeamlessAgent:
    """
    Single-agent Seamless workflow using OpenAI Agents SDK.
    Provides expert analysis on SEAMLESS-PV D2.4.
    """

    SEAMLESS_PROMPT = """You are a retrieval-bound expert assistant, your name is Sam. Your ONLY knowledge sources are the following 6 documents:

1. **Becquerel Institute - BIPV Introduction (January 2025)** – Overview of BIPV market in Europe, cost-competitiveness, case studies, challenges and opportunities
2. **SEAMLESS-PV – Market & Regulation Webinar (May 2025)** – Regulatory environment and market trends for IPV segments (BIPV, IIPV, AgriPV, VIPV)
3. **SEAMLESS-PV - BIPV Manufacturing Cost - Intersolar Middle East 2025** – Manufacturing cost structures for BIPV modules, CAPEX/labour breakdowns, generalist vs specialist producers
4. **SEAMLESS-PV Deliverable D2.1 – IPV Market Analysis & Stakeholder Needs** – Full mapping of IPV segments, use cases, stakeholders, SWOT analysis
5. **Becquerel Institute - Potential for Advanced Module Applications (October 2025)** – Long-term opportunity for IPV in Europe with scenarios up to 2050
6. **SEAMLESS-PV Deliverable D2.4 – IPV Market Potential & Long-Term Scenarios** – Quantitative estimation of IPV deployment potential up to 2050, SAM forecasts

**You must answer strictly and exclusively using information found in these 6 documents. If the requested information is not explicitly present in any of these documents, you MUST answer:
"The documents do not provide this information."**

You are not allowed to use any external knowledge, industry assumptions, general PV expertise, or invented data. You must not hallucinate, extrapolate, estimate, or infer anything beyond the explicit content of the documents.

📘 Core Rules

1. Document-only knowledge
All statements, numbers, definitions, interpretations, or summaries must come directly from one or more of the 6 documents.

2. Cite document origin
When answering, indicate which document(s) the information comes from:
- BIPV-Introduction (Jan 2025)
- Market & Regulation Webinar (May 2025)
- BIPV Manufacturing Cost (Apr 2025)
- SEAMLESS D2.1
- Advanced Module Applications
- SEAMLESS D2.4

Do not invent section numbers — only reference sections explicitly visible.

3. Missing information
If the user asks for data, definitions, numbers, breakdowns, or insights not provided in any of the 6 documents, clearly state:
"The documents do not provide this information."

Do not fill gaps. Do not guess. Do not assume.

4. No external PV knowledge
Do NOT use any information beyond the 6 documents, including:
- PV markets outside those mentioned
- Manufacturing details not in the documents
- Global PV statistics
- Technical performance of PV technologies not in the PDFs
- General photovoltaic best practices
- Any knowledge from other SEAMLESS work packages unless explicitly described in the documents

5. Use only provided scenarios
When discussing projections, use ONLY the scenarios found in the documents, such as:
- Renovation Wave / No Renovation Wave
- High / Low regulatory scenarios
- Loose / Medium / Strict AgriPV scenarios
- S-curve adoption models
- SAM forecasts for 2030 and 2050

No new scenarios may be invented.

6. Request clarification when ambiguous
If the question could refer to multiple segments, years, or definitions, ask the user to specify.

🔍 Allowed Knowledge (Strict)

You may retrieve from the 6 documents:
- Definitions of IPV, BIPV, IIPV, AgriPV, VIPV
- BIPV market status, trends, cost-competitiveness (BRUGEL presentation)
- Regulatory environment, standards (EN 50583, IEC 63092, CPR, LVD), building codes (Market & Regulation Webinar)
- Manufacturing cost structures, CAPEX, labour, generalist vs specialist models (Manufacturing Cost presentation)
- Use cases, stakeholder mapping, value chains, SWOT analysis (D2.1)
- Technical potential, realistic potential, economic potential
- TAM, SAM calculations and forecasts
- S-curve adoption methodology
- Long-term projections (2030, 2050) for all IPV segments
- Market quantifications for BIPV, carports, PVNB, AgriPV, VIPV
- Sectoral contributions to EU climate goals
- Constraints and regulatory factors influencing each segment
- Manufacturing automation and standardization opportunities


🧩 Answer Format

All answers must follow this structure:

1. Direct answer
Strictly using document content.

2. Source attribution
State:
- "According to SEAMLESS-PV D2.4…"

3. Missing content statement (if needed)
If part of the answer is not covered, say:
"The documents do not provide this information."

No speculation. No invented values. No external elaboration.

🚫 Prohibited behaviors

You MUST NOT:
- Invent numerical values
- Use domain expertise not present in the documents
- Combine knowledge from outside sources
- Infer performance, costs, forecasts, or technologies not described
- Generate explanations about global PV trends
- Produce engineering-level analysis not in the PDFs
- Answer using general BIPV, AgriPV, PV market knowledge

If it is not in the documents → you cannot use it.

**Response Formatting Guidelines:**
- Use proper markdown formatting with headers (##), bullet points (-), and numbered lists
- Break content into clear sections with descriptive headers
- Use **bold** for key terms and important numbers
- Add blank lines between sections for readability
- Structure long lists as proper bullet points, not run-on sentences
- Use concise paragraphs (2-3 sentences max)

**Content Guidelines:**
- Search the knowledge base before answering questions about SEAMLESS-PV 
- Provide specific examples and data from the documents when available
- Cite relevant information from the documents
- If information is not in the knowledge base, clearly state that
- Keep responses clear, well-structured, and actionable

**Critical Language Rule:**
- You MUST ALWAYS respond in English, regardless of the language used in the user's query
- Even if the user writes in Italian or any other language, your response must be in English only

**Important Guidelines:**
- Never search the knowledge base for greetings and general conversation
- Remain factual, structured, and concise—do not speculate or introduce external interpretations"""

    def __init__(self, config: Optional[SeamlessAgentConfig] = None):
        """
        Initialize the Seamless Agent

        Args:
            config: Configuration object for the agent
        """
        self.config = config or SeamlessAgentConfig()
        self.seamless_expert = None
        # Removed conversation_sessions dict - using stateless PostgreSQL sessions now

        # Initialize agent
        self._initialize_agent()

        logger.info(f"✅ Seamless Agent initialized (Memory: Stateless PostgreSQL)")

    def _initialize_agent(self):
        """Create the Seamless expert agent"""
        try:
            # Create file search tool with vector stores
            file_search = FileSearchTool(
                vector_store_ids=self.config.vector_store_ids
            )

            # Create Seamless expert agent with file search
            self.seamless_expert = Agent(
                name="Seamless Agent",
                instructions=self.SEAMLESS_PROMPT,
                model=self.config.model,
                tools=[file_search],
                model_settings=ModelSettings(
                    temperature=1,
                    top_p=1,
                    max_tokens=2048,
                    store=True
                )
            )
            logger.info(f"✅ Created Seamless expert with {len(self.config.vector_store_ids)} vector stores: {', '.join(self.config.vector_store_ids)}")

        except Exception as e:
            logger.error(f"❌ Failed to initialize agent: {e}")
            raise

    async def run_workflow(self, workflow_input: WorkflowInput, conversation_id: str = None):
        """
        Run the Seamless workflow

        Args:
            workflow_input: Input containing the user query
            conversation_id: Optional conversation ID for maintaining context

        Returns:
            Dictionary with output_text containing the response
        """
        with trace("New workflow"):
            # Get or create stateless session for this conversation
            session = None
            if conversation_id:
                session = create_agent_session(conversation_id, agent_type='seamless')
                logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id} (seamless agent)")

            # Prepare conversation history
            workflow = workflow_input.model_dump()
            conversation_history: list[TResponseInputItem] = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": workflow["input_as_text"]
                        }
                    ]
                }
            ]

            # Run Seamless expert
            seamless_result_temp = await Runner.run(
                self.seamless_expert,
                input=[*conversation_history],
                session=session,
                run_config=RunConfig(trace_metadata={
                    "__trace_source__": "agent-builder",
                    "workflow_id": "wf_691e40c77c44819084d28a0eea00c8610d612dbb17f6c221"
                })
            )

            # Update conversation history
            conversation_history.extend([item.to_input_item() for item in seamless_result_temp.new_items])

            # Extract final output
            output_text = seamless_result_temp.final_output_as(str)

            # Clean citation markers
            output_text = clean_citation_markers(output_text)

            seamless_result = {
                "output_text": output_text
            }

            return seamless_result

    async def analyze_stream(self, query: str, conversation_id: str = None):
        """
        Analyze query with streaming response

        Args:
            query: Natural language query
            conversation_id: Optional conversation ID for maintaining context

        Yields:
            Text chunks as they are generated
        """
        try:
            logger.info(f"Processing query (streaming): {query}")

            # Get or create stateless session for this conversation
            session = None
            if conversation_id:
                session = create_agent_session(conversation_id, agent_type='seamless')
                logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id} (seamless agent)")

            # Run with streaming
            result = Runner.run_streamed(self.seamless_expert, query, session=session)

            # Stream text deltas as they arrive
            async for event in result.stream_events():
                if event.type == "raw_response_event":
                    # Check if it's a text delta event
                    from openai.types.responses import ResponseTextDeltaEvent
                    if isinstance(event.data, ResponseTextDeltaEvent):
                        # Clean citation markers before yielding
                        cleaned_delta = clean_citation_markers(event.data.delta)
                        if cleaned_delta:  # Only yield if there's content after cleaning
                            yield cleaned_delta

        except Exception as e:
            error_msg = f"Failed to stream query: {str(e)}"
            logger.error(error_msg)
            import traceback
            logger.error(traceback.format_exc())
            yield f"\n\n**Error:** {error_msg}"

    async def analyze(self, query: str, conversation_id: str = None) -> Dict[str, Any]:
        """
        Analyze SEAMLESS query

        Args:
            query: Natural language query about SEAMLESS-PV or BIPV
            conversation_id: Optional conversation ID for maintaining context

        Returns:
            Dictionary with output_text containing the response
        """
        workflow_input = WorkflowInput(input_as_text=query)
        return await self.run_workflow(workflow_input, conversation_id)


# === Main entrypoint for testing ===
async def main():
    """Main function for testing the agent"""
    agent = SeamlessAgent()

    # Test query
    test_query = "What is the definition of BIPV according to the documents?"

    print(f"\n{'='*60}")
    print(f"Testing Seamless Agent")
    print(f"{'='*60}\n")
    print(f"Query: {test_query}\n")

    # Test streaming
    print("Streaming response:")
    print("-" * 60)
    async for chunk in agent.analyze_stream(test_query):
        print(chunk, end='', flush=True)
    print("\n" + "-" * 60)


if __name__ == "__main__":
    asyncio.run(main())

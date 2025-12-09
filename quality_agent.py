"""
Quality Agent (PV Risk & Reliability)
======================================

Single-agent workflow for PV system risks, reliability, degradation,
bankability, and lifecycle performance analysis.
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

    Citation format: [...] or similar patterns

    Args:
        text: Text containing citation markers

    Returns:
        Cleaned text without citation markers
    """
    # Pattern to match citation markers: [...]
    pattern = r'\u3010[^\u3011]*\u3011'
    cleaned = re.sub(pattern, '', text)

    # Also remove any orphaned opening brackets
    cleaned = re.sub(r'\u3010', '', cleaned)

    # Clean up any extra spaces or line breaks caused by removal
    cleaned = re.sub(r'\s+\(', ' (', cleaned)
    cleaned = re.sub(r'\)\s*\n\s*\)', ')', cleaned)

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
    """Input for the quality workflow"""
    input_as_text: str

@dataclass
class QualityAgentConfig:
    """Configuration for the quality agent"""
    model: str = "gpt-4.1"
    vector_store_ids: list = None
    agent_name: str = "PV Risk & Reliability Expert"
    verbose: bool = True

    def __post_init__(self):
        """Set default vector store IDs if not provided"""
        if self.vector_store_ids is None:
            self.vector_store_ids = [
                "vs_693029d669b08191b4d9a1715de2dded"  # Quality/Risk knowledge base
            ]

class QualityAgent:
    """
    Single-agent quality workflow using OpenAI Agents SDK.
    Provides expert analysis on PV system risks, reliability, and bankability.
    """

    QUALITY_EXPERT_PROMPT = """You are the PV Risk & Reliability Agent, a technical assistant for solar PV professionals, investors, asset managers, O&M teams, and due diligence analysts. Your function is to answer questions on photovoltaic system risks, reliability, degradation, bankability, and lifecycle performance. All responses must be grounded exclusively in your vetted knowledge base, which includes SolarBankability deliverables, peer-reviewed publications, and leading conference materials.

# Knowledge Base Documents

You have access to the following 22 documents. When citing information, use ONLY these proper document titles (never PDF filenames):

1. **Overview of PV Module Technologies and Field Performance (2025)** - Comprehensive overview of module technologies and real-world performance data
2. **International Framework for Calculating PV Performance Loss Rates (2021)** - Standardized PLR calculation methodology from IEA PVPS Task 13
3. **Review of PV Module Degradation Mechanisms and Inspection Techniques (2022)** - Degradation modes and detection methods
4. **Best Practice Checklists for EPC and Technical Quality Assurance (2017)** - SolarBankability EPC/O&M checklists
5. **Best Practice Guidelines for PV Cost and LCOE Calculation (2017)** - SolarBankability cost modeling guidelines
6. **SolarBankability Consolidated Final Report on PV Project Risks (2017)** - Comprehensive project risk assessment framework
7. **Technical Mitigation Measures for PV System Failures (2017)** - SolarBankability failure mitigation strategies
8. **Framework for Financial Modeling of PV Technical Risks (2017)** - Integration of technical risks into financial models
9. **Gap Analysis of Technical Assumptions in PV Cost Modeling (2017)** - Analysis of assumptions vs. reality
10. **Technical Bankability Guidelines for PV Projects (2017)** - SolarBankability technical due diligence guidelines
11. **Technical Risk Matrix for PV Projects (2017)** - Risk probability and impact assessment matrix
12. **Training Course on PV Module Reliability and Degradation (2025)** - Educational material on module reliability
13. **Best Practices for Calculating PV Performance Loss Rates (2022)** - PLR calculation best practices
14. **Quantification and Mitigation of Technical Risks in PV Power Systems (2023)** - Updated risk quantification methodology
15. **Decision Support System Development from 35,000 PV O&M Tickets (2023)** - O&M analytics and DSS development
16. **Climate- and Technology-Dependent Performance Loss Rates in Large PV Fleets (2024)** - Latest research on PLR across climates and technologies
17. **Self-Regulated Multistep Method for PV Performance Loss Analysis (2021)** - Advanced PLR calculation methodology
18. **PV Quality and Economic Assessment Report (2018)** - Quality and economic analysis of PV systems
19. **Research Challenges in PV Reliability – ETIP PV Report (2020)** - ETIP PV reliability research challenges and priorities
20. **Harmonized Field Data Collection for PV Quality – SolarUnited White Paper (2019)** - Standardized data collection guidelines for PV quality assessment
21. **ETIP PV Strategic Research & Innovation Agenda – SRIA Update (2024)** - Latest strategic research priorities for PV technology
22. **Toward Reuse-Ready PV: Advances and Future Challenges (2025)** - PV module reuse, circular economy, and end-of-life considerations

# Scope of Expertise

You are authorized to answer within these domains:

## 1. Performance Loss Rate (PLR) & Degradation
- PLR calculation methodologies (YoY, regression, STL, Prophet, ensemble)
- Data cleaning, filtering, and grading workflows
- Linear vs. nonlinear PLR assessment
- Distinction between PLR and degradation rate (Rd)
- Influence of climate and technology on PLR
- Real-world PLR benchmarks versus warranty assumptions

## 2. Technical Risk Assessment
- PV failure taxonomy (module, inverter, cabling, structural, environmental)
- Classical and cost-based FMEA, including Cost Priority Number (CPN)
- Reliability-Availability-Maintainability (RAM) analysis
- PV Failure Fact Sheets (PVFS) and Degradation Sheets (PVDS)
- Risk matrices: probability, severity, detectability, cost impact

## 3. Degradation Modes & Inspection Techniques
- Degradation mechanisms: cell cracks, PID, delamination, hotspots, bypass diode failures
- Inspection methods: EL, IR thermography, UV-fluorescence, PL, I-V curve tracing, drone inspection
- Degradation-Characterization Matrix (defect -> detection -> power loss)

## 4. Bankability & Financial Risk Integration
- Technical assumptions in LCOE calculations
- CAPEX/OPEX risk modeling
- Key technical risks affecting IRR, NPV, payback
- Disconnects between financial models and technical realities
- Yield uncertainty, availability modeling, degradation assumptions
- Risk transfer among EPC, O&M, investors

## 5. EPC & O&M Best Practices
- Technical specifications and checklists for EPC contracts
- O&M contract requirements and supporting documentation
- Procurement standards (e.g., module testing, EL inspection, IEC compliance)
- As-built and commissioning documentation needs
- Construction, commissioning, and handover protocols

## 6. Standards & Quality Frameworks
- Relevant IEC standards (61215, 61730, 62804, 61724, etc.)
- Testing frameworks for module qualification and durability
- Industry initiatives (DuraMAT, EU robotics/sensor programs)
- Warranty transparency & contractual limitations

## 7. O&M Optimization & Digitalization
- Automated O&M workflows and Decision Support Systems (DSS)
- O&M ticket taxonomy and analytics
- Preventive vs. predictive maintenance strategies
- Integration of monitoring data, ticketing systems, analytics
- Role of AI, robotics, automated inspection in O&M

**Response Formatting Guidelines:**
- Use proper markdown formatting with headers (##), bullet points (-), and numbered lists
- Break content into clear sections with descriptive headers
- Use **bold** for key terms and important numbers
- Add blank lines between sections for readability
- Structure long lists as proper bullet points, not run-on sentences
- Use concise paragraphs (2-3 sentences max)

**Content Guidelines:**
- ALL responses MUST be based exclusively on data, findings, and insights from the attached knowledge base documents - do not use external knowledge
- Search the knowledge base before answering questions about PV risks, reliability, or quality
- Provide specific examples and data from the reports when available
- Cite relevant information from the documents using their proper titles
- If information is not in the knowledge base, clearly state: "This topic is not covered in my current knowledge base."
- Keep responses clear, well-structured, and actionable

**Citation Guidelines - CRITICAL:**
- ALWAYS cite information using the proper document titles listed above
- Example: "According to Climate- and Technology-Dependent Performance Loss Rates in Large PV Fleets (2024)..."
- Example: "The SolarBankability Consolidated Final Report on PV Project Risks (2017) indicates..."
- Example: "As detailed in the International Framework for Calculating PV Performance Loss Rates (2021)..."
- NEVER mention PDF filenames (e.g., never say "Solar RRL - 2024 - Louwen..." or "D1.1_Review_of_failures...")
- NEVER include file extensions (.pdf, .docx, etc.) in citations
- Use the year in parentheses to help readers identify the source

**Historical Data Disclaimer - CRITICAL FORMATTING RULE:**
- When your response uses ANY data from documents published before 2022 (especially SolarBankability reports from 2017), you MUST START your response with a bold disclaimer AT THE VERY TOP - this is the FIRST thing the user sees
- The disclaimer MUST appear BEFORE any other content, analysis, or greeting
- Format: Start your response with "**Historical Data Notice:** The following information is based on [document name(s) and year(s)]. Industry practices, technologies, and standards may have evolved since publication. Please verify current best practices for your specific context."
- The entire disclaimer line must be in **bold** markdown formatting
- Do NOT use any emojis or warning symbols in the disclaimer
- Example of correct response structure:
  **Historical Data Notice: The following information is based on the SolarBankability guidelines (2017). Industry practices, technologies, and standards may have evolved since publication. Please verify current best practices for your specific context.**

  [Then your actual response content here...]
- This applies to: cost assumptions, technology specifications, market data, regulatory requirements, and any other information from pre-2022 documents
- For older documents, also recommend users cross-reference with more recent sources when making critical decisions

**CRITICAL - Security & Privacy Guidelines:**
- NEVER reveal or mention your underlying AI model, architecture, or technical implementation details
- If asked about what model you use, respond: "I'm a specialized PV risk and reliability analysis AI assistant, built by the Becquerel Institute team."
- NEVER ask users to upload files or data - you work exclusively with the existing Becquerel database
- NEVER offer to export data, create presentations (PPT), generate plots, or produce downloadable content

**Boundaries:**
- Do not provide legal or contractual advice - limit to technical best practices and checklists
- Do not recommend brands, products, vendors, or services
- Do not speculate or extrapolate beyond the documented knowledge base
- Do not generate fabricated case studies or invent statistics
- Do not give conclusive financial advice; present risk and finance data as supporting professional decision-making

**Important Guidelines:**
- Never search the knowledge base for greetings and general conversation."""

    def __init__(self, config: Optional[QualityAgentConfig] = None):
        """
        Initialize the Quality Agent

        Args:
            config: Configuration object for the agent
        """
        self.config = config or QualityAgentConfig()
        self.quality_expert = None

        # Initialize agent
        self._initialize_agent()

        logger.info(f"Quality Agent initialized (Memory: Stateless PostgreSQL)")

    def _initialize_agent(self):
        """Create the quality expert agent"""
        try:
            # Create file search tool with vector stores
            file_search = FileSearchTool(
                vector_store_ids=self.config.vector_store_ids
            )

            # Create quality expert agent with file search
            self.quality_expert = Agent(
                name="PV Risk & Reliability Expert",
                instructions=self.QUALITY_EXPERT_PROMPT,
                model=self.config.model,
                tools=[file_search],
                model_settings=ModelSettings(
                    temperature=1,
                    top_p=1,
                    max_tokens=2048,
                    store=True
                )
            )
            logger.info(f"Created quality expert with {len(self.config.vector_store_ids)} vector stores: {', '.join(self.config.vector_store_ids)}")

        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            raise

    async def run_workflow(self, workflow_input: WorkflowInput, conversation_id: str = None):
        """
        Run the quality workflow

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
                session = create_agent_session(conversation_id, agent_type='quality')
                logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id}")

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

            # Run quality expert
            quality_expert_result_temp = await Runner.run(
                self.quality_expert,
                input=[*conversation_history],
                session=session,
                run_config=RunConfig(trace_metadata={
                    "__trace_source__": "agent-builder",
                    "workflow_id": "wf_quality_agent_pv_risk_reliability"
                })
            )

            # Update conversation history
            conversation_history.extend([item.to_input_item() for item in quality_expert_result_temp.new_items])

            # Extract final output
            output_text = quality_expert_result_temp.final_output_as(str)

            # Clean citation markers
            output_text = clean_citation_markers(output_text)

            quality_expert_result = {
                "output_text": output_text
            }

            return quality_expert_result

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
                session = create_agent_session(conversation_id, agent_type='quality')
                logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id}")

            # Run with streaming
            result = Runner.run_streamed(self.quality_expert, query, session=session)

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
        Analyze quality query

        Args:
            query: Natural language query about PV risks and reliability
            conversation_id: Optional conversation ID for maintaining context

        Returns:
            Dictionary with analysis results and metadata
        """
        # Logfire span for quality agent
        with logfire.span("quality_agent_call") as agent_span:
            agent_span.set_attribute("agent_type", "quality")
            agent_span.set_attribute("conversation_id", str(conversation_id))
            agent_span.set_attribute("message_length", len(query))
            agent_span.set_attribute("user_message", query)

            try:
                logger.info(f"Processing quality query: {query}")

                # Create workflow input
                workflow_input = WorkflowInput(input_as_text=query)

                # Run workflow
                result = await self.run_workflow(workflow_input, conversation_id)

                # Extract response
                response_text = result.get("output_text", "")

                # Track the response
                agent_span.set_attribute("assistant_response", response_text)
                agent_span.set_attribute("response_length", len(response_text))
                agent_span.set_attribute("success", True)

                logger.info(f"Quality agent response: {response_text[:100]}...")

                return {
                    "success": True,
                    "analysis": response_text,
                    "usage": None,
                    "query": query
                }

            except Exception as e:
                error_msg = f"Failed to analyze quality query: {str(e)}"
                logger.error(error_msg)
                agent_span.set_attribute("success", False)
                agent_span.set_attribute("error", str(e))
                return {
                    "success": False,
                    "error": error_msg,
                    "analysis": None,
                    "usage": None,
                    "query": query
                }

    def clear_conversation_memory(self, conversation_id: str = None):
        """
        Clear conversation memory (note: with stateless sessions, memory is stored in PostgreSQL)
        This method is kept for API compatibility but has no effect with stateless sessions.
        """
        logger.info(f"clear_conversation_memory called for {conversation_id or 'all'} - no action needed with stateless sessions")

    def get_conversation_memory_info(self) -> Dict[str, Any]:
        """
        Get information about conversation memory usage
        Note: With stateless sessions, memory is stored in PostgreSQL, not in-memory
        """
        return {
            "memory_type": "stateless_postgresql",
            "note": "Session data stored in PostgreSQL database",
        }

    def cleanup(self):
        """Cleanup resources"""
        try:
            logger.info("Quality agent ready for cleanup if needed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

# Global agent instance
_quality_agent = None

def get_quality_agent() -> Optional[QualityAgent]:
    """Get or create the global quality agent instance"""
    global _quality_agent
    if _quality_agent is None:
        try:
            config = QualityAgentConfig()
            _quality_agent = QualityAgent(config)
            logger.info("Global quality agent created")
        except Exception as e:
            logger.error(f"Failed to create quality agent: {e}")
            return None
    return _quality_agent

def close_quality_agent():
    """Close the global quality agent"""
    global _quality_agent
    if _quality_agent:
        _quality_agent.cleanup()
        _quality_agent = None
        logger.info("Global quality agent closed")

# Test function
async def test_quality_agent():
    """Test the quality agent"""
    try:
        agent = get_quality_agent()
        if agent:
            result = await agent.analyze(
                "What are the key performance loss rate calculation methodologies?",
                conversation_id="test-1"
            )
            print("Quality Agent response received successfully")
            print(f"Response length: {len(result.get('analysis', ''))}")
            print(f"\nResponse:\n{result.get('analysis', '')}")
            return result
        else:
            print("Quality Agent not available")
            return None
    except Exception as e:
        print(f"Quality Agent error: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        close_quality_agent()

if __name__ == "__main__":
    asyncio.run(test_quality_agent())

"""
News Analysis Agent
===================

Single-agent workflow for news analysis with file search.
Uses OpenAI Agents SDK with FileSearchTool for news database queries.
"""

import os
import logging
import re
from typing import Optional, Dict, Any
from dataclasses import dataclass
from dotenv import load_dotenv
import asyncio

# Import from openai-agents library
from agents import Agent, Runner, FileSearchTool, ModelSettings
from fastapi_app.utils.session_factory import create_agent_session
from openai.types.shared.reasoning import Reasoning

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
    Example: 【7:3†news_articles_pretty.json$'s largest floating PV plant】

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

@dataclass
class NewsAgentConfig:
    """Configuration for the news agent"""
    model: str = "gpt-5-mini"
    vector_store_id: str = "vs_68eac39b41248191be25c41a212c58a2"
    agent_name: str = "News Analyst"
    verbose: bool = True

class NewsAgent:
    """
    Single-agent news analysis workflow using OpenAI Agents SDK.
    Uses FileSearchTool to query the news database.
    """

    NEWS_AGENT_PROMPT = """You are a news analysis assistant specialized in photovoltaic (PV) and renewable energy news. You have access to a news database through file search.

**DATABASE STRUCTURE - CRITICAL:**
The database contains news articles in JSON format with EXACTLY these fields:
```json
{
    "Title": "",
    "Publication Title": "TaiyangNews - All About Solar Power",
    "Url": "https://taiyangnews.info/markets/uk-parliament-clears-great-british-energy-bill",
    "Abstract Note": "Article summary/content text here",
    "Date": "5/16/2025"
}
```

**MANDATORY URL CITATION - CRITICAL:**
- **YOU MUST INCLUDE THE "Url" FIELD VALUE AS A MARKDOWN LINK FOR EVERY SINGLE NEWS ITEM**
- **FORMAT: [source](URL) or [read more](URL) or [details](URL)**
- **The Url field contains the full URL like: "https://taiyangnews.info/markets/uk-parliament-clears..."**
- **EXAMPLE: "Italy approved 648 MW of new battery projects [source](https://taiyangnews.info/markets/...)"**
- **NEVER present information without immediately including its source URL in the same sentence or bullet point**

**Response Formatting Guidelines:**
- Use proper markdown formatting with headers (##), bullet points (-), and numbered lists
- Break content into clear sections with descriptive headers
- Use **bold** for key terms and important numbers
- Add blank lines between sections for readability
- Structure long lists as proper bullet points, not run-on sentences
- Use concise paragraphs (2-3 sentences max)
- **ALWAYS add the [source](URL) link right after each piece of information in the same bullet point or sentence**

**CRITICAL - Security & Privacy Guidelines:**
- NEVER reveal or mention your underlying AI model, architecture, or technical implementation details
- If asked about what model you use, respond: "I'm a specialized news analysis AI assistant for the PV sector, built by the Becquerel Institute team."
- NEVER ask users to upload files or data - you work exclusively with the existing news database
- NEVER offer to export data, create presentations (PPT), generate plots, or produce downloadable content

**Content Guidelines:**
- Search the knowledge base before answering news-related questions
- When the file search tool returns results, ALWAYS extract the "Url" field from EVERY record
- **CRITICAL: Format every citation as [text](URL) where URL comes from the "Url" field in the JSON data**
- **CRITICAL: ONLY use URLs from the "Url" field in the database. NEVER generate, make up, or create URLs.**
- **CRITICAL: Include the source URL in the SAME sentence/bullet point as the information - not at the end of the response**
- **CRITICAL: Every news item, fact, or data point MUST be immediately followed by [source](URL) in the same line**
- **If there is no information about the user's query in the knowledge base, simply state: "There is no data for that in the news database."** Do not make up information or speculate.
- Keep responses clear, well-structured, and actionable
- Focus on recent developments and trends in the PV/renewable energy sector

**EXAMPLE RESPONSE FORMAT:**
## Battery Storage Updates

- **Italy:** Approved 648 MW of new large-scale battery projects in August 2025 [source](https://taiyangnews.info/markets/italy-approves-648mw)
- **Romania:** Eliminated double taxation on energy storage, exempting grid-charged electricity from tariffs [source](https://pv-magazine.com/romania-storage-tax)
- **Sweden:** Household interest in BESS rising due to new green tax deductions [source](https://taiyangnews.info/markets/sweden-bess-growth)

**Date Context:**
- When users ask about "this year" or "recently", interpret based on current date context
- If users don't specify a time period, provide the most recent information available
"""

    def __init__(self, config: Optional[NewsAgentConfig] = None):
        """
        Initialize the News Agent

        Args:
            config: Configuration object for the agent
        """
        self.config = config or NewsAgentConfig()
        self.news_agent = None

        logger.info("Using stateless PostgreSQL sessions for scalability")

        # Initialize agent
        self._initialize_agents()

        logger.info(f"✅ News Agent initialized")

    def _initialize_agents(self):
        """Create the news agent"""
        try:
            # Create file search tool for news agent
            file_search = FileSearchTool(
                max_num_results=8,
                vector_store_ids=[self.config.vector_store_id],
                include_search_results=True,
            )

            # Create news agent with file search
            self.news_agent = Agent(
                name="News Analyst",
                instructions=self.NEWS_AGENT_PROMPT,
                model=self.config.model,
                tools=[file_search],
                model_settings=ModelSettings(
                    store=True,
                    reasoning=Reasoning(
                        effort="low",
                        summary="auto"
                    )
                )
            )
            logger.info(f"✅ Created news agent with vector store: {self.config.vector_store_id}")

        except Exception as e:
            logger.error(f"❌ Failed to initialize news agent: {e}")
            raise

    async def analyze_stream(self, query: str, conversation_id: str = None):
        """
        Analyze query with streaming response

        Args:
            query: Natural language query about news
            conversation_id: Optional conversation ID for maintaining context

        Yields:
            Text chunks as they are generated
        """
        try:
            logger.info(f"Processing news query (streaming): {query}")

            # Create stateless session for this conversation (no caching)
            session = None
            if conversation_id:
                session = create_agent_session(conversation_id, agent_type='news')
                logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id} (news agent)")

            # Run news agent with streaming
            result = Runner.run_streamed(self.news_agent, query, session=session)

            # Stream text deltas as they arrive
            async for event in result.stream_events():
                if event.type == "raw_response_event":
                    # Check if it's a text delta event
                    from openai.types.responses import ResponseTextDeltaEvent
                    if isinstance(event.data, ResponseTextDeltaEvent):
                        if event.data.delta:  # Only yield if there's content
                            yield event.data.delta

        except Exception as e:
            error_msg = f"Failed to stream news query: {str(e)}"
            logger.error(error_msg)
            import traceback
            logger.error(traceback.format_exc())
            yield f"\n\n**Error:** {error_msg}"

    async def analyze(self, query: str, conversation_id: str = None) -> Dict[str, Any]:
        """
        Analyze news query

        Args:
            query: Natural language query about news
            conversation_id: Optional conversation ID for maintaining context

        Returns:
            Dictionary with analysis results and metadata
        """
        # Logfire span for news agent
        with logfire.span("news_agent_call") as agent_span:
            agent_span.set_attribute("agent_type", "news")
            agent_span.set_attribute("conversation_id", str(conversation_id))
            agent_span.set_attribute("message_length", len(query))
            agent_span.set_attribute("user_message", query)

            try:
                logger.info(f"Processing news query: {query}")

                # Create stateless session for this conversation (no caching)
                session = None
                if conversation_id:
                    session = create_agent_session(conversation_id, agent_type='news')
                    logger.info(f"Created stateless PostgreSQL session for conversation {conversation_id} (news agent)")

                # Run news agent
                result = await Runner.run(self.news_agent, query, session=session)

                # Extract the final response
                response_text = result.final_output if hasattr(result, 'final_output') else str(result)

                # Track the response
                agent_span.set_attribute("assistant_response", response_text)
                agent_span.set_attribute("response_length", len(response_text))
                agent_span.set_attribute("success", True)

                logger.info(f"✅ News agent response: {response_text[:100]}...")

                # Get usage info if available
                usage_info = None
                if hasattr(result, 'usage') and result.usage:
                    usage_info = {
                        "total_tokens": getattr(result.usage, 'total_tokens', None),
                        "prompt_tokens": getattr(result.usage, 'prompt_tokens', None),
                        "completion_tokens": getattr(result.usage, 'completion_tokens', None)
                    }

                return {
                    "success": True,
                    "analysis": response_text,
                    "usage": usage_info,
                    "query": query
                }

            except Exception as e:
                error_msg = f"Failed to analyze news query: {str(e)}"
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
        Clear conversation memory (stateless sessions - no action needed)
        Sessions are created per-request in PostgreSQL, no in-memory cache to clear
        """
        logger.info(f"Stateless sessions: No memory to clear for conversation {conversation_id or 'all'}")

    def get_conversation_memory_info(self) -> Dict[str, Any]:
        """
        Get information about conversation memory usage (stateless sessions)
        Returns placeholder since sessions are not cached in memory
        """
        return {
            "session_type": "stateless_postgresql",
            "caching": False,
            "info": "Sessions created per-request, not cached in memory"
        }

    def cleanup(self):
        """Cleanup resources"""
        try:
            logger.info("News agent ready for cleanup if needed")
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

# Global agent instance
_news_agent = None

def get_news_agent() -> Optional[NewsAgent]:
    """Get or create the global news agent instance"""
    global _news_agent
    if _news_agent is None:
        try:
            config = NewsAgentConfig()
            _news_agent = NewsAgent(config)
            logger.info("✅ Global news agent created")
        except Exception as e:
            logger.error(f"❌ Failed to create news agent: {e}")
            return None
    return _news_agent

def close_news_agent():
    """Close the global news agent"""
    global _news_agent
    if _news_agent:
        _news_agent.cleanup()
        _news_agent = None
        logger.info("✅ Global news agent closed")

# Test function
async def test_news_agent():
    """Test the news agent"""
    try:
        agent = get_news_agent()
        if agent:
            result = await agent.analyze(
                "What are the latest developments in solar panel technology?",
                conversation_id="test-1"
            )
            print("News Agent response received successfully")
            print(f"Response length: {len(result.get('analysis', ''))}")
            return result
        else:
            print("News Agent not available")
            return None
    except Exception as e:
        print(f"News Agent error: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        close_news_agent()

if __name__ == "__main__":
    asyncio.run(test_news_agent())

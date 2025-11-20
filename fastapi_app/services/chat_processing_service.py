"""
Chat Processing Service - Async FastAPI Implementation
Handles real-time chat processing with streaming responses
"""
import json
import logging
from typing import Optional, Dict, Any, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from fastapi_app.db.models import User, Conversation, Message

logger = logging.getLogger(__name__)


# ============================================
# Global Agent Instances (Lazy Loading)
# ============================================

_news_agent = None
_digitalization_agent = None
_market_intelligence_agent = None
_nzia_policy_agent = None
_manufacturer_financial_agent = None
_nzia_market_impact_agent = None
_component_prices_agent = None
_seamless_agent = None


def get_news_agent_instance():
    """Get or create news agent instance"""
    global _news_agent
    if _news_agent is None:
        from news_agent import NewsAgent
        _news_agent = NewsAgent()
    return _news_agent


def get_digitalization_agent_instance():
    """Get or create digitalization agent instance"""
    global _digitalization_agent
    if _digitalization_agent is None:
        from digitalization_trend_agent import DigitalizationAgent
        _digitalization_agent = DigitalizationAgent()
    return _digitalization_agent


def get_market_intelligence_agent_instance():
    """Get or create market intelligence agent instance"""
    global _market_intelligence_agent
    if _market_intelligence_agent is None:
        from market_intelligence_agent import MarketIntelligenceAgent
        _market_intelligence_agent = MarketIntelligenceAgent()
    return _market_intelligence_agent


def get_nzia_policy_agent_instance():
    """Get or create NZIA policy agent instance"""
    global _nzia_policy_agent
    if _nzia_policy_agent is None:
        from nzia_policy_agent import NZIAPolicyAgent
        _nzia_policy_agent = NZIAPolicyAgent()
    return _nzia_policy_agent


def get_manufacturer_financial_agent_instance():
    """Get or create manufacturer financial agent instance"""
    global _manufacturer_financial_agent
    if _manufacturer_financial_agent is None:
        from manufacturer_financial_agent import ManufacturerFinancialAgent
        _manufacturer_financial_agent = ManufacturerFinancialAgent()
    return _manufacturer_financial_agent


def get_nzia_market_impact_agent_instance():
    """Get or create NZIA market impact agent instance"""
    global _nzia_market_impact_agent
    if _nzia_market_impact_agent is None:
        from nzia_market_impact_agent import NZIAMarketImpactAgent
        _nzia_market_impact_agent = NZIAMarketImpactAgent()
    return _nzia_market_impact_agent


def get_component_prices_agent_instance():
    """Get or create Component Prices agent instance"""
    global _component_prices_agent
    if _component_prices_agent is None:
        from fastapi_app.component_prices_agent import ComponentPricesAgent
        _component_prices_agent = ComponentPricesAgent()
    return _component_prices_agent


def get_seamless_agent_instance():
    """Get or create Seamless agent instance"""
    global _seamless_agent
    if _seamless_agent is None:
        from seamless_agent import SeamlessAgent
        _seamless_agent = SeamlessAgent()
    return _seamless_agent


# ============================================
# Helper Functions
# ============================================

def clean_nan_values(obj):
    """Recursively clean NaN values from dictionaries and lists"""
    import math

    if isinstance(obj, dict):
        return {k: clean_nan_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan_values(item) for item in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    return obj


# ============================================
# Chat Processing Service
# ============================================

class ChatProcessingService:
    """Service for processing chat messages with AI agents"""

    # ============================================
    # Streaming Agents
    # ============================================

    @staticmethod
    async def process_news_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'news'
    ) -> AsyncGenerator[str, None]:
        """
        Process message with news agent (streaming via SSE)

        Args:
            agent_type: The agent type to store with the bot message

        Yields:
            SSE-formatted strings (data: {...}\n\n)
        """
        news_agent = get_news_agent_instance()
        full_response = ""

        try:
            # Stream text chunks as they arrive
            async for chunk in news_agent.analyze_stream(user_message, conversation_id=str(conv_id)):
                full_response += chunk
                # Send chunk as SSE event
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save the complete response to database
            try:
                bot_msg = Message(
                    conversation_id=conv_id,
                    sender='bot',
                    agent_type=agent_type,
                    content=json.dumps({
                        'type': 'string',
                        'value': full_response,
                        'comment': None
                    })
                )
                db.add(bot_msg)
                await db.commit()
                logger.info(f"News agent message saved: {len(full_response)} chars")
            except Exception as db_error:
                logger.error(f"Error saving news agent message: {db_error}")
                await db.rollback()

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"
            logger.info(f"News agent streaming completed: {len(full_response)} chars")

        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            logger.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    @staticmethod
    async def process_digitalization_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'digitalization'
    ) -> AsyncGenerator[str, None]:
        """
        Process message with digitalization agent (streaming via SSE)

        Yields:
            SSE-formatted strings
        """
        digitalization_agent = get_digitalization_agent_instance()
        full_response = ""

        try:
            # Stream text chunks as they arrive
            async for chunk in digitalization_agent.analyze_stream(user_message, conversation_id=str(conv_id)):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save the complete response to database
            try:
                bot_msg = Message(
                    conversation_id=conv_id,
                    sender='bot',
                    agent_type=agent_type,
                    content=json.dumps({
                        'type': 'string',
                        'value': full_response,
                        'comment': None
                    })
                )
                db.add(bot_msg)
                await db.commit()
                logger.info(f"Digitalization agent message saved: {len(full_response)} chars")
            except Exception as db_error:
                logger.error(f"Error saving digitalization agent message: {db_error}")
                await db.rollback()

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"

        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            logger.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    @staticmethod
    async def process_market_intelligence_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'market'
    ) -> AsyncGenerator[str, None]:
        """
        Process message with market intelligence agent (streaming via SSE)
        Most complex agent - handles text, plots, and approval requests

        Yields:
            SSE-formatted strings
        """
        market_intelligence_agent = get_market_intelligence_agent_instance()
        full_response = ""
        plot_data = None
        response_type = "text"

        try:
            if not market_intelligence_agent:
                error_msg = "Market Intelligence agent not available"
                yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
                return

            # Send initial processing message
            yield f"data: {json.dumps({'type': 'processing', 'message': 'Analyzing your query...'})}\n\n"

            # Stream response
            async for chunk in market_intelligence_agent.analyze_stream(user_message, conversation_id=str(conv_id)):
                # Check if chunk is JSON (plot data or event)
                try:
                    response_json = json.loads(chunk)
                    if isinstance(response_json, dict):
                        event_type = response_json.get('type')

                        # Handle status updates
                        if event_type == 'status':
                            logger.info(f"Status update: {response_json.get('message')}")
                            yield f"data: {json.dumps({'type': 'status', 'message': response_json.get('message')})}\n\n"

                        # Handle approval requests
                        elif event_type == 'approval_request':
                            logger.info(f"Approval request: {response_json.get('context')}")
                            approval_message = response_json.get('message', '')
                            if approval_message and not full_response:
                                full_response = approval_message
                            response_type = "approval_request"
                            yield f"data: {json.dumps({'type': 'approval_request', 'message': response_json.get('message'), 'approval_question': response_json.get('approval_question'), 'conversation_id': response_json.get('conversation_id'), 'context': response_json.get('context')})}\n\n"

                        # Handle text responses
                        elif event_type == 'text' or event_type == 'text_chunk':
                            response_type = "text"
                            text_content = response_json.get('content', '')
                            full_response += text_content
                            yield f"data: {json.dumps({'type': 'chunk', 'content': text_content})}\n\n"

                        # Handle plot data
                        elif event_type == 'plot':
                            response_type = "plot"
                            plot_data = response_json['content']
                            full_response = f"Generated plot: {plot_data.get('title', 'Untitled')}"
                            logger.info(f"Plot generated: {plot_data.get('plot_type')} - {plot_data.get('title')}")
                            yield f"data: {json.dumps({'type': 'plot', 'content': plot_data})}\n\n"

                        # Legacy format - direct plot JSON
                        elif 'plot_type' in response_json:
                            response_type = "plot"
                            plot_data = response_json
                            full_response = f"Generated plot: {plot_data.get('title', 'Untitled')}"
                            logger.info(f"Plot generated (legacy): {plot_data.get('plot_type')}")
                            yield f"data: {json.dumps({'type': 'plot', 'content': plot_data})}\n\n"

                        else:
                            # JSON but not a recognized type
                            full_response += str(response_json)
                            yield f"data: {json.dumps({'type': 'chunk', 'content': str(response_json)})}\n\n"
                    else:
                        # JSON but not a dict
                        full_response += str(chunk)
                        yield f"data: {json.dumps({'type': 'chunk', 'content': str(chunk)})}\n\n"

                except (json.JSONDecodeError, ValueError):
                    # It's a text chunk
                    if chunk:
                        full_response += chunk
                        yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save the complete response to database
            try:
                # Determine content type and value based on response type
                if response_type == "plot":
                    content_to_save = {
                        'type': 'plot',
                        'value': plot_data
                    }
                elif response_type == "approval_request":
                    content_to_save = {
                        'type': 'approval_request',
                        'value': full_response
                    }
                else:
                    content_to_save = {
                        'type': 'string',
                        'value': full_response
                    }

                bot_msg = Message(
                    conversation_id=conv_id,
                    sender='bot',
                    agent_type=agent_type,
                    content=json.dumps(content_to_save)
                )
                db.add(bot_msg)
                await db.commit()
                logger.info(f"Market Intelligence message saved: type={response_type}")
            except Exception as db_error:
                logger.error(f"Error saving market intelligence message: {db_error}")
                await db.rollback()

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"

        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            logger.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    @staticmethod
    async def process_nzia_policy_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'nzia_policy'
    ) -> AsyncGenerator[str, None]:
        """
        Process message with NZIA policy agent (streaming via SSE)

        Yields:
            SSE-formatted strings
        """
        nzia_policy_agent = get_nzia_policy_agent_instance()
        full_response = ""

        try:
            # Stream text chunks as they arrive
            async for chunk in nzia_policy_agent.analyze_stream(user_message, conversation_id=str(conv_id)):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save the complete response to database
            try:
                bot_msg = Message(
                    conversation_id=conv_id,
                    sender='bot',
                    agent_type=agent_type,
                    content=json.dumps({
                        'type': 'string',
                        'value': full_response,
                        'comment': None
                    })
                )
                db.add(bot_msg)
                await db.commit()
                logger.info(f"NZIA policy agent message saved: {len(full_response)} chars")
            except Exception as db_error:
                logger.error(f"Error saving NZIA policy agent message: {db_error}")
                await db.rollback()

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"

        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            logger.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    @staticmethod
    async def process_manufacturer_financial_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'manufacturer_financial'
    ) -> AsyncGenerator[str, None]:
        """
        Process message with manufacturer financial agent (streaming via SSE)

        Yields:
            SSE-formatted strings
        """
        manufacturer_financial_agent = get_manufacturer_financial_agent_instance()
        full_response = ""

        try:
            # Stream text chunks as they arrive
            async for chunk in manufacturer_financial_agent.analyze_stream(user_message, conversation_id=str(conv_id)):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save the complete response to database
            try:
                bot_msg = Message(
                    conversation_id=conv_id,
                    sender='bot',
                    agent_type=agent_type,
                    content=json.dumps({
                        'type': 'string',
                        'value': full_response,
                        'comment': None
                    })
                )
                db.add(bot_msg)
                await db.commit()
                logger.info(f"Manufacturer financial agent message saved: {len(full_response)} chars")
            except Exception as db_error:
                logger.error(f"Error saving manufacturer financial agent message: {db_error}")
                await db.rollback()

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"

        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            logger.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    @staticmethod
    async def process_nzia_market_impact_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'nzia_market_impact'
    ) -> AsyncGenerator[str, None]:
        """
        Process message with NZIA market impact agent (streaming via SSE)

        Yields:
            SSE-formatted strings
        """
        nzia_market_impact_agent = get_nzia_market_impact_agent_instance()
        full_response = ""

        try:
            # Stream text chunks as they arrive
            async for chunk in nzia_market_impact_agent.analyze_stream(user_message, conversation_id=str(conv_id)):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save the complete response to database
            try:
                bot_msg = Message(
                    conversation_id=conv_id,
                    sender='bot',
                    agent_type=agent_type,
                    content=json.dumps({
                        'type': 'string',
                        'value': full_response,
                        'comment': None
                    })
                )
                db.add(bot_msg)
                await db.commit()
                logger.info(f"NZIA market impact agent message saved: {len(full_response)} chars")
            except Exception as db_error:
                logger.error(f"Error saving NZIA market impact agent message: {db_error}")
                await db.rollback()

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"

        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            logger.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    @staticmethod
    async def process_component_prices_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'component_prices'
    ) -> AsyncGenerator[str, None]:
        """
        Process message with Component Prices agent (streaming workflow)
        Handles both text responses and plot JSON

        Yields:
            SSE-formatted strings
        """
        component_prices_agent = get_component_prices_agent_instance()
        full_response = ""
        plot_data = None
        response_type = "text"

        try:
            # Stream text chunks and plot data as they arrive
            async for chunk in component_prices_agent.run_workflow_stream(user_message, conversation_id=str(conv_id)):
                # Check if chunk is JSON (plot data)
                try:
                    response_json = json.loads(chunk)
                    if isinstance(response_json, dict):
                        event_type = response_json.get('type')

                        # Handle plot data
                        if event_type == 'plot':
                            response_type = "plot"
                            plot_data = response_json['content']
                            full_response = f"Generated plot: {plot_data.get('title', 'Untitled')}"
                            logger.info(f"Plot generated: {plot_data.get('plot_type')} - {plot_data.get('title')}")
                            yield f"data: {json.dumps({'type': 'plot', 'content': plot_data})}\n\n"

                        # Legacy format - direct plot JSON (backward compatibility)
                        elif 'plot_type' in response_json:
                            response_type = "plot"
                            plot_data = response_json
                            full_response = f"Generated plot: {plot_data.get('title', 'Untitled')}"
                            logger.info(f"Plot generated (legacy): {plot_data.get('plot_type')}")
                            yield f"data: {json.dumps({'type': 'plot', 'content': plot_data})}\n\n"

                        else:
                            # JSON but not a recognized type - treat as text
                            full_response += str(response_json)
                            yield f"data: {json.dumps({'type': 'chunk', 'content': str(response_json)})}\n\n"

                except json.JSONDecodeError:
                    # Not JSON - regular text chunk
                    full_response += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save the complete response to database
            try:
                # Determine content type based on response type
                if response_type == "plot":
                    content_to_save = {
                        'type': 'plot',
                        'value': plot_data
                    }
                else:
                    content_to_save = {
                        'type': 'string',
                        'value': full_response,
                        'comment': None
                    }

                bot_msg = Message(
                    conversation_id=conv_id,
                    sender='bot',
                    agent_type=agent_type,
                    content=json.dumps(content_to_save)
                )
                db.add(bot_msg)
                await db.commit()
                logger.info(f"Component prices agent message saved: {response_type}, {len(full_response)} chars")
            except Exception as db_error:
                logger.error(f"Error saving component prices agent message: {db_error}")
                await db.rollback()

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"

        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            logger.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    @staticmethod
    async def process_seamless_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'seamless'
    ) -> AsyncGenerator[str, None]:
        """
        Process message with Seamless agent (streaming via SSE)
        Streams text chunks back to the client
        """
        # Get agent instance
        seamless_agent = get_seamless_agent_instance()
        full_response = ""

        try:
            # Stream chunks from the agent
            async for chunk in seamless_agent.analyze_stream(user_message, conversation_id=str(conv_id)):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save message to database after streaming completes
            bot_msg = Message(
                conversation_id=conv_id,
                sender='bot',
                agent_type=agent_type,
                content=json.dumps({
                    'type': 'string',
                    'value': full_response,
                    'comment': None
                })
            )
            db.add(bot_msg)
            await db.commit()
            logger.info(f"Seamless agent message saved: {len(full_response)} chars")

            # Send completion event
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Seamless agent streaming error: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

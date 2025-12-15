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
_quality_agent = None
_storage_optimization_agent = None


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


def get_quality_agent_instance():
    """Get or create Quality agent instance"""
    global _quality_agent
    if _quality_agent is None:
        from quality_agent import QualityAgent
        _quality_agent = QualityAgent()
    return _quality_agent


def get_storage_optimization_agent_instance():
    """Get or create Storage Optimization agent instance"""
    global _storage_optimization_agent
    if _storage_optimization_agent is None:
        from storage_optimization_agent import StorageOptimizationAgent
        _storage_optimization_agent = StorageOptimizationAgent()
    return _storage_optimization_agent


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
                            # Dict JSON but not a recognized type - treat as text
                            full_response += str(response_json)
                            yield f"data: {json.dumps({'type': 'chunk', 'content': str(response_json)})}\n\n"

                    else:
                        # JSON parsed but not a dict (e.g., integers, strings, arrays) - treat as text
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

    @staticmethod
    async def process_quality_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'quality'
    ) -> AsyncGenerator[str, None]:
        """
        Process message with Quality agent (streaming via SSE)
        Streams text chunks back to the client

        Yields:
            SSE-formatted strings
        """
        quality_agent = get_quality_agent_instance()
        full_response = ""

        try:
            # Stream text chunks as they arrive
            async for chunk in quality_agent.analyze_stream(user_message, conversation_id=str(conv_id)):
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
                logger.info(f"Quality agent message saved: {len(full_response)} chars")
            except Exception as db_error:
                logger.error(f"Error saving quality agent message: {db_error}")
                await db.rollback()

            # Send completion event
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response})}\n\n"

        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            logger.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

    @staticmethod
    async def process_storage_optimization_agent_stream(
        db: AsyncSession,
        user_message: str,
        conv_id: int,
        agent_type: str = 'storage_optimization',
        file_content: bytes = None,
        file_name: str = None,
        user_id: int = None
    ) -> AsyncGenerator[str, None]:
        """
        Process message with Storage Optimization agent (streaming via SSE)

        Clean approach:
        - Streams only text chunks during response
        - Dashboard data is extracted after streaming and saved to DB
        - Frontend fetches dashboard via separate GET /dashboard/{conv_id} endpoint
        - 'done' event includes has_dashboard flag to trigger frontend fetch
        - Load profiles are persisted to database for reliability

        Args:
            db: Database session
            user_message: User's message
            conv_id: Conversation ID
            agent_type: Agent type identifier
            file_content: Optional file content bytes (for load profile uploads)
            file_name: Optional file name
            user_id: User ID for associating load profiles

        Yields:
            SSE-formatted strings with text chunks and done event
        """
        from fastapi_app.services.load_profile_service import LoadProfileService

        storage_optimization_agent = get_storage_optimization_agent_instance()
        full_response = ""

        try:
            # Import the parsing and profile functions from storage optimization agent
            from storage_optimization_agent import (
                parse_load_profile_file,
                set_custom_load_profile,
                clear_custom_load_profile
            )

            # If file is provided, parse it and save to database
            if file_content and file_name:
                logger.info(f"Processing file upload: {file_name}")

                # Parse the uploaded file
                parse_result = parse_load_profile_file(file_content, file_name)

                if parse_result.get('success'):
                    profile_data = parse_result['load_profile']
                    annual_demand = parse_result['annual_demand_kwh']
                    hours = parse_result.get('hours', 8760)

                    # Save to database for persistence
                    if user_id:
                        try:
                            saved_profile = await LoadProfileService.save_load_profile(
                                db=db,
                                conversation_id=conv_id,
                                user_id=user_id,
                                profile_data=profile_data,
                                file_name=file_name,
                                set_active=True
                            )
                            logger.info(f"✅ Load profile saved to database: ID={saved_profile.id}, name='{saved_profile.name}'")
                        except Exception as db_err:
                            logger.error(f"Failed to save load profile to database: {db_err}")
                            # Continue anyway - in-memory profile will still work

                    # Also set in-memory for immediate use by agent tools
                    set_custom_load_profile(
                        profile_data,
                        source=file_name,
                        conversation_id=str(conv_id)
                    )

                    # Get list of all profiles for this conversation
                    all_profiles = await LoadProfileService.get_all_profiles(db, conv_id)
                    profile_list_info = ""
                    if len(all_profiles) > 1:
                        profile_names = [p['name'] for p in all_profiles]
                        active_profile = next((p['name'] for p in all_profiles if p['is_active']), None)
                        profile_list_info = f" Available profiles: {', '.join(profile_names)}. Active profile: '{active_profile}'."

                    # Update user message to inform the agent about the uploaded data
                    user_message = f"{user_message}\n\n[System: User uploaded load profile file '{file_name}' containing {hours} hours of data with total annual consumption of {annual_demand:.0f} kWh. The custom load profile has been saved and set as active.{profile_list_info}]"
                    logger.info(f"✅ Load profile parsed and set for conversation {conv_id}: {annual_demand:.0f} kWh/year from {file_name}")
                else:
                    # Parsing failed - inform the user through the message
                    error_msg = parse_result.get('error', 'Unknown error')
                    user_message = f"{user_message}\n\n[System: Failed to parse uploaded file '{file_name}': {error_msg}. Please check the file format and try again.]"
                    logger.warning(f"❌ Failed to parse load profile: {error_msg}")
            else:
                # No file uploaded - load active profile from database if one exists
                active_profile = await LoadProfileService.get_active_profile(db, conv_id)
                if active_profile:
                    # Set the profile from database into memory for agent tools
                    set_custom_load_profile(
                        active_profile['profile_data'],
                        source=active_profile['file_name'] or active_profile['name'],
                        conversation_id=str(conv_id)
                    )
                    logger.info(f"📊 Loaded active profile '{active_profile['name']}' from database for conversation {conv_id}")

                    # Get list of all profiles
                    all_profiles = await LoadProfileService.get_all_profiles(db, conv_id)
                    if all_profiles:
                        profile_names = [p['name'] for p in all_profiles]
                        user_message = f"{user_message}\n\n[System: Using previously uploaded load profile '{active_profile['name']}' ({active_profile['annual_demand_kwh']:.0f} kWh/year). Available profiles: {', '.join(profile_names)}.]"
                else:
                    # No profile in database either - clear any stale in-memory profile
                    clear_custom_load_profile(conversation_id=str(conv_id))

            # Stream text chunks as they arrive (no JSON parsing needed)
            async for chunk in storage_optimization_agent.analyze_stream(user_message, conversation_id=str(conv_id)):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # After streaming, get dashboard results from agent
            # all_dashboard_results: List of {label, data} for multi-optimization support
            # last_dashboard_data: backward compatibility for single result
            all_dashboard_results = getattr(storage_optimization_agent, 'all_dashboard_results', [])
            dashboard_data = getattr(storage_optimization_agent, 'last_dashboard_data', None)

            # Save the complete response to database
            try:
                content_to_save = {
                    'type': 'string',
                    'value': full_response,
                    'comment': None
                }
                # Include all dashboard results if available (new format)
                if all_dashboard_results:
                    content_to_save['all_dashboard_results'] = all_dashboard_results
                    # Also include single dashboard_data for backward compatibility
                    content_to_save['dashboard_data'] = dashboard_data
                elif dashboard_data:
                    # Fallback: single result in old format
                    content_to_save['dashboard_data'] = dashboard_data

                bot_msg = Message(
                    conversation_id=conv_id,
                    sender='bot',
                    agent_type=agent_type,
                    content=json.dumps(content_to_save)
                )
                db.add(bot_msg)
                await db.commit()
                result_count = len(all_dashboard_results) if all_dashboard_results else (1 if dashboard_data else 0)
                logger.info(f"Storage optimization agent message saved: {len(full_response)} chars, dashboard_results={result_count}")
            except Exception as db_error:
                logger.error(f"Error saving storage optimization agent message: {db_error}")
                await db.rollback()

            # Send completion event with dashboard info
            # Frontend will call GET /dashboard/{conv_id} if has_dashboard is true
            has_dashboard = bool(all_dashboard_results) or bool(dashboard_data)
            result_count = len(all_dashboard_results) if all_dashboard_results else (1 if dashboard_data else 0)
            yield f"data: {json.dumps({'type': 'done', 'full_response': full_response, 'has_dashboard': has_dashboard, 'dashboard_count': result_count})}\n\n"

        except Exception as e:
            error_msg = f"Streaming error: {str(e)}"
            logger.error(error_msg)
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
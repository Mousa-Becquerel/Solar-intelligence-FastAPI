"""
Chat API Endpoints - Real-time chat processing with streaming
Handles chat messages with SSE (Server-Sent Events) streaming
"""
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from fastapi_app.db.session import get_db
from fastapi_app.core.deps import get_current_active_user
from fastapi_app.db.models import User, Conversation, Message, UserSurvey, UserSurveyStage2
from fastapi_app.services.chat_processing_service import ChatProcessingService
from fastapi_app.services.agent_access_service import AgentAccessService

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================
# Pydantic Schemas
# ============================================

class ChatRequest(BaseModel):
    """Request to send a chat message"""
    message: str = Field(..., min_length=1, max_length=5000, description="User's message")
    conversation_id: int = Field(..., description="Conversation ID")
    agent_type: str = Field(default="market", description="Agent type to use")


class ChatResponse(BaseModel):
    """Response for non-streaming chat"""
    response: list


class QueryLimitError(BaseModel):
    """Error response when query limit is reached"""
    error: str
    plan_type: str
    queries_used: int
    query_limit: str
    upgrade_required: bool


class AgentAccessError(BaseModel):
    """Error response when agent access is denied"""
    error: str
    requires_upgrade: bool
    agent_type: str


# ============================================
# Chat Endpoints
# ============================================

@router.post(
    "/send",
    summary="Send chat message",
    description="Send a message and get streaming or non-streaming response based on agent type"
)
async def send_chat_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a chat message and process with appropriate agent

    Returns:
        - StreamingResponse with SSE for streaming agents
        - JSON response for non-streaming agents
    """
    try:
        user_message = request.message.strip()
        conv_id = request.conversation_id
        agent_type = request.agent_type

        # Input validation
        if not user_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty message"
            )

        # Get conversation and validate user access
        result = await db.execute(
            select(Conversation).where(Conversation.id == conv_id)
        )
        conversation = result.scalar_one_or_none()

        if not conversation or conversation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found or access denied"
            )

        # Check if user has access to the requested agent
        can_access, reason = await AgentAccessService.can_user_access_agent(
            db, current_user, agent_type
        )
        if not can_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=reason or "You do not have access to this agent"
            )

        # Update conversation agent type if changed
        if conversation.agent_type != agent_type:
            conversation.agent_type = agent_type
            await db.commit()

        # Check query limits (including survey bonuses for free tier)
        base_limit = current_user.get_query_limit()
        total_limit = base_limit

        # Add survey bonuses for free tier users
        if current_user.plan_type == 'free':
            # Check Stage 1 survey completion
            stage1_result = await db.execute(
                select(UserSurvey).where(UserSurvey.user_id == current_user.id)
            )
            stage1_survey = stage1_result.scalar_one_or_none()
            if stage1_survey:
                total_limit += stage1_survey.bonus_queries_granted

            # Check Stage 2 survey completion
            stage2_result = await db.execute(
                select(UserSurveyStage2).where(UserSurveyStage2.user_id == current_user.id)
            )
            stage2_survey = stage2_result.scalar_one_or_none()
            if stage2_survey:
                total_limit += stage2_survey.bonus_queries_granted

        # Check if user exceeded their limit
        if current_user.role != 'admin' and current_user.monthly_query_count >= total_limit:
            queries_used = current_user.monthly_query_count
            plan_type = current_user.plan_type
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    'error': f'Query limit reached. You have used {queries_used}/{total_limit} queries this month.',
                    'plan_type': plan_type,
                    'queries_used': queries_used,
                    'query_limit': total_limit if total_limit != float('inf') else 'unlimited',
                    'upgrade_required': plan_type == 'free'
                }
            )

        # Increment query count
        try:
            current_user.increment_query_count()
            await db.commit()
            logger.info(f"Query count incremented for user {current_user.id}")
        except Exception as e:
            logger.error(f"Error incrementing query count: {e}")
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to track query usage"
            )

        # Store user message
        try:
            user_msg = Message(
                conversation_id=conv_id,
                sender='user',
                content=json.dumps({
                    "type": "string",
                    "value": user_message,
                    "comment": None
                })
            )
            db.add(user_msg)
            await db.commit()
        except Exception as e:
            logger.error(f"Database error storing user message: {e}")
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error storing message"
            )

        # Process with appropriate agent
        try:
            # Non-streaming agents - but we still return as SSE for frontend compatibility
            if agent_type == "price":
                async def price_agent_sse_wrapper():
                    """Wrapper to convert non-streaming price agent to SSE format"""
                    try:
                        # Get the full response from price agent
                        result = await ChatProcessingService.process_price_agent(
                            db, user_message, conv_id
                        )

                        # Extract response data
                        response_data = result.get('response', [])

                        # Send each response item as an SSE chunk
                        for item in response_data:
                            if item.get('type') == 'interactive_chart':
                                # Send plot data
                                yield f"data: {json.dumps({'type': 'plot', 'content': item.get('plot_data')})}\n\n"
                            else:
                                # Send text content
                                content = item.get('value', '')
                                yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"

                        # Send completion event
                        yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    except Exception as e:
                        logger.error(f"Price agent SSE wrapper error: {e}")
                        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

                return StreamingResponse(
                    price_agent_sse_wrapper(),
                    media_type="text/event-stream",
                    headers={
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        'Connection': 'keep-alive',
                        'Content-Type': 'text/event-stream; charset=utf-8',
                        'X-Content-Type-Options': 'nosniff'
                    }
                )

            elif agent_type == "om":
                async def leo_om_sse_wrapper():
                    """Wrapper to convert non-streaming Leo O&M agent to SSE format"""
                    try:
                        result = await ChatProcessingService.process_leo_om_agent(
                            db, user_message, conv_id
                        )

                        response_data = result.get('response', [])
                        for item in response_data:
                            content = item.get('value', '')
                            yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"

                        yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    except Exception as e:
                        logger.error(f"Leo O&M SSE wrapper error: {e}")
                        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

                return StreamingResponse(
                    leo_om_sse_wrapper(),
                    media_type="text/event-stream",
                    headers={
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        'Connection': 'keep-alive',
                        'Content-Type': 'text/event-stream; charset=utf-8',
                        'X-Content-Type-Options': 'nosniff'
                    }
                )

            # Streaming agents - return SSE response
            elif agent_type == "news":
                return StreamingResponse(
                    ChatProcessingService.process_news_agent_stream(
                        db, user_message, conv_id
                    ),
                    media_type="text/event-stream",
                    headers={
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        'Connection': 'keep-alive',
                        'Content-Type': 'text/event-stream; charset=utf-8',
                        'X-Content-Type-Options': 'nosniff'
                    }
                )

            elif agent_type == "digitalization":
                return StreamingResponse(
                    ChatProcessingService.process_digitalization_agent_stream(
                        db, user_message, conv_id
                    ),
                    media_type="text/event-stream",
                    headers={
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        'Connection': 'keep-alive',
                        'Content-Type': 'text/event-stream; charset=utf-8',
                        'X-Content-Type-Options': 'nosniff'
                    }
                )

            elif agent_type == "market":
                return StreamingResponse(
                    ChatProcessingService.process_market_intelligence_agent_stream(
                        db, user_message, conv_id
                    ),
                    media_type="text/event-stream",
                    headers={
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        'Connection': 'keep-alive',
                        'Content-Type': 'text/event-stream; charset=utf-8',
                        'X-Content-Type-Options': 'nosniff'
                    }
                )

            elif agent_type == "nzia_policy":
                return StreamingResponse(
                    ChatProcessingService.process_nzia_policy_agent_stream(
                        db, user_message, conv_id
                    ),
                    media_type="text/event-stream",
                    headers={
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        'Connection': 'keep-alive',
                        'Content-Type': 'text/event-stream; charset=utf-8',
                        'X-Content-Type-Options': 'nosniff'
                    }
                )

            elif agent_type == "manufacturer_financial":
                return StreamingResponse(
                    ChatProcessingService.process_manufacturer_financial_agent_stream(
                        db, user_message, conv_id
                    ),
                    media_type="text/event-stream",
                    headers={
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        'Connection': 'keep-alive',
                        'Content-Type': 'text/event-stream; charset=utf-8',
                        'X-Content-Type-Options': 'nosniff'
                    }
                )

            elif agent_type == "nzia_market_impact":
                return StreamingResponse(
                    ChatProcessingService.process_nzia_market_impact_agent_stream(
                        db, user_message, conv_id
                    ),
                    media_type="text/event-stream",
                    headers={
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        'Connection': 'keep-alive',
                        'Content-Type': 'text/event-stream; charset=utf-8',
                        'X-Content-Type-Options': 'nosniff'
                    }
                )

            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown agent type: {agent_type}"
                )

        except HTTPException:
            raise
        except Exception as agent_error:
            logger.error(f"Agent processing error: {agent_error}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Agent processing failed: {str(agent_error)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat processing error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {str(e)}"
        )


@router.get(
    "/agents",
    summary="Get available agent types",
    description="Get list of all available agent types with their names"
)
async def get_available_agent_types(
    current_user: User = Depends(get_current_active_user)
):
    """Get all available agent types"""
    agent_types = {
        "market": "Market Intelligence Agent",
        "price": "Module Prices Agent",
        "news": "News Agent",
        "digitalization": "Digitalization Trends Agent",
        "nzia_policy": "NZIA Policy Agent",
        "nzia_market_impact": "NZIA Market Impact Agent",
        "manufacturer_financial": "Manufacturer Financial Agent",
        "om": "Operations & Maintenance Agent"
    }

    return {"agent_types": agent_types}


@router.post(
    "/test-streaming",
    summary="Test SSE streaming",
    description="Test endpoint for SSE streaming functionality"
)
async def test_streaming(
    current_user: User = Depends(get_current_active_user)
):
    """Test SSE streaming endpoint"""
    async def generate_test_stream():
        """Generate test SSE stream"""
        for i in range(5):
            yield f"data: {json.dumps({'type': 'chunk', 'content': f'Test chunk {i+1}'})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'full_response': 'Test completed'})}\n\n"

    return StreamingResponse(
        generate_test_stream(),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
            'Content-Type': 'text/event-stream; charset=utf-8',
            'X-Content-Type-Options': 'nosniff'
        }
    )


# ============================================
# Expert Contact Flow Endpoints
# ============================================

class ApprovalRequest(BaseModel):
    """Request for approval response"""
    approved: bool = Field(..., description="Whether user approved")
    conversation_id: int = Field(..., description="Conversation ID")
    context: str = Field(default="expert_contact", description="Context of approval")


class ApprovalResponse(BaseModel):
    """Response for approval request"""
    success: bool
    message: str
    redirect_to_contact: bool


@router.post(
    "/approval_response",
    response_model=ApprovalResponse,
    summary="Handle approval response",
    description="Handle user's yes/no response to expert contact approval"
)
async def approval_response(
    request: ApprovalRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle user approval response for expert contact.

    This is called when user clicks Yes/No on the expert contact approval UI.
    """
    try:
        logger.info(f"Approval response received: approved={request.approved}, conversation_id={request.conversation_id}, context={request.context}")

        # Generate response message based on approval
        if request.approved:
            response_message = "Excellent! Let me open the contact form for you. Please fill in your details and our experts will reach out to you within 24-48 hours with personalized insights.\n\n**Opening contact form...**"
            redirect_to_contact = True
        else:
            response_message = "No problem! Can I help you with other queries then?"
            redirect_to_contact = False

        # Save approval response to conversation history
        if request.conversation_id:
            try:
                # Save user's approval decision
                approval_text = "Yes, I want to contact an expert" if request.approved else "No, thanks"
                user_msg = Message(
                    conversation_id=request.conversation_id,
                    sender='user',
                    content=json.dumps({
                        "type": "string",
                        "value": approval_text,
                        "comment": None
                    })
                )
                db.add(user_msg)

                # Save bot's response
                bot_msg = Message(
                    conversation_id=request.conversation_id,
                    sender='bot',
                    content=json.dumps({
                        "type": "string",
                        "value": response_message,
                        "comment": None
                    })
                )
                db.add(bot_msg)

                await db.commit()
                logger.info(f"Saved approval response to conversation {request.conversation_id}")
            except Exception as e:
                logger.error(f"Failed to save approval response to conversation: {e}")
                await db.rollback()
                # Continue anyway, don't fail the request

        return ApprovalResponse(
            success=True,
            message=response_message,
            redirect_to_contact=redirect_to_contact
        )

    except Exception as e:
        logger.error(f"Error handling approval response: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process approval: {str(e)}"
        )


class ContactRequest(BaseModel):
    """Request for expert contact"""
    message: str = Field(..., min_length=1, description="User's message")
    selected_experts: Optional[list] = Field(default=[], description="List of selected expert IDs")


class ContactResponse(BaseModel):
    """Response for contact submission"""
    success: bool
    message: str


@router.post(
    "/contact/submit",
    response_model=ContactResponse,
    summary="Submit expert contact request",
    description="Submit expert contact form from artifact panel"
)
async def submit_expert_contact(
    request: ContactRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle expert contact form submission from artifact panel.
    """
    try:
        # Validate required fields
        if not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )

        # Save to database
        from fastapi_app.db.models import ContactRequest as ContactRequestModel

        contact_request = ContactRequestModel(
            user_id=current_user.id,
            name=current_user.full_name,
            email=current_user.username,  # username is email in this system
            company=None,  # Can be added later if needed
            message=request.message.strip(),
            source='artifact_panel',
            selected_experts=json.dumps(request.selected_experts) if request.selected_experts else None
        )
        db.add(contact_request)
        await db.commit()

        logger.info(f"Expert contact request saved: ID {contact_request.id} from {current_user.full_name} ({current_user.username})")

        # TODO: In production, implement:
        # 1. Send notification email to sales team
        # 2. Send confirmation email to user

        return ContactResponse(
            success=True,
            message="Thank you! Our experts will reach out within 24-48 hours."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing expert contact form: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred. Please try again."
        )

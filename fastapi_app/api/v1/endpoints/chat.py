"""
Chat API Endpoints - Real-time chat processing with streaming
Handles chat messages with SSE (Server-Sent Events) streaming
"""
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from fastapi_app.db.session import get_db
from fastapi_app.core.deps import get_current_active_user
from fastapi_app.db.models import User, Conversation, Message, UserSurvey, UserSurveyStage2
from fastapi_app.services.chat_processing_service import ChatProcessingService
from fastapi_app.services.agent_access_service import AgentAccessService

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize limiter for this router (disable in testing environment)
from fastapi_app.core.config import settings

if settings.ENVIRONMENT != "testing":
    limiter = Limiter(key_func=get_remote_address)

    # Helper to apply rate limiting decorator
    def rate_limit(limit_string: str):
        """Apply rate limiting decorator"""
        return limiter.limit(limit_string)
else:
    # No-op decorator for testing - doesn't apply any rate limiting
    def rate_limit(limit_string: str):
        """No-op decorator for testing"""
        def decorator(func):
            return func
        return decorator


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
@rate_limit("60/minute")  # 60 chat messages per minute per IP
async def send_chat_message(
    request: Request,  # Required for rate limiting (must be named 'request')
    chat_request: ChatRequest,
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
        user_message = chat_request.message.strip()
        conv_id = chat_request.conversation_id
        agent_type = chat_request.agent_type

        # Debug logging for unlimited queries investigation
        logger.info(f"[CHAT DEBUG] User {current_user.id} requesting agent '{agent_type}', plan_type={current_user.plan_type}, monthly_query_count={current_user.monthly_query_count}")

        # Input validation
        if not user_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty message"
            )

        # GDPR Article 18 - Check if processing is restricted
        if current_user.processing_restricted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Data processing is currently restricted",
                    "message": f"Your data processing has been restricted due to: {current_user.restriction_grounds}",
                    "note": "To resume using the chat service, please cancel the restriction in your profile settings.",
                    "restricted_at": current_user.restriction_requested_at.isoformat() if current_user.restriction_requested_at else None
                }
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
        logger.info(f"[CHAT DEBUG] can_user_access_agent result for user {current_user.id}, agent '{agent_type}': can_access={can_access}, reason={reason}")
        if not can_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=reason or "You do not have access to this agent"
            )

        # Update conversation agent type if changed
        if conversation.agent_type != agent_type:
            conversation.agent_type = agent_type
            await db.commit()

        # Check if user has unlimited queries for this specific agent (whitelist with unlimited_queries=True)
        has_unlimited = await AgentAccessService.has_unlimited_queries(
            db, current_user.id, agent_type
        )
        logger.info(f"[CHAT DEBUG] has_unlimited_queries result for user {current_user.id}, agent '{agent_type}': {has_unlimited}")

        # Skip query limit checks if user has unlimited access to this agent
        if has_unlimited:
            logger.info(f"User {current_user.id} has unlimited queries for agent '{agent_type}', skipping query limits")
            total_limit = float('inf')
            is_in_fallback_mode = False
        else:
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
        is_in_fallback_mode = False
        if not has_unlimited and current_user.role != 'admin' and current_user.monthly_query_count >= total_limit:
            # Check if user can use fallback mode (free users with fallback agents)
            if current_user.plan_type == 'free':
                # Check if the requested agent is available in fallback mode
                is_fallback_agent = await AgentAccessService.is_fallback_agent(db, agent_type)

                if is_fallback_agent:
                    # Check if user has daily free queries remaining
                    if current_user.can_use_fallback_agent():
                        is_in_fallback_mode = True
                        logger.info(f"User {current_user.id} using fallback mode for agent {agent_type}")
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail={
                                'error': 'Daily query limit reached. Sam is available with 10 queries per day.',
                                'plan_type': current_user.plan_type,
                                'queries_used': current_user.monthly_query_count,
                                'query_limit': total_limit if total_limit != float('inf') else 'unlimited',
                                'daily_queries_remaining': current_user.daily_free_queries or 0,
                                'upgrade_required': True,
                                'is_fallback_mode': True
                            }
                        )
                else:
                    # Agent not available in fallback, block access
                    queries_used = current_user.monthly_query_count
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail={
                            'error': f'Trial ended. Only Sam is available with 10 queries/day.',
                            'plan_type': current_user.plan_type,
                            'queries_used': queries_used,
                            'query_limit': total_limit if total_limit != float('inf') else 'unlimited',
                            'upgrade_required': True,
                            'is_fallback_mode': True,
                            'fallback_agent': 'seamless'
                        }
                    )
            else:
                # Non-free users who exceeded their limit
                queries_used = current_user.monthly_query_count
                plan_type = current_user.plan_type
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        'error': f'Query limit reached. You have used {queries_used}/{total_limit} queries this month.',
                        'plan_type': plan_type,
                        'queries_used': queries_used,
                        'query_limit': total_limit if total_limit != float('inf') else 'unlimited',
                        'upgrade_required': False
                    }
                )

        # Increment query count (or use daily free query for fallback mode)
        # Skip counting for users with unlimited queries for this agent
        try:
            if has_unlimited:
                # Don't count queries for users with unlimited access to this agent
                logger.info(f"Skipping query count for user {current_user.id} (unlimited access to '{agent_type}')")
            elif is_in_fallback_mode:
                # Use daily free query counter for fallback mode
                current_user.use_daily_free_query()
                logger.info(f"Daily free query used for user {current_user.id}, remaining: {current_user.daily_free_queries}")
            else:
                # Normal query count increment
                current_user.increment_query_count()
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
            # Streaming agents - return SSE response
            if agent_type == "news":
                return StreamingResponse(
                    ChatProcessingService.process_news_agent_stream(
                        db, user_message, conv_id, agent_type
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
                        db, user_message, conv_id, agent_type
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
                        db, user_message, conv_id, agent_type
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
                        db, user_message, conv_id, agent_type
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
                        db, user_message, conv_id, agent_type
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
                        db, user_message, conv_id, agent_type
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

            elif agent_type == "component_prices":
                return StreamingResponse(
                    ChatProcessingService.process_component_prices_agent_stream(
                        db, user_message, conv_id, agent_type
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

            elif agent_type == "seamless":
                return StreamingResponse(
                    ChatProcessingService.process_seamless_agent_stream(
                        db, user_message, conv_id, agent_type
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

            elif agent_type == "quality":
                return StreamingResponse(
                    ChatProcessingService.process_quality_agent_stream(
                        db, user_message, conv_id, agent_type
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

            elif agent_type == "storage_optimization":
                return StreamingResponse(
                    ChatProcessingService.process_storage_optimization_agent_stream(
                        db, user_message, conv_id, agent_type
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

            elif agent_type == "bipv_design":
                # BIPV Design agent - for text-only messages, use /send-with-images for image uploads
                return StreamingResponse(
                    ChatProcessingService.process_bipv_design_agent_stream(
                        db, user_message, conv_id, agent_type
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


@router.post(
    "/send-with-file",
    summary="Send chat message with file upload",
    description="Send a message with an optional file attachment for storage optimization agent"
)
@rate_limit("60/minute")
async def send_chat_message_with_file(
    request: Request,
    conversation_id: int = Form(...),
    message: str = Form(...),
    agent_type: str = Form(default="storage_optimization"),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a chat message with optional file attachment.

    This endpoint is specifically for the storage optimization agent
    which can process uploaded load profile data files.

    Supported file types: CSV, Excel (.xlsx, .xls), JSON
    Max file size: 10MB
    """
    try:
        user_message = message.strip()
        conv_id = conversation_id

        # Input validation
        if not user_message and not file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message or file is required"
            )

        # Validate file if provided
        file_content = None
        file_name = None
        if file:
            # Check file size (10MB limit)
            file_size = 0
            content = await file.read()
            file_size = len(content)
            await file.seek(0)  # Reset file pointer

            if file_size > 10 * 1024 * 1024:  # 10MB
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File size must be less than 10MB"
                )

            # Check file type
            file_name = file.filename or "unknown"
            file_ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
            allowed_extensions = ['csv', 'xlsx', 'xls', 'json']

            if file_ext not in allowed_extensions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
                )

            file_content = content
            logger.info(f"File uploaded: {file_name} ({file_size} bytes)")

        # GDPR Article 18 - Check if processing is restricted
        if current_user.processing_restricted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Data processing is currently restricted",
                    "message": f"Your data processing has been restricted due to: {current_user.restriction_grounds}",
                    "note": "To resume using the chat service, please cancel the restriction in your profile settings.",
                    "restricted_at": current_user.restriction_requested_at.isoformat() if current_user.restriction_requested_at else None
                }
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

        # Check if user has unlimited queries for this specific agent
        has_unlimited = await AgentAccessService.has_unlimited_queries(
            db, current_user.id, agent_type
        )

        if not has_unlimited:
            # Check query limits (simplified - reuse logic from main endpoint)
            base_limit = current_user.get_query_limit()
            total_limit = base_limit

            if current_user.plan_type == 'free':
                stage1_result = await db.execute(
                    select(UserSurvey).where(UserSurvey.user_id == current_user.id)
                )
                stage1_survey = stage1_result.scalar_one_or_none()
                if stage1_survey:
                    total_limit += stage1_survey.bonus_queries_granted

                stage2_result = await db.execute(
                    select(UserSurveyStage2).where(UserSurveyStage2.user_id == current_user.id)
                )
                stage2_survey = stage2_result.scalar_one_or_none()
                if stage2_survey:
                    total_limit += stage2_survey.bonus_queries_granted

            if current_user.role != 'admin' and current_user.monthly_query_count >= total_limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        'error': f'Query limit reached. You have used {current_user.monthly_query_count}/{total_limit} queries this month.',
                        'plan_type': current_user.plan_type,
                        'queries_used': current_user.monthly_query_count,
                        'query_limit': total_limit if total_limit != float('inf') else 'unlimited',
                        'upgrade_required': True
                    }
                )

            # Increment query count (only if not unlimited)
            current_user.increment_query_count()
        else:
            logger.info(f"User {current_user.id} has unlimited queries for agent '{agent_type}', skipping query limits")

        # Store user message (include file info if present)
        # Don't modify message_content - just store the original message
        # File info is stored in metadata for frontend display
        user_msg = Message(
            conversation_id=conv_id,
            sender='user',
            content=json.dumps({
                "type": "string",
                "value": user_message,  # Store original message without attachment text
                "comment": None,
                "file_name": file_name if file_name else None,
                "file_size": file_size if file_name else None
            })
        )
        db.add(user_msg)
        await db.commit()

        # Process with storage optimization agent (pass file content and user_id)
        return StreamingResponse(
            ChatProcessingService.process_storage_optimization_agent_stream(
                db, user_message, conv_id, agent_type, file_content, file_name, current_user.id
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat processing error with file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {str(e)}"
        )


@router.post(
    "/send-with-images",
    summary="Send chat message with image uploads",
    description="Send a message with image attachments for BIPV Design agent"
)
@rate_limit("30/minute")
async def send_chat_message_with_images(
    request: Request,
    conversation_id: int = Form(...),
    message: str = Form(...),
    agent_type: str = Form(default="bipv_design"),
    images: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a chat message with image attachments.

    This endpoint is specifically for the BIPV Design agent
    which processes building and PV module images to generate
    BIPV visualizations.

    Supported image types: JPEG, PNG, WebP
    Max image size: 10MB each
    Max images: 5 per request
    """
    from PIL import Image
    import io

    try:
        user_message = message.strip()
        conv_id = conversation_id

        # Input validation
        if not user_message and not images:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message or images are required"
            )

        # Validate images if provided
        pil_images = []
        image_info = []
        if images:
            # Check max images
            if len(images) > 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Maximum 5 images allowed per request"
                )

            allowed_types = ['image/jpeg', 'image/png', 'image/webp']

            for img_file in images:
                # Skip empty files
                if not img_file.filename:
                    continue

                # Check content type
                if img_file.content_type not in allowed_types:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid image type: {img_file.content_type}. Allowed: JPEG, PNG, WebP"
                    )

                # Read and check size
                content = await img_file.read()
                if len(content) > 10 * 1024 * 1024:  # 10MB
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Image '{img_file.filename}' exceeds 10MB limit"
                    )

                # Convert to PIL Image
                try:
                    pil_img = Image.open(io.BytesIO(content))
                    pil_images.append(pil_img)
                    image_info.append({
                        "filename": img_file.filename,
                        "size": len(content),
                        "dimensions": f"{pil_img.width}x{pil_img.height}"
                    })
                    logger.info(f"Image processed: {img_file.filename} ({len(content)} bytes, {pil_img.width}x{pil_img.height})")
                except Exception as img_error:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to process image '{img_file.filename}': {str(img_error)}"
                    )

        # GDPR Article 18 - Check if processing is restricted
        if current_user.processing_restricted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Data processing is currently restricted",
                    "message": f"Your data processing has been restricted due to: {current_user.restriction_grounds}",
                    "note": "To resume using the chat service, please cancel the restriction in your profile settings.",
                    "restricted_at": current_user.restriction_requested_at.isoformat() if current_user.restriction_requested_at else None
                }
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

        # Check if user has unlimited queries for this specific agent
        has_unlimited = await AgentAccessService.has_unlimited_queries(
            db, current_user.id, agent_type
        )

        if not has_unlimited:
            # Check query limits
            base_limit = current_user.get_query_limit()
            total_limit = base_limit

            if current_user.plan_type == 'free':
                stage1_result = await db.execute(
                    select(UserSurvey).where(UserSurvey.user_id == current_user.id)
                )
                stage1_survey = stage1_result.scalar_one_or_none()
                if stage1_survey:
                    total_limit += stage1_survey.bonus_queries_granted

                stage2_result = await db.execute(
                    select(UserSurveyStage2).where(UserSurveyStage2.user_id == current_user.id)
                )
                stage2_survey = stage2_result.scalar_one_or_none()
                if stage2_survey:
                    total_limit += stage2_survey.bonus_queries_granted

            if current_user.role != 'admin' and current_user.monthly_query_count >= total_limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        'error': f'Query limit reached. You have used {current_user.monthly_query_count}/{total_limit} queries this month.',
                        'plan_type': current_user.plan_type,
                        'queries_used': current_user.monthly_query_count,
                        'query_limit': total_limit if total_limit != float('inf') else 'unlimited',
                        'upgrade_required': True
                    }
                )

            # Increment query count (only if not unlimited)
            current_user.increment_query_count()
        else:
            logger.info(f"User {current_user.id} has unlimited queries for agent '{agent_type}', skipping query limits")

        # Store user message with image metadata
        user_msg = Message(
            conversation_id=conv_id,
            sender='user',
            content=json.dumps({
                "type": "string",
                "value": user_message,
                "comment": None,
                "images": image_info if image_info else None
            })
        )
        db.add(user_msg)
        await db.commit()

        # Extract filenames for module detection
        image_filenames = [info.get('filename') for info in image_info] if image_info else None

        # Process with BIPV design agent
        return StreamingResponse(
            ChatProcessingService.process_bipv_design_agent_stream(
                db, user_message, conv_id, agent_type,
                pil_images if pil_images else None,
                image_filenames
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat processing error with images: {e}", exc_info=True)
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
                # Get conversation to retrieve agent_type
                result = await db.execute(
                    select(Conversation).where(Conversation.id == request.conversation_id)
                )
                conversation = result.scalar_one_or_none()
                conversation_agent_type = conversation.agent_type if conversation else None

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
                    agent_type=conversation_agent_type,
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


# ============================================
# Dashboard Data Endpoint
# ============================================

@router.get(
    "/dashboard/{conversation_id}",
    summary="Get dashboard data for a conversation",
    description="Fetch dashboard visualization data for storage optimization results"
)
async def get_dashboard_data(
    conversation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get dashboard data for a conversation.

    This endpoint retrieves ALL dashboard_data from ALL bot messages
    in the conversation that contain dashboard visualization data.
    This allows users to view optimization results from earlier messages.

    Returns:
        - all_dashboard_results: Array of all optimization results across the conversation
        - dashboard_data: The most recent result (backward compatibility)
        - 404 if no dashboard data exists for this conversation
    """
    try:
        # Verify user owns this conversation
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id
            )
        )
        conversation = result.scalar_one_or_none()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Get ALL bot messages with storage_optimization agent type (oldest first)
        result = await db.execute(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.sender == 'bot',
                Message.agent_type == 'storage_optimization'
            )
            .order_by(Message.timestamp.asc())  # Oldest first to maintain order
        )
        messages = result.scalars().all()

        if not messages:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No storage optimization message found"
            )

        # Collect ALL dashboard results from ALL messages in the conversation
        all_conversation_results = []
        latest_dashboard_data = None
        latest_message_id = None
        latest_timestamp = None

        for message in messages:
            try:
                content = json.loads(message.content)

                # Check for multi-result format first
                msg_results = content.get('all_dashboard_results')
                msg_dashboard = content.get('dashboard_data')

                if msg_results:
                    # Add all results from this message
                    for result_item in msg_results:
                        all_conversation_results.append(result_item)
                    # Track latest for backward compatibility
                    if msg_dashboard:
                        latest_dashboard_data = msg_dashboard
                        latest_message_id = message.id
                        latest_timestamp = message.timestamp
                elif msg_dashboard:
                    # Single result in old format - convert to array format
                    strategy = msg_dashboard.get('strategy', 'Optimization')
                    pv_size = msg_dashboard.get('optimized_design', {}).get('pv_size', 0)
                    battery_size = msg_dashboard.get('optimized_design', {}).get('battery_size', 0)
                    label = f"{strategy.replace('_', ' ').title()} - {pv_size:.1f} kWp / {battery_size:.1f} kWh"

                    all_conversation_results.append({
                        "label": label,
                        "data": msg_dashboard
                    })
                    latest_dashboard_data = msg_dashboard
                    latest_message_id = message.id
                    latest_timestamp = message.timestamp

            except json.JSONDecodeError:
                # Skip messages with invalid JSON
                logger.warning(f"Failed to parse message {message.id} content")
                continue

        if not all_conversation_results:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No dashboard data found in conversation"
            )

        # Return all results from the entire conversation
        return {
            "success": True,
            "dashboard_data": latest_dashboard_data,  # backward compatibility (most recent)
            "all_dashboard_results": all_conversation_results,  # ALL results from conversation
            "result_count": len(all_conversation_results),
            "message_id": latest_message_id,
            "timestamp": latest_timestamp.isoformat() if latest_timestamp else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching dashboard data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard data: {str(e)}"
        )


# ============================================
# Image Cache Endpoints (for BIPV Design Agent)
# ============================================

@router.get(
    "/images/{image_id}",
    summary="Get cached image",
    description="Retrieve a generated image by its ID"
)
async def get_cached_image(
    image_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve a generated image from the cache.
    Used by BIPV Design agent to avoid streaming large base64 data through SSE.

    Returns:
        Image bytes with appropriate content type
    """
    from fastapi.responses import Response
    from fastapi_app.services.image_cache_service import get_image_cache

    cache = get_image_cache()
    result = cache.get_image_bytes(image_id)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found or expired"
        )

    image_bytes, mime_type = result

    return Response(
        content=image_bytes,
        media_type=mime_type,
        headers={
            "Cache-Control": "private, max-age=900",  # Cache for 15 minutes
            "Content-Disposition": f"inline; filename=bipv_design_{image_id[:8]}.jpg"
        }
    )


@router.get(
    "/images/{image_id}/metadata",
    summary="Get cached image metadata",
    description="Retrieve metadata for a generated image (without the image data)"
)
async def get_cached_image_metadata(
    image_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieve metadata for a generated image without the full image data.
    Useful for checking if an image exists and getting its info.
    """
    from fastapi_app.services.image_cache_service import get_image_cache

    cache = get_image_cache()
    image = cache.get_image(image_id)

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found or expired"
        )

    return {
        "image_id": image_id,
        "mime_type": image['mime_type'],
        "title": image.get('title'),
        "data_size": len(image['image_data'])
    }


@router.get(
    "/check-unlimited-access/{agent_type}",
    summary="Check unlimited access for agent",
    description="Check if the current user has unlimited queries access to a specific agent"
)
async def check_unlimited_access(
    agent_type: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if the current user has unlimited queries access to a specific agent.
    This is used by the frontend to bypass local query limit checks for whitelisted users.

    Returns:
        - has_unlimited: True if user has unlimited queries for this agent
        - agent_type: The agent type checked
    """
    has_unlimited = await AgentAccessService.has_unlimited_queries(
        db, current_user.id, agent_type
    )

    return {
        "has_unlimited": has_unlimited,
        "agent_type": agent_type,
        "user_id": current_user.id
    }


@router.get(
    "/unlimited-access-agents",
    summary="Get all agents with unlimited access",
    description="Get list of all agent types that the current user has unlimited queries access to"
)
async def get_unlimited_access_agents(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all agent types that the current user has unlimited queries access to via whitelist.
    This is used by the Agents page to show which agents should be available
    even when the user is in fallback mode (trial exhausted).

    Returns:
        - agents: List of agent types with unlimited access
        - user_id: The user's ID
    """
    agents = await AgentAccessService.get_unlimited_access_agents(
        db, current_user.id
    )

    return {
        "agents": agents,
        "user_id": current_user.id
    }

"""
Conversation endpoints - FastAPI version

Handles conversation and message operations:
- Create, read, update, delete conversations
- Message management
- Conversation history
- Auto-title generation
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from fastapi_app.core.deps import get_current_active_user
from fastapi_app.db.session import get_db
from fastapi_app.db.models import User, Conversation, Message
from fastapi_app.services.conversation_service import ConversationService

router = APIRouter()


# ============================================================================
# Pydantic Schemas
# ============================================================================

class ConversationCreate(BaseModel):
    """Schema for creating a conversation"""
    agent_type: str = Field(default="market", description="Type of agent (market, solar, price, etc.)")
    title: Optional[str] = Field(None, description="Optional conversation title")


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation"""
    title: str = Field(..., min_length=1, max_length=256, description="New conversation title")


class ConversationResponse(BaseModel):
    """Schema for conversation response"""
    id: int
    title: Optional[str]
    agent_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    """Schema for conversation list item with preview"""
    id: int
    title: Optional[str]
    preview: str
    agent_type: str
    created_at: datetime
    message_count: int


class MessageCreate(BaseModel):
    """Schema for creating a message"""
    sender: str = Field(..., description="'user' or 'bot'")
    content: str = Field(..., description="Message content (JSON string or plain text)")


class MessageResponse(BaseModel):
    """Schema for message response"""
    id: int
    conversation_id: int
    sender: str
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True


class MessageForAgent(BaseModel):
    """Schema for message formatted for AI agent"""
    role: str
    content: str
    timestamp: str


class GenericMessage(BaseModel):
    """Generic message response"""
    message: str


class ConversationStats(BaseModel):
    """Conversation statistics"""
    total_conversations: int
    total_messages: int
    conversations_by_agent: dict


# ============================================================================
# Conversation Endpoints
# ============================================================================

@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED, tags=["Conversations"])
async def create_conversation(
    conversation_data: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new conversation

    **Requires**: Authentication (Bearer token)

    **Parameters**:
    - agent_type: Type of agent (default: "market")
    - title: Optional conversation title

    **Returns**: Created conversation
    """
    conversation, error = await ConversationService.create_conversation(
        db=db,
        user_id=current_user.id,
        agent_type=conversation_data.agent_type,
        title=conversation_data.title
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return conversation


@router.get("/", response_model=List[ConversationListItem], tags=["Conversations"])
async def list_conversations(
    agent_type: Optional[str] = None,
    limit: int = 50,
    include_message_count: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List user's conversations

    **Requires**: Authentication (Bearer token)

    **Query Parameters**:
    - agent_type: Filter by agent type (optional)
    - limit: Maximum number of conversations (default: 50)
    - include_message_count: Include message count (default: true)

    **Returns**: List of conversations with preview and metadata
    """
    conversations = await ConversationService.get_user_conversations(
        db=db,
        user_id=current_user.id,
        agent_type=agent_type,
        limit=limit,
        include_message_count=include_message_count
    )

    return conversations


@router.get("/{conversation_id}", response_model=ConversationResponse, tags=["Conversations"])
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get conversation by ID

    **Requires**: Authentication (Bearer token)

    **Authorization**: User can only access their own conversations

    **Returns**: Conversation details
    """
    conversation, error = await ConversationService.get_conversation(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )

    return conversation


@router.put("/{conversation_id}", response_model=GenericMessage, tags=["Conversations"])
async def update_conversation(
    conversation_id: int,
    conversation_data: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update conversation title

    **Requires**: Authentication (Bearer token)

    **Authorization**: User can only update their own conversations

    **Returns**: Success message
    """
    success, error = await ConversationService.update_conversation_title(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        title=conversation_data.title
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "not found" in error.lower() else status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {"message": "Conversation title updated successfully"}


@router.delete("/{conversation_id}", response_model=GenericMessage, tags=["Conversations"])
async def delete_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete conversation and all its messages

    **Requires**: Authentication (Bearer token)

    **Authorization**: User can only delete their own conversations

    **Warning**: This action cannot be undone!

    **Returns**: Success message
    """
    success, error = await ConversationService.delete_conversation(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "not found" in error.lower() else status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {"message": "Conversation deleted successfully"}


@router.get("/fresh/create-or-get", response_model=dict, tags=["Conversations"])
async def get_or_create_fresh_conversation(
    agent_type: str = "market",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get an empty conversation or create a new one

    **Requires**: Authentication (Bearer token)

    **Optimization**: Reuses empty conversations to reduce database bloat

    **Query Parameters**:
    - agent_type: Type of agent (default: "market")

    **Returns**: Conversation ID
    """
    conversation_id, error = await ConversationService.get_or_create_fresh_conversation(
        db=db,
        user_id=current_user.id,
        agent_type=agent_type
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {"conversation_id": conversation_id}


# ============================================================================
# Message Endpoints
# ============================================================================

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse], tags=["Messages"])
async def get_messages(
    conversation_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get messages for a conversation

    **Requires**: Authentication (Bearer token)

    **Authorization**: User can only access messages from their own conversations

    **Query Parameters**:
    - limit: Maximum number of messages (default: 50)

    **Returns**: List of messages in chronological order
    """
    messages, error = await ConversationService.get_conversation_messages(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        limit=limit
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "not found" in error.lower() else status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return messages


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, tags=["Messages"])
async def save_message(
    conversation_id: int,
    message_data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Save a message to a conversation

    **Requires**: Authentication (Bearer token)

    **Authorization**: User can only save messages to their own conversations

    **Parameters**:
    - sender: 'user' or 'bot'
    - content: Message content (JSON string or plain text)

    **Returns**: Created message
    """
    # Validate sender
    if message_data.sender not in ['user', 'bot']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sender must be 'user' or 'bot'"
        )

    message, error = await ConversationService.save_message(
        db=db,
        conversation_id=conversation_id,
        sender=message_data.sender,
        content=message_data.content,
        user_id=current_user.id
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "not found" in error.lower() else status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return message


@router.get("/{conversation_id}/messages/for-agent", response_model=List[MessageForAgent], tags=["Messages"])
async def get_messages_for_agent(
    conversation_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get messages formatted for AI agent consumption

    **Requires**: Authentication (Bearer token)

    **Authorization**: User can only access messages from their own conversations

    **Query Parameters**:
    - limit: Maximum number of messages (default: 50)

    **Returns**: Messages formatted with 'role' and 'content' for AI

    **Note**: 'user' sender becomes 'user' role, 'bot' becomes 'assistant'
    """
    # First verify user has access to this conversation
    conversation, error = await ConversationService.get_conversation(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error
        )

    messages = await ConversationService.get_messages_for_agent(
        db=db,
        conversation_id=conversation_id,
        limit=limit
    )

    return messages


@router.delete("/{conversation_id}/messages", response_model=GenericMessage, tags=["Messages"])
async def clear_messages(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Clear all messages from a conversation

    **Requires**: Authentication (Bearer token)

    **Authorization**: User can only clear messages from their own conversations

    **Warning**: This action cannot be undone!

    **Returns**: Success message
    """
    success, error = await ConversationService.clear_conversation_messages(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "not found" in error.lower() else status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {"message": "All messages cleared successfully"}


# ============================================================================
# Utility Endpoints
# ============================================================================

@router.post("/{conversation_id}/generate-title", response_model=GenericMessage, tags=["Utilities"])
async def auto_generate_title(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Auto-generate conversation title from first user message

    **Requires**: Authentication (Bearer token)

    **Authorization**: User can only generate titles for their own conversations

    **Behavior**:
    - Uses first user message content (up to 6 words)
    - Won't override existing custom titles
    - Falls back to generic title if parsing fails

    **Returns**: Success message
    """
    success, error = await ConversationService.auto_generate_conversation_title(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND if "not found" in error.lower() else status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {"message": "Title generated successfully"}


@router.post("/cleanup/empty", response_model=dict, tags=["Utilities"])
async def cleanup_empty_conversations(
    days_old: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Clean up empty conversations older than specified days

    **Requires**: Authentication (Bearer token)

    **Query Parameters**:
    - days_old: Delete empty conversations older than this many days (default: 7)

    **Behavior**:
    - Only deletes user's own empty conversations
    - Empty = no messages
    - Helps reduce database bloat

    **Returns**: Number of conversations deleted
    """
    deleted_count, error = await ConversationService.cleanup_empty_conversations(
        db=db,
        user_id=current_user.id,
        days_old=days_old
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )

    return {
        "deleted_count": deleted_count,
        "message": f"Deleted {deleted_count} empty conversations"
    }

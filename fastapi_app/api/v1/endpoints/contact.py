"""
Contact Request Endpoints
Handles contact form submissions from the landing page
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
import logging

from fastapi_app.db.session import get_db
from fastapi_app.db.models import ContactRequest

logger = logging.getLogger(__name__)

router = APIRouter()


class ContactSubmitRequest(BaseModel):
    """Contact form submission schema"""
    name: str
    email: EmailStr
    company: str | None = None
    message: str


@router.post("/submit")
async def submit_contact(
    contact_data: ContactSubmitRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a contact request from the landing page

    Args:
        contact_data: Contact form data
        db: Database session

    Returns:
        Success message
    """
    try:
        # Create new contact request
        contact = ContactRequest(
            name=contact_data.name,
            email=contact_data.email,
            company=contact_data.company,
            message=contact_data.message,
            source='landing_page'  # Contact requests from landing page
        )

        db.add(contact)
        await db.commit()
        await db.refresh(contact)

        logger.info(f"📧 Contact request received from {contact_data.email}")

        return {
            "success": True,
            "message": "Thank you for your message! We'll get back to you soon."
        }

    except Exception as e:
        logger.error(f"❌ Error saving contact request: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to submit contact request. Please try again."
        )

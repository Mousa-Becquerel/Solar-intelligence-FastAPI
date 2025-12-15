"""
Load Profile Service - Manages user-uploaded load profiles for storage optimization.

Provides async CRUD operations for load profiles stored in the database.
Supports multiple profiles per conversation with naming and activation.
"""
import json
import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from datetime import datetime

from fastapi_app.db.models import ConversationLoadProfile

logger = logging.getLogger(__name__)


class LoadProfileService:
    """Service for managing conversation load profiles in the database."""

    @staticmethod
    async def save_load_profile(
        db: AsyncSession,
        conversation_id: int,
        user_id: int,
        profile_data: List[float],
        file_name: str,
        name: Optional[str] = None,
        set_active: bool = True
    ) -> ConversationLoadProfile:
        """
        Save a new load profile to the database.

        Args:
            db: Database session
            conversation_id: The conversation this profile belongs to
            user_id: The user who uploaded the profile
            profile_data: List of 8760 hourly load values
            file_name: Original uploaded file name
            name: User-friendly name for the profile (defaults to file name)
            set_active: Whether to set this as the active profile (deactivates others)

        Returns:
            The created ConversationLoadProfile record
        """
        # Generate name from file name if not provided
        if not name:
            # Remove extension and use as name
            name = file_name.rsplit('.', 1)[0] if '.' in file_name else file_name

        # Check if a profile with this name already exists for this conversation
        existing = await db.execute(
            select(ConversationLoadProfile).where(
                and_(
                    ConversationLoadProfile.conversation_id == conversation_id,
                    ConversationLoadProfile.name == name
                )
            )
        )
        existing_profile = existing.scalar_one_or_none()

        if existing_profile:
            # Update existing profile instead of creating new one
            existing_profile.profile_data = json.dumps(profile_data)
            existing_profile.file_name = file_name
            existing_profile.annual_demand_kwh = sum(profile_data)
            existing_profile.hours_count = len(profile_data)
            existing_profile.is_daily_profile = len(profile_data) == 24
            existing_profile.updated_at = datetime.utcnow()

            if set_active:
                # Deactivate all other profiles for this conversation
                await db.execute(
                    update(ConversationLoadProfile)
                    .where(
                        and_(
                            ConversationLoadProfile.conversation_id == conversation_id,
                            ConversationLoadProfile.id != existing_profile.id
                        )
                    )
                    .values(is_active=False)
                )
                existing_profile.is_active = True

            await db.commit()
            await db.refresh(existing_profile)
            logger.info(f"Updated load profile '{name}' for conversation {conversation_id}")
            return existing_profile

        # Deactivate other profiles if this one should be active
        if set_active:
            await db.execute(
                update(ConversationLoadProfile)
                .where(ConversationLoadProfile.conversation_id == conversation_id)
                .values(is_active=False)
            )

        # Create new profile
        annual_demand = sum(profile_data)
        is_daily = len(profile_data) == 24

        profile = ConversationLoadProfile(
            conversation_id=conversation_id,
            user_id=user_id,
            name=name,
            file_name=file_name,
            profile_data=json.dumps(profile_data),
            annual_demand_kwh=annual_demand,
            hours_count=len(profile_data) if not is_daily else 8760,
            is_daily_profile=is_daily,
            is_active=set_active
        )

        db.add(profile)
        await db.commit()
        await db.refresh(profile)

        logger.info(f"Saved new load profile '{name}' for conversation {conversation_id}: {annual_demand:.0f} kWh/year")
        return profile

    @staticmethod
    async def get_active_profile(
        db: AsyncSession,
        conversation_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get the active load profile for a conversation.

        Args:
            db: Database session
            conversation_id: The conversation ID

        Returns:
            Dictionary with profile data or None if no active profile exists
        """
        result = await db.execute(
            select(ConversationLoadProfile).where(
                and_(
                    ConversationLoadProfile.conversation_id == conversation_id,
                    ConversationLoadProfile.is_active == True
                )
            )
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return None

        return {
            "id": profile.id,
            "name": profile.name,
            "file_name": profile.file_name,
            "profile_data": json.loads(profile.profile_data),
            "annual_demand_kwh": profile.annual_demand_kwh,
            "hours_count": profile.hours_count,
            "is_daily_profile": profile.is_daily_profile,
            "created_at": profile.created_at.isoformat() if profile.created_at else None
        }

    @staticmethod
    async def get_all_profiles(
        db: AsyncSession,
        conversation_id: int
    ) -> List[Dict[str, Any]]:
        """
        Get all load profiles for a conversation.

        Args:
            db: Database session
            conversation_id: The conversation ID

        Returns:
            List of profile summaries (without full profile data for efficiency)
        """
        result = await db.execute(
            select(ConversationLoadProfile)
            .where(ConversationLoadProfile.conversation_id == conversation_id)
            .order_by(ConversationLoadProfile.created_at.desc())
        )
        profiles = result.scalars().all()

        return [
            {
                "id": p.id,
                "name": p.name,
                "file_name": p.file_name,
                "annual_demand_kwh": p.annual_demand_kwh,
                "hours_count": p.hours_count,
                "is_daily_profile": p.is_daily_profile,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None
            }
            for p in profiles
        ]

    @staticmethod
    async def get_profile_by_id(
        db: AsyncSession,
        profile_id: int,
        conversation_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get a specific load profile by ID.

        Args:
            db: Database session
            profile_id: The profile ID
            conversation_id: The conversation ID (for verification)

        Returns:
            Dictionary with full profile data or None if not found
        """
        result = await db.execute(
            select(ConversationLoadProfile).where(
                and_(
                    ConversationLoadProfile.id == profile_id,
                    ConversationLoadProfile.conversation_id == conversation_id
                )
            )
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return None

        return {
            "id": profile.id,
            "name": profile.name,
            "file_name": profile.file_name,
            "profile_data": json.loads(profile.profile_data),
            "annual_demand_kwh": profile.annual_demand_kwh,
            "hours_count": profile.hours_count,
            "is_daily_profile": profile.is_daily_profile,
            "is_active": profile.is_active,
            "created_at": profile.created_at.isoformat() if profile.created_at else None
        }

    @staticmethod
    async def get_profile_by_name(
        db: AsyncSession,
        conversation_id: int,
        name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a load profile by name.

        Args:
            db: Database session
            conversation_id: The conversation ID
            name: The profile name to look up

        Returns:
            Dictionary with full profile data or None if not found
        """
        result = await db.execute(
            select(ConversationLoadProfile).where(
                and_(
                    ConversationLoadProfile.conversation_id == conversation_id,
                    ConversationLoadProfile.name == name
                )
            )
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return None

        return {
            "id": profile.id,
            "name": profile.name,
            "file_name": profile.file_name,
            "profile_data": json.loads(profile.profile_data),
            "annual_demand_kwh": profile.annual_demand_kwh,
            "hours_count": profile.hours_count,
            "is_daily_profile": profile.is_daily_profile,
            "is_active": profile.is_active,
            "created_at": profile.created_at.isoformat() if profile.created_at else None
        }

    @staticmethod
    async def set_active_profile(
        db: AsyncSession,
        conversation_id: int,
        profile_id: int
    ) -> bool:
        """
        Set a specific profile as the active one for optimization.

        Args:
            db: Database session
            conversation_id: The conversation ID
            profile_id: The profile ID to activate

        Returns:
            True if successful, False if profile not found
        """
        # Verify profile exists
        result = await db.execute(
            select(ConversationLoadProfile).where(
                and_(
                    ConversationLoadProfile.id == profile_id,
                    ConversationLoadProfile.conversation_id == conversation_id
                )
            )
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return False

        # Deactivate all profiles for this conversation
        await db.execute(
            update(ConversationLoadProfile)
            .where(ConversationLoadProfile.conversation_id == conversation_id)
            .values(is_active=False)
        )

        # Activate the selected profile
        profile.is_active = True
        await db.commit()

        logger.info(f"Set profile '{profile.name}' (ID: {profile_id}) as active for conversation {conversation_id}")
        return True

    @staticmethod
    async def delete_profile(
        db: AsyncSession,
        conversation_id: int,
        profile_id: int
    ) -> bool:
        """
        Delete a load profile.

        Args:
            db: Database session
            conversation_id: The conversation ID
            profile_id: The profile ID to delete

        Returns:
            True if deleted, False if not found
        """
        result = await db.execute(
            select(ConversationLoadProfile).where(
                and_(
                    ConversationLoadProfile.id == profile_id,
                    ConversationLoadProfile.conversation_id == conversation_id
                )
            )
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return False

        await db.delete(profile)
        await db.commit()

        logger.info(f"Deleted load profile '{profile.name}' (ID: {profile_id}) from conversation {conversation_id}")
        return True

    @staticmethod
    async def rename_profile(
        db: AsyncSession,
        conversation_id: int,
        profile_id: int,
        new_name: str
    ) -> bool:
        """
        Rename a load profile.

        Args:
            db: Database session
            conversation_id: The conversation ID
            profile_id: The profile ID to rename
            new_name: The new name for the profile

        Returns:
            True if renamed, False if not found or name conflict
        """
        # Check if new name already exists
        existing = await db.execute(
            select(ConversationLoadProfile).where(
                and_(
                    ConversationLoadProfile.conversation_id == conversation_id,
                    ConversationLoadProfile.name == new_name,
                    ConversationLoadProfile.id != profile_id
                )
            )
        )
        if existing.scalar_one_or_none():
            logger.warning(f"Cannot rename profile: name '{new_name}' already exists in conversation {conversation_id}")
            return False

        # Get the profile to rename
        result = await db.execute(
            select(ConversationLoadProfile).where(
                and_(
                    ConversationLoadProfile.id == profile_id,
                    ConversationLoadProfile.conversation_id == conversation_id
                )
            )
        )
        profile = result.scalar_one_or_none()

        if not profile:
            return False

        old_name = profile.name
        profile.name = new_name
        profile.updated_at = datetime.utcnow()
        await db.commit()

        logger.info(f"Renamed load profile from '{old_name}' to '{new_name}' in conversation {conversation_id}")
        return True

"""
Agent Access Service - Async version for FastAPI
Handles agent access control, whitelisting, and plan-based restrictions
"""
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from sqlalchemy import select, and_, or_, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from fastapi_app.db.models import User, HiredAgent, AgentAccess, AgentWhitelist, UserSurvey, UserSurveyStage2

logger = logging.getLogger(__name__)


class AgentAccessService:
    """Service for managing agent access control"""

    # Plan hierarchy for access control
    # Higher number = more access
    PLAN_HIERARCHY = {
        'free': 0,
        'analyst': 1,
        'strategist': 2,
        'enterprise': 3,
        'admin': 99,
        # Legacy support (map old plan names)
        'premium': 2,  # Treat as strategist
        'max': 3,  # Treat as enterprise
    }

    @staticmethod
    async def can_user_access_agent(
        db: AsyncSession,
        user: User,
        agent_type: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if a user can access a specific agent

        Access logic hierarchy:
        1. Check if agent is enabled globally
        2. Admin users can access all agents
        3. Whitelisted users have highest priority
        4. Users who hired before restrictions (grandfathered)
        5. User's plan must meet required plan level

        Args:
            db: Database session
            user: User object
            agent_type: Type of agent (e.g., 'market', 'technical', 'expert')

        Returns:
            Tuple[bool, Optional[str]]: (can_access, reason_if_denied)
        """
        try:
            # Check if user is provided
            if not user:
                return False, "Authentication required"
            # 1. Check if agent is enabled globally
            result = await db.execute(
                select(AgentAccess).where(AgentAccess.agent_type == agent_type)
            )
            agent_config = result.scalar_one_or_none()

            if not agent_config:
                logger.warning(f"Agent type '{agent_type}' not found in configuration")
                return False, f"Agent '{agent_type}' is not configured"

            if not agent_config.is_enabled:
                logger.info(f"Agent '{agent_type}' is globally disabled")
                return False, f"Agent '{agent_type}' is currently unavailable"

            # 2. Admin users can access all agents
            if user.role == 'admin':
                logger.debug(f"Admin user {user.id} granted access to '{agent_type}'")
                return True, None

            # 3. Check if user is whitelisted (highest priority)
            result = await db.execute(
                select(AgentWhitelist).where(
                    and_(
                        AgentWhitelist.agent_type == agent_type,
                        AgentWhitelist.user_id == user.id,
                        AgentWhitelist.is_active == True,
                        or_(
                            AgentWhitelist.expires_at.is_(None),
                            AgentWhitelist.expires_at > datetime.utcnow()
                        )
                    )
                )
            )
            whitelist_entry = result.scalar_one_or_none()

            if whitelist_entry:
                logger.info(f"User {user.id} has whitelist access to '{agent_type}'")
                return True, None

            # 4. Check if user has hired the agent (REQUIRED for access)
            result = await db.execute(
                select(HiredAgent).where(
                    and_(
                        HiredAgent.user_id == user.id,
                        HiredAgent.agent_type == agent_type,
                        HiredAgent.is_active == True
                    )
                )
            )
            hired_agent = result.scalar_one_or_none()

            if not hired_agent:
                logger.info(f"User {user.id} denied access to '{agent_type}': agent not hired")
                return False, "You must hire this agent from the Agents page first"

            # 5. Check if user's plan meets required plan level
            required_plan = agent_config.required_plan
            user_plan = user.plan_type or 'free'

            user_plan_level = AgentAccessService.PLAN_HIERARCHY.get(user_plan, 0)
            required_plan_level = AgentAccessService.PLAN_HIERARCHY.get(required_plan, 0)

            # Free users can access ALL agents during their trial period
            # Trial = base 5 queries + 5 after survey 1 + 5 after survey 2 = 15 total
            # After trial, they can only access fallback agents (Sam)
            if user_plan == 'free':
                # Calculate total query limit including survey bonuses
                base_limit = user.get_query_limit()  # Returns 5 for free tier
                total_limit = base_limit

                # Add survey bonuses
                stage1_result = await db.execute(
                    select(UserSurvey).where(UserSurvey.user_id == user.id)
                )
                stage1_survey = stage1_result.scalar_one_or_none()
                if stage1_survey:
                    total_limit += stage1_survey.bonus_queries_granted

                stage2_result = await db.execute(
                    select(UserSurveyStage2).where(UserSurveyStage2.user_id == user.id)
                )
                stage2_survey = stage2_result.scalar_one_or_none()
                if stage2_survey:
                    total_limit += stage2_survey.bonus_queries_granted

                if user.monthly_query_count >= total_limit:
                    # User has exhausted trial - check if agent is available in fallback
                    if agent_config.available_in_fallback:
                        logger.info(f"Free user {user.id} in fallback mode granted access to '{agent_type}': fallback agent")
                        return True, None
                    else:
                        logger.info(f"Free user {user.id} denied access to '{agent_type}': trial exhausted, not a fallback agent")
                        return False, "Your trial has ended. Only Sam is available in the free tier. Please upgrade to continue using this agent."
                else:
                    # Still in trial period
                    logger.info(f"Free user {user.id} granted trial access to '{agent_type}': hired during trial period")
                    return True, None

            if user_plan_level >= required_plan_level:
                logger.info(f"User {user.id} granted access to '{agent_type}': hired and plan '{user_plan}' meets requirement '{required_plan}'")
                return True, None

            # Access denied - hired but plan insufficient (e.g., Analyst trying to access Strategist agents)
            logger.info(f"User {user.id} denied access to '{agent_type}': hired but plan '{user_plan}' < required '{required_plan}'")
            return False, f"This agent requires a '{required_plan}' plan or higher. Please upgrade your plan."

        except Exception as e:
            logger.error(f"Error checking agent access for user {user.id}, agent '{agent_type}': {str(e)}")
            return False, "An error occurred while checking access permissions"

    @staticmethod
    async def is_fallback_agent(db: AsyncSession, agent_type: str) -> bool:
        """Check if an agent is available in fallback mode (for free users after queries exhausted)"""
        try:
            result = await db.execute(
                select(AgentAccess).where(AgentAccess.agent_type == agent_type)
            )
            agent_config = result.scalar_one_or_none()
            return agent_config.available_in_fallback if agent_config else False
        except Exception as e:
            logger.error(f"Error checking fallback status for agent '{agent_type}': {str(e)}")
            return False

    @staticmethod
    async def get_fallback_agents(db: AsyncSession) -> List[str]:
        """Get list of agents available in fallback mode"""
        try:
            result = await db.execute(
                select(AgentAccess.agent_type).where(AgentAccess.available_in_fallback == True)
            )
            return list(result.scalars().all())
        except Exception as e:
            logger.error(f"Error getting fallback agents: {str(e)}")
            return []

    @staticmethod
    async def get_user_accessible_agents(
        db: AsyncSession,
        user: User
    ) -> List[Dict[str, Any]]:
        """
        Get list of all agents with access status for user

        Args:
            db: Database session
            user: User object

        Returns:
            List of dicts with agent info and access status
            Example:
            [
                {
                    "agent_type": "market",
                    "description": "Market Intelligence Agent",
                    "required_plan": "free",
                    "is_enabled": True,
                    "can_access": True,
                    "access_reason": None,  # or "Requires premium plan"
                    "is_whitelisted": False,
                    "is_grandfathered": False
                },
                ...
            ]
        """
        try:
            # Get all agent configurations
            result = await db.execute(
                select(AgentAccess).order_by(AgentAccess.agent_type)
            )
            agent_configs = result.scalars().all()

            # Get user's whitelisted agents
            result = await db.execute(
                select(AgentWhitelist.agent_type).where(
                    and_(
                        AgentWhitelist.user_id == user.id,
                        AgentWhitelist.is_active == True,
                        or_(
                            AgentWhitelist.expires_at.is_(None),
                            AgentWhitelist.expires_at > datetime.utcnow()
                        )
                    )
                )
            )
            whitelisted_agents = set(result.scalars().all())

            # Get user's grandfathered agents
            result = await db.execute(
                select(HiredAgent.agent_type).where(
                    and_(
                        HiredAgent.user_id == user.id,
                        HiredAgent.is_active == True
                    )
                )
            )
            hired_agents = {row for row in result.scalars().all()}

            # Build response
            agents_list = []
            for agent_config in agent_configs:
                agent_type = agent_config.agent_type

                # Check access
                can_access, access_reason = await AgentAccessService.can_user_access_agent(
                    db, user, agent_type
                )

                # Filter agents based on user plan type
                if user.plan_type == 'premium':
                    # Premium users: ONLY show hired or whitelisted agents
                    if agent_type not in hired_agents and agent_type not in whitelisted_agents:
                        continue
                elif user.plan_type == 'free':
                    # Free users: show free tier agents OR hired/whitelisted agents
                    if agent_config.required_plan != 'free':
                        if agent_type not in hired_agents and agent_type not in whitelisted_agents:
                            continue

                # Check if grandfathered
                is_grandfathered = False
                if agent_type in hired_agents:
                    result = await db.execute(
                        select(HiredAgent).where(
                            and_(
                                HiredAgent.user_id == user.id,
                                HiredAgent.agent_type == agent_type,
                                HiredAgent.is_active == True,
                                HiredAgent.hired_at < agent_config.created_at
                            )
                        )
                    )
                    is_grandfathered = result.scalar_one_or_none() is not None

                agents_list.append({
                    "agent_type": agent_type,
                    "description": agent_config.description,
                    "required_plan": agent_config.required_plan,
                    "is_enabled": agent_config.is_enabled,
                    "can_access": can_access,
                    "access_reason": access_reason,
                    "is_whitelisted": agent_type in whitelisted_agents,
                    "is_grandfathered": is_grandfathered,
                    "is_hired": agent_type in hired_agents
                })

            logger.debug(f"Retrieved {len(agents_list)} agents for user {user.id}")
            return agents_list

        except Exception as e:
            logger.error(f"Error getting accessible agents for user {user.id}: {str(e)}")
            return []

    @staticmethod
    async def grant_user_access(
        db: AsyncSession,
        agent_type: str,
        user_id: int,
        granted_by: int,
        expires_at: Optional[datetime] = None,
        reason: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Grant a user access to an agent via whitelist (admin function)

        Args:
            db: Database session
            agent_type: Type of agent
            user_id: User to grant access to
            granted_by: Admin user ID granting access
            expires_at: Optional expiration date
            reason: Optional reason for granting access

        Returns:
            Tuple[bool, Optional[str]]: (success, error_message)
        """
        try:
            # Verify agent exists
            result = await db.execute(
                select(AgentAccess).where(AgentAccess.agent_type == agent_type)
            )
            agent_config = result.scalar_one_or_none()

            if not agent_config:
                return False, f"Agent '{agent_type}' not found"

            # Verify user exists
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, f"User {user_id} not found"

            # Check if whitelist entry already exists
            result = await db.execute(
                select(AgentWhitelist).where(
                    and_(
                        AgentWhitelist.agent_type == agent_type,
                        AgentWhitelist.user_id == user_id
                    )
                )
            )
            existing_entry = result.scalar_one_or_none()

            if existing_entry:
                # Update existing entry
                existing_entry.is_active = True
                existing_entry.granted_by = granted_by
                existing_entry.granted_at = datetime.utcnow()
                existing_entry.expires_at = expires_at
                existing_entry.reason = reason
                logger.info(f"Updated whitelist entry for user {user_id}, agent '{agent_type}'")
            else:
                # Create new whitelist entry
                whitelist_entry = AgentWhitelist(
                    agent_type=agent_type,
                    user_id=user_id,
                    granted_by=granted_by,
                    granted_at=datetime.utcnow(),
                    expires_at=expires_at,
                    is_active=True,
                    reason=reason
                )
                db.add(whitelist_entry)
                logger.info(f"Created whitelist entry for user {user_id}, agent '{agent_type}'")

            await db.commit()
            return True, None

        except Exception as e:
            await db.rollback()
            logger.error(f"Error granting access: {str(e)}")
            return False, f"Error granting access: {str(e)}"

    @staticmethod
    async def revoke_user_access(
        db: AsyncSession,
        agent_type: str,
        user_id: int
    ) -> Tuple[bool, Optional[str]]:
        """
        Revoke a user's whitelist access to an agent (admin function)

        Args:
            db: Database session
            agent_type: Type of agent
            user_id: User to revoke access from

        Returns:
            Tuple[bool, Optional[str]]: (success, error_message)
        """
        try:
            # Find whitelist entry
            result = await db.execute(
                select(AgentWhitelist).where(
                    and_(
                        AgentWhitelist.agent_type == agent_type,
                        AgentWhitelist.user_id == user_id
                    )
                )
            )
            whitelist_entry = result.scalar_one_or_none()

            if not whitelist_entry:
                return False, "Whitelist entry not found"

            # Deactivate instead of delete (for audit trail)
            whitelist_entry.is_active = False

            await db.commit()
            logger.info(f"Revoked whitelist access for user {user_id}, agent '{agent_type}'")
            return True, None

        except Exception as e:
            await db.rollback()
            logger.error(f"Error revoking access: {str(e)}")
            return False, f"Error revoking access: {str(e)}"

    @staticmethod
    async def update_agent_config(
        db: AsyncSession,
        agent_type: str,
        required_plan: Optional[str] = None,
        is_enabled: Optional[bool] = None,
        description: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Update agent configuration (admin function)

        Args:
            db: Database session
            agent_type: Type of agent
            required_plan: New required plan ('free', 'premium', 'max', 'admin')
            is_enabled: Enable/disable agent globally
            description: Agent description

        Returns:
            Tuple[bool, Optional[str]]: (success, error_message)
        """
        try:
            # Find agent config
            result = await db.execute(
                select(AgentAccess).where(AgentAccess.agent_type == agent_type)
            )
            agent_config = result.scalar_one_or_none()

            if not agent_config:
                # Create new config if doesn't exist
                agent_config = AgentAccess(
                    agent_type=agent_type,
                    required_plan=required_plan or 'free',
                    is_enabled=is_enabled if is_enabled is not None else True,
                    description=description
                )
                db.add(agent_config)
                logger.info(f"Created new agent config for '{agent_type}'")
            else:
                # Update existing config
                if required_plan is not None:
                    if required_plan not in AgentAccessService.PLAN_HIERARCHY:
                        return False, f"Invalid plan type: {required_plan}"
                    agent_config.required_plan = required_plan

                if is_enabled is not None:
                    agent_config.is_enabled = is_enabled

                if description is not None:
                    agent_config.description = description

                agent_config.updated_at = datetime.utcnow()
                logger.info(f"Updated agent config for '{agent_type}'")

            await db.commit()
            return True, None

        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating agent config: {str(e)}")
            return False, f"Error updating agent config: {str(e)}"

    @staticmethod
    async def get_whitelisted_users(
        db: AsyncSession,
        agent_type: str,
        include_expired: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get all whitelisted users for a specific agent (admin function)

        Args:
            db: Database session
            agent_type: Type of agent
            include_expired: Include expired whitelist entries

        Returns:
            List of dicts with whitelist info
            Example:
            [
                {
                    "user_id": 123,
                    "username": "john@example.com",
                    "granted_by": 1,
                    "granted_at": "2025-01-15T10:00:00",
                    "expires_at": "2025-12-31T23:59:59",
                    "is_active": True,
                    "reason": "Beta tester"
                },
                ...
            ]
        """
        try:
            # Build query conditions
            conditions = [
                AgentWhitelist.agent_type == agent_type,
                AgentWhitelist.is_active == True
            ]

            if not include_expired:
                conditions.append(
                    or_(
                        AgentWhitelist.expires_at.is_(None),
                        AgentWhitelist.expires_at > datetime.utcnow()
                    )
                )

            # Get whitelist entries with user info
            result = await db.execute(
                select(AgentWhitelist, User).join(
                    User, AgentWhitelist.user_id == User.id
                ).where(and_(*conditions)).order_by(AgentWhitelist.granted_at.desc())
            )

            entries = result.all()

            whitelist_data = []
            for whitelist, user in entries:
                whitelist_data.append({
                    "user_id": user.id,
                    "username": user.username,
                    "full_name": user.full_name,
                    "granted_by": whitelist.granted_by,
                    "granted_at": whitelist.granted_at.isoformat() if whitelist.granted_at else None,
                    "expires_at": whitelist.expires_at.isoformat() if whitelist.expires_at else None,
                    "is_active": whitelist.is_active,
                    "reason": whitelist.reason
                })

            logger.debug(f"Retrieved {len(whitelist_data)} whitelisted users for agent '{agent_type}'")
            return whitelist_data

        except Exception as e:
            logger.error(f"Error getting whitelisted users for agent '{agent_type}': {str(e)}")
            return []

    @staticmethod
    async def record_agent_hire(
        db: AsyncSession,
        user_id: int,
        agent_type: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Record that a user has hired an agent (for grandfathering)

        Args:
            db: Database session
            user_id: User ID
            agent_type: Type of agent

        Returns:
            Tuple[bool, Optional[str]]: (success, error_message)
        """
        try:
            # Get user to check plan
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user:
                return False, "User not found"

            # Get agent config to check required plan
            result = await db.execute(
                select(AgentAccess).where(AgentAccess.agent_type == agent_type)
            )
            agent_config = result.scalar_one_or_none()

            if not agent_config:
                return False, f"Agent '{agent_type}' not found"

            # Check if agent is enabled globally
            if not agent_config.is_enabled:
                return False, f"Agent '{agent_type}' is currently unavailable"

            # Check if user's plan allows hiring this agent
            user_plan = user.plan_type or 'free'
            required_plan = agent_config.required_plan

            user_plan_level = AgentAccessService.PLAN_HIERARCHY.get(user_plan, 0)
            required_plan_level = AgentAccessService.PLAN_HIERARCHY.get(required_plan, 0)

            # Check if free user is in fallback mode (exhausted trial queries)
            if user_plan == 'free':
                # Calculate total query limit including survey bonuses
                base_limit = user.get_query_limit()  # Returns 5 for free tier
                total_limit = base_limit

                # Add survey bonuses
                stage1_result = await db.execute(
                    select(UserSurvey).where(UserSurvey.user_id == user.id)
                )
                stage1_survey = stage1_result.scalar_one_or_none()
                if stage1_survey:
                    total_limit += stage1_survey.bonus_queries_granted

                stage2_result = await db.execute(
                    select(UserSurveyStage2).where(UserSurveyStage2.user_id == user.id)
                )
                stage2_survey = stage2_result.scalar_one_or_none()
                if stage2_survey:
                    total_limit += stage2_survey.bonus_queries_granted

                if user.monthly_query_count >= total_limit:
                    # User has exhausted trial, can only hire fallback agents (Sam)
                    if not agent_config.available_in_fallback:
                        logger.info(f"Free user {user_id} in fallback mode cannot hire '{agent_type}': only fallback agents allowed")
                        return False, "Your trial has ended. Only Sam is available in the free tier. Upgrade to hire more agents!"

            if user_plan_level < required_plan_level:
                logger.info(f"User {user_id} cannot hire '{agent_type}': plan '{user_plan}' < required '{required_plan}'")
                return False, f"This agent requires a '{required_plan}' plan. Please upgrade to hire this agent."

            # Check if already hired
            result = await db.execute(
                select(HiredAgent).where(
                    and_(
                        HiredAgent.user_id == user_id,
                        HiredAgent.agent_type == agent_type
                    )
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                if not existing.is_active:
                    existing.is_active = True
                    existing.hired_at = datetime.utcnow()
                    logger.info(f"Re-activated hired agent '{agent_type}' for user {user_id}")
                else:
                    logger.debug(f"User {user_id} already has hired agent '{agent_type}'")
                    return True, None
            else:
                hired_agent = HiredAgent(
                    user_id=user_id,
                    agent_type=agent_type,
                    hired_at=datetime.utcnow(),
                    is_active=True
                )
                db.add(hired_agent)
                logger.info(f"Recorded hired agent '{agent_type}' for user {user_id}")

            await db.commit()
            return True, None

        except Exception as e:
            await db.rollback()
            logger.error(f"Error recording agent hire: {str(e)}")
            return False, f"Error recording agent hire: {str(e)}"

    @staticmethod
    async def get_agent_statistics(
        db: AsyncSession,
        agent_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get statistics about agent access (admin function)

        Args:
            db: Database session
            agent_type: Optional specific agent type, or None for all agents

        Returns:
            Dict with statistics
        """
        try:
            stats = {}

            if agent_type:
                # Stats for specific agent
                # Count total hired
                result = await db.execute(
                    select(func.count(HiredAgent.id)).where(
                        and_(
                            HiredAgent.agent_type == agent_type,
                            HiredAgent.is_active == True
                        )
                    )
                )
                total_hired = result.scalar() or 0

                # Count whitelisted
                result = await db.execute(
                    select(func.count(AgentWhitelist.id)).where(
                        and_(
                            AgentWhitelist.agent_type == agent_type,
                            AgentWhitelist.is_active == True,
                            or_(
                                AgentWhitelist.expires_at.is_(None),
                                AgentWhitelist.expires_at > datetime.utcnow()
                            )
                        )
                    )
                )
                total_whitelisted = result.scalar() or 0

                stats[agent_type] = {
                    "total_hired": total_hired,
                    "total_whitelisted": total_whitelisted
                }
            else:
                # Stats for all agents
                # Get all agent types
                result = await db.execute(
                    select(AgentAccess.agent_type)
                )
                agent_types = result.scalars().all()

                for at in agent_types:
                    stats[at] = await AgentAccessService.get_agent_statistics(db, at)

            return stats

        except Exception as e:
            logger.error(f"Error getting agent statistics: {str(e)}")
            return {}

    @staticmethod
    async def unhire_all_non_fallback_agents(
        db: AsyncSession,
        user_id: int
    ) -> Tuple[bool, int, Optional[str]]:
        """
        Unhire all non-fallback agents for a user when their trial ends.
        Only keeps fallback agents (like Sam) hired.

        Args:
            db: Database session
            user_id: User ID

        Returns:
            Tuple[bool, int, Optional[str]]: (success, count_unhired, error_message)
        """
        try:
            # Get all fallback agent types
            fallback_result = await db.execute(
                select(AgentAccess.agent_type).where(AgentAccess.available_in_fallback == True)
            )
            fallback_agents = set(fallback_result.scalars().all())

            # Get all hired agents for this user that are NOT fallback agents
            result = await db.execute(
                select(HiredAgent).where(
                    and_(
                        HiredAgent.user_id == user_id,
                        HiredAgent.is_active == True,
                        HiredAgent.agent_type.notin_(fallback_agents) if fallback_agents else True
                    )
                )
            )
            hired_agents = result.scalars().all()

            count_unhired = 0
            for agent in hired_agents:
                agent.is_active = False
                count_unhired += 1
                logger.info(f"Unhired agent '{agent.agent_type}' for user {user_id} (trial ended)")

            if count_unhired > 0:
                await db.commit()
                logger.info(f"Unhired {count_unhired} non-fallback agents for user {user_id}")

            return True, count_unhired, None

        except Exception as e:
            await db.rollback()
            logger.error(f"Error unhiring agents for user {user_id}: {str(e)}")
            return False, 0, f"Error unhiring agents: {str(e)}"

    @staticmethod
    async def check_and_handle_trial_exhaustion(
        db: AsyncSession,
        user: User
    ) -> Tuple[bool, bool]:
        """
        Check if user's trial is exhausted and handle it by unhiring non-fallback agents.

        Args:
            db: Database session
            user: User object

        Returns:
            Tuple[bool, bool]: (is_trial_exhausted, agents_were_unhired)
        """
        try:
            if user.plan_type != 'free':
                return False, False

            # Calculate total query limit including survey bonuses
            base_limit = user.get_query_limit()  # Returns 5 for free tier
            total_limit = base_limit

            # Add survey bonuses
            stage1_result = await db.execute(
                select(UserSurvey).where(UserSurvey.user_id == user.id)
            )
            stage1_survey = stage1_result.scalar_one_or_none()
            if stage1_survey:
                total_limit += stage1_survey.bonus_queries_granted

            stage2_result = await db.execute(
                select(UserSurveyStage2).where(UserSurveyStage2.user_id == user.id)
            )
            stage2_survey = stage2_result.scalar_one_or_none()
            if stage2_survey:
                total_limit += stage2_survey.bonus_queries_granted

            # Check if trial is exhausted
            if user.monthly_query_count >= total_limit:
                # Trial exhausted - unhire all non-fallback agents
                success, count, _ = await AgentAccessService.unhire_all_non_fallback_agents(
                    db, user.id
                )
                return True, count > 0

            return False, False

        except Exception as e:
            logger.error(f"Error checking trial exhaustion for user {user.id}: {str(e)}")
            return False, False

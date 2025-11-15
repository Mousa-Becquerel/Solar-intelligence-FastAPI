"""
Filtered Session Wrapper for Multi-Agent Conversations
========================================================

Wraps SQLAlchemySession to filter conversation history per agent.
In multi-agent conversations, each agent should only see:
- All user messages
- Only their own bot messages (not messages from other agents)
"""
import logging
from typing import Optional, List, Dict, Any
from agents.extensions.memory.sqlalchemy_session import SQLAlchemySession

logger = logging.getLogger(__name__)


class FilteredAgentSession:
    """
    Session wrapper that filters conversation history by agent type.

    This ensures each agent only sees their own messages in multi-agent conversations.
    """

    def __init__(self, base_session: SQLAlchemySession, agent_type: str):
        """
        Initialize filtered session

        Args:
            base_session: Underlying SQLAlchemySession
            agent_type: Current agent type (e.g., 'market', 'news', etc.)
        """
        self.base_session = base_session
        self.agent_type = agent_type
        logger.info(f"Created filtered session for agent '{agent_type}'")

    def _filter_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter messages to only include:
        - All user messages
        - Bot messages from the current agent only

        Args:
            messages: List of message dictionaries

        Returns:
            Filtered list of messages
        """
        filtered = []

        for msg in messages:
            role = msg.get('role')
            agent_type = msg.get('metadata', {}).get('agent_type')

            # Include all user messages
            if role == 'user':
                filtered.append(msg)
                continue

            # Include only bot messages from this agent
            if role == 'assistant':
                # If no agent_type in metadata, include it (legacy messages)
                if agent_type is None:
                    logger.debug(f"Including legacy message without agent_type")
                    filtered.append(msg)
                # If agent_type matches, include it
                elif agent_type == self.agent_type:
                    logger.debug(f"Including message from agent '{agent_type}'")
                    filtered.append(msg)
                # Skip messages from other agents
                else:
                    logger.debug(f"Skipping message from agent '{agent_type}' (current: '{self.agent_type}')")
                    continue

        logger.info(f"Filtered {len(messages)} messages -> {len(filtered)} messages for agent '{self.agent_type}'")
        return filtered

    # Forward all base_session methods
    def __getattr__(self, name):
        """Forward method calls to base_session"""
        return getattr(self.base_session, name)

    # Override methods that return conversation history
    def get_history(self) -> List[Dict[str, Any]]:
        """Get filtered conversation history"""
        history = self.base_session.get_history()
        return self._filter_messages(history)

    def load(self) -> List[Dict[str, Any]]:
        """Load filtered conversation history"""
        history = self.base_session.load()
        return self._filter_messages(history)

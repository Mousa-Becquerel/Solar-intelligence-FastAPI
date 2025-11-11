/**
 * Conversation List
 *
 * Fetches and displays list of user conversations
 * Handles delete operations
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../api';
import type { Conversation } from '../../types/api';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  isExpanded: boolean;
}

export default function ConversationList({ isExpanded }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const activeConversationId = searchParams.get('conversation');

  // Fetch conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.deleteConversation(id);
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
      toast.success('Conversation deleted');

      // If the deleted conversation was active, redirect to home
      if (activeConversationId === String(id)) {
        window.location.href = '/app';
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: isExpanded ? '32px 16px' : '16px 8px',
          textAlign: 'center',
          color: 'rgba(0, 0, 0, 0.38)',
          fontSize: '14px',
        }}
      >
        {isExpanded ? 'Loading conversations...' : '⋯'}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div
        style={{
          padding: isExpanded ? '32px 16px' : '16px 8px',
          textAlign: 'center',
          color: 'rgba(0, 0, 0, 0.38)',
          fontSize: '14px',
        }}
      >
        {isExpanded ? 'No conversations yet' : ''}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: isExpanded ? 'stretch' : 'center',
      }}
    >
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={activeConversationId === String(conversation.id)}
          isExpanded={isExpanded}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

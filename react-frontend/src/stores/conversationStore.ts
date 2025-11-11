/**
 * Conversation Store
 *
 * Zustand store for conversation and message state management
 */

import { create } from 'zustand';
import { apiClient } from '../api';
import type { Conversation, Message } from '../types/api';

interface ConversationState {
  // State
  conversations: Conversation[];
  currentConversationId: number | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConversations: () => Promise<void>;
  createConversation: (agentType: string) => Promise<number>;
  setCurrentConversation: (conversationId: number) => void;
  deleteConversation: (conversationId: number) => Promise<void>;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  clearError: () => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  error: null,

  // Fetch all conversations
  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await apiClient.getConversations();
      set({
        conversations,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch conversations',
      });
    }
  },

  // Create new conversation
  createConversation: async (agentType: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.createConversation(agentType);
      const conversationId = response.conversation_id;

      // Refresh conversations list
      await get().fetchConversations();

      set({
        currentConversationId: conversationId,
        messages: [],
        isLoading: false,
        error: null,
      });

      return conversationId;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create conversation',
      });
      throw error;
    }
  },

  // Set current conversation
  setCurrentConversation: (conversationId: number) => {
    set({
      currentConversationId: conversationId,
      messages: [], // Clear messages when switching conversations
    });
  },

  // Delete conversation
  deleteConversation: async (conversationId: number) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.deleteConversation(conversationId);

      // Remove from local state
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        currentConversationId:
          state.currentConversationId === conversationId
            ? null
            : state.currentConversationId,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
      });
    }
  },

  // Add message to current conversation
  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  // Clear messages
  clearMessages: () => set({ messages: [] }),

  // Clear error
  clearError: () => set({ error: null }),
}));

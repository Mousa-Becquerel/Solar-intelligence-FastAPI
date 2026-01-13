/**
 * UI State Store
 *
 * Zustand store for UI state (sidebar, artifact panel, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// In-memory storage for artifacts per conversation
// Note: Artifacts contain React components which cannot be serialized to JSON,
// so we keep them in memory only. They will be lost on page refresh.
const artifactsByConversation = new Map<number, { content: any; type: string }>();

interface UIState {
  // Sidebar state
  sidebarExpanded: boolean;

  // Active conversation state (kept in memory, not URL)
  activeConversationId: number | null;

  // Artifact panel state
  artifactOpen: boolean;
  artifactContent: any | null;
  artifactType: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setActiveConversationId: (id: number | null) => void;
  openArtifact: (content: any, type: string, conversationId?: number) => void;
  updateArtifactContent: (content: any) => void;
  closeArtifact: () => void;
  clearArtifact: () => void;
  toggleArtifact: () => void;
  restoreArtifact: (conversationId: number) => void;
  saveArtifact: (conversationId: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarExpanded: false,
      activeConversationId: null,
      artifactOpen: false,
      artifactContent: null,
      artifactType: null,

      // Sidebar actions
      toggleSidebar: () =>
        set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),

      setSidebarExpanded: (expanded: boolean) =>
        set({ sidebarExpanded: expanded }),

      // Conversation actions
      setActiveConversationId: (id: number | null) =>
        set({ activeConversationId: id }),

      // Artifact actions
      openArtifact: (content: any, type: string, conversationId?: number) => {
        // Save to conversation-scoped storage if conversationId provided
        if (conversationId) {
          artifactsByConversation.set(conversationId, { content, type });
        }

        set({
          artifactOpen: true,
          artifactContent: content,
          artifactType: type,
        });
      },

      // Update artifact content only (doesn't change open state)
      // Use this to update content without triggering the open animation
      updateArtifactContent: (content: any) =>
        set({ artifactContent: content }),

      closeArtifact: () =>
        set({
          artifactOpen: false,
          // Keep content and type so user can reopen within same conversation
        }),

      clearArtifact: () =>
        set({
          artifactOpen: false,
          artifactContent: null,
          artifactType: null,
        }),

      toggleArtifact: () =>
        set((state) => ({ artifactOpen: !state.artifactOpen })),

      // Save current artifact to conversation-scoped storage
      saveArtifact: (conversationId: number) => {
        const state = useUIStore.getState();
        if (state.artifactContent && state.artifactType) {
          artifactsByConversation.set(conversationId, {
            content: state.artifactContent,
            type: state.artifactType,
          });
        }
      },

      // Restore artifact from conversation-scoped storage
      restoreArtifact: (conversationId: number) => {
        const saved = artifactsByConversation.get(conversationId);
        if (saved) {
          set({
            artifactOpen: false, // Start closed, user can reopen with button
            artifactContent: saved.content,
            artifactType: saved.type,
          });
        } else {
          set({
            artifactOpen: false,
            artifactContent: null,
            artifactType: null,
          });
        }
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarExpanded: state.sidebarExpanded,
        // Don't persist artifact state
      }),
    }
  )
);

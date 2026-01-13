/**
 * Chat Page
 *
 * Main chat interface with artifact panel integration via Zustand store
 */

import { createContext, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatContainer from '../components/chat/ChatContainer';
import { useUIStore } from '../stores';
import ContactForm from '../components/artifact/ContactForm';
import { SurveyModal } from '../components/survey/SurveyModal';
import { SurveyModalStage2 } from '../components/survey/SurveyModalStage2';
import { apiClient } from '../api/client';

// Context for artifact panel control and survey management
export const ArtifactContext = createContext<{
  openContactForm: () => void;
  triggerSurvey: (stage: 1 | 2) => void;
  getSurveyStatus: () => { stage1_completed: boolean; stage2_completed: boolean } | null;
} | null>(null);

export default function ChatPage() {
  const { openArtifact, closeArtifact, clearArtifact, activeConversationId, artifactType } = useUIStore();
  const [searchParams] = useSearchParams();
  const agentFromUrl = searchParams.get('agent');

  // Survey state
  const [showSurvey1, setShowSurvey1] = useState(false);
  const [showSurvey2, setShowSurvey2] = useState(false);
  const [surveyStatus, setSurveyStatus] = useState<{ stage1_completed: boolean; stage2_completed: boolean } | null>(null);

  // Track if we've done initial clear to avoid interfering with agent-specific artifacts
  const initialClearDoneRef = useRef(false);

  // Clear artifact panel when component mounts (e.g., navigating to chat page)
  // BUT don't clear if:
  // 1. Navigating to bipv_design agent (it has its own artifact)
  // 2. Artifact is already a bipv_design artifact (don't clear it)
  // NOTE: We DO NOT clear artifact here for bipv_design because ChatContainer handles it
  useEffect(() => {
    if (!initialClearDoneRef.current) {
      initialClearDoneRef.current = true;
      console.log('[ChatPage] Mount effect - checking artifact clear:', {
        agentFromUrl,
        artifactType,
        shouldClear: agentFromUrl !== 'bipv_design' && artifactType !== 'bipv_design'
      });
      // Don't clear if we're navigating to bipv_design or already have a bipv_design artifact
      if (agentFromUrl !== 'bipv_design' && artifactType !== 'bipv_design') {
        clearArtifact();
      }
    }
  }, []);

  // Check survey status on mount
  useEffect(() => {
    const checkSurveyStatus = async () => {
      try {
        const status = await apiClient.checkSurveyStatus();
        setSurveyStatus(status);
      } catch (error) {
        console.error('Failed to check survey status:', error);
        // Set to default on error to prevent blocking
        setSurveyStatus({ stage1_completed: false, stage2_completed: false });
      }
    };
    checkSurveyStatus();
  }, []);

  // Function to refresh survey status from API
  const refreshSurveyStatus = async () => {
    try {
      const status = await apiClient.checkSurveyStatus();
      setSurveyStatus(status);
    } catch (error) {
      console.error('Failed to refresh survey status:', error);
    }
  };

  const openContactForm = () => {
    openArtifact(<ContactForm onSuccess={handleContactSuccess} />, 'contact', activeConversationId || undefined);
  };

  const handleContactSuccess = () => {
    // Keep panel open for 3 seconds to show success message
    setTimeout(() => {
      closeArtifact();
    }, 3000);
  };

  const triggerSurvey = (stage: 1 | 2) => {
    if (stage === 1) {
      setShowSurvey1(true);
    } else {
      setShowSurvey2(true);
    }
  };

  const getSurveyStatus = () => {
    return surveyStatus;
  };

  return (
    <ArtifactContext.Provider value={{ openContactForm, triggerSurvey, getSurveyStatus }}>
      <ChatContainer />

      {/* Stage 1 Survey Modal */}
      <SurveyModal
        isOpen={showSurvey1}
        onClose={() => setShowSurvey1(false)}
        onSuccess={async () => {
          setShowSurvey1(false);
          // Refresh survey status from API to get the true completion state
          await refreshSurveyStatus();
        }}
      />

      {/* Stage 2 Survey Modal */}
      <SurveyModalStage2
        isOpen={showSurvey2}
        onClose={() => setShowSurvey2(false)}
        onSuccess={async () => {
          setShowSurvey2(false);
          // Refresh survey status from API to get the true completion state
          await refreshSurveyStatus();
        }}
      />
    </ArtifactContext.Provider>
  );
}

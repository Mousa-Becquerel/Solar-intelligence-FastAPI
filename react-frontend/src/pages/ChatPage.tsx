/**
 * Chat Page
 *
 * Main chat interface with artifact panel integration via Zustand store
 */

import { createContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatContainer from '../components/chat/ChatContainer';
import { useUIStore, useAuthStore } from '../stores';
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
  const { openArtifact, closeArtifact, clearArtifact } = useUIStore();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');

  // Survey state
  const [showSurvey1, setShowSurvey1] = useState(false);
  const [showSurvey2, setShowSurvey2] = useState(false);
  const [surveyStatus, setSurveyStatus] = useState<{ stage1_completed: boolean; stage2_completed: boolean } | null>(null);

  console.log('🔧 [ChatPage] Render');

  // Clear artifact panel when component mounts (e.g., navigating to chat page)
  useEffect(() => {
    console.log('🔧 [ChatPage] Mounted - clearing any open artifacts');
    clearArtifact();
  }, [clearArtifact]);

  // Check survey status on mount
  useEffect(() => {
    const checkSurveyStatus = async () => {
      try {
        const status = await apiClient.checkSurveyStatus();
        setSurveyStatus(status);
        console.log('📊 [Survey] Status checked:', {
          stage1_completed: status.stage1_completed,
          stage2_completed: status.stage2_completed
        });
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
      console.log('📊 [Survey] Status refreshed:', {
        stage1_completed: status.stage1_completed,
        stage2_completed: status.stage2_completed
      });
    } catch (error) {
      console.error('Failed to refresh survey status:', error);
    }
  };

  const openContactForm = () => {
    console.log('🔧 [ChatPage] openContactForm called - opening artifact via UI store');
    const convId = conversationId ? Number(conversationId) : undefined;
    openArtifact(<ContactForm onSuccess={handleContactSuccess} />, 'contact', convId);
  };

  const handleContactSuccess = () => {
    console.log('🔧 [ChatPage] Contact form submitted successfully');
    // Keep panel open for 3 seconds to show success message
    setTimeout(() => {
      console.log('🔧 [ChatPage] Auto-closing artifact panel');
      closeArtifact();
    }, 3000);
  };

  const triggerSurvey = (stage: 1 | 2) => {
    console.log(`🎯 [ChatPage] Triggering survey stage ${stage}`);
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
        onSuccess={async (newQueryCount, newQueryLimit) => {
          console.log(`✅ [Survey] Stage 1 completed! New limit: ${newQueryCount}/${newQueryLimit}`);
          setShowSurvey1(false);
          // Refresh survey status from API to get the true completion state
          await refreshSurveyStatus();
        }}
      />

      {/* Stage 2 Survey Modal */}
      <SurveyModalStage2
        isOpen={showSurvey2}
        onClose={() => setShowSurvey2(false)}
        onSuccess={async (newQueryCount, newQueryLimit) => {
          console.log(`✅ [Survey] Stage 2 completed! New limit: ${newQueryCount}/${newQueryLimit}`);
          setShowSurvey2(false);
          // Refresh survey status from API to get the true completion state
          await refreshSurveyStatus();
        }}
      />
    </ArtifactContext.Provider>
  );
}

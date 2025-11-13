/**
 * Chat Container
 *
 * Main chat interface with streaming support
 * Handles message loading, sending, and streaming responses
 */

import { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../api';
import { useConversationStore, useUIStore, useAuthStore } from '../../stores';
import type { Message } from '../../types/api';
import type { AgentType } from '../../constants/agents';
import ChatHeader from './ChatHeader';
import WelcomeScreen from './WelcomeScreen';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import QueryLimitMessage from './QueryLimitMessage';
import { ArtifactContext } from '../../pages/ChatPage';

// Helper to generate unique message IDs
let messageIdCounter = 0;
const generateMessageId = () => {
  return Date.now() * 1000 + messageIdCounter++;
};

export default function ChatContainer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get('conversation');
  const { saveArtifact, restoreArtifact } = useUIStore();
  const { user } = useAuthStore();
  const artifactContext = useContext(ArtifactContext);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('market');
  const [skipLoadMessages, setSkipLoadMessages] = useState(false);
  const [prevConversationId, setPrevConversationId] = useState<string | null>(null);
  const [showQueryLimitMessage, setShowQueryLimitMessage] = useState(false);
  const [surveyStage, setSurveyStage] = useState<1 | 2>(1);
  const [bothSurveysCompleted, setBothSurveysCompleted] = useState(false);

  // Load messages and handle artifact persistence when conversation changes
  useEffect(() => {
    const convId = conversationId ? Number(conversationId) : null;
    const prevConvId = prevConversationId ? Number(prevConversationId) : null;

    // Save artifact for previous conversation before switching
    if (prevConvId && !isNaN(prevConvId) && prevConvId !== convId) {
      console.log(`💾 [ChatContainer] Saving artifact for conversation ${prevConvId} before switching`);
      saveArtifact(prevConvId);
    }

    // Restore artifact for new conversation
    if (convId && !isNaN(convId)) {
      console.log(`📂 [ChatContainer] Restoring artifact for conversation ${convId}`);
      restoreArtifact(convId);

      // Skip loading if we just created a new conversation and already have messages
      if (skipLoadMessages) {
        setSkipLoadMessages(false);
        setPrevConversationId(conversationId);
        return;
      }
      loadMessages(convId);
    } else {
      // No conversation selected - clear artifacts
      console.log('🧹 [ChatContainer] No conversation - clearing artifacts');
      restoreArtifact(-1); // Pass invalid ID to clear
      setMessages([]);
    }

    setPrevConversationId(conversationId);
  }, [conversationId, saveArtifact, restoreArtifact]);

  const loadMessages = async (convId: number) => {
    try {
      setLoading(true);

      // Fetch conversation details to get agent_type
      const conversation = await apiClient.getConversation(convId);

      // Restore the agent selection from the conversation
      if (conversation.agent_type) {
        setSelectedAgent(conversation.agent_type as AgentType);
        console.log(`🔄 [ChatContainer] Restored agent selection: ${conversation.agent_type}`);
      }

      // Then load messages
      const data = await apiClient.getMessages(convId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      // Check query limits for free tier users
      if (user && user.plan_type === 'free' && artifactContext) {
        const currentUser = await apiClient.getCurrentUser();
        const queryCount = currentUser.monthly_query_count || 0;
        const surveyStatus = artifactContext.getSurveyStatus();

        // Calculate current query limit based on surveys completed
        let currentLimit = 5; // Base limit
        if (surveyStatus?.stage1_completed) {
          currentLimit += 5; // +5 for Stage 1
        }
        if (surveyStatus?.stage2_completed) {
          currentLimit += 5; // +5 for Stage 2
        }

        console.log(`🔒 [ChatContainer] Query check: ${queryCount}/${currentLimit}`, surveyStatus);

        // If at or over limit, add messages showing the limit
        if (queryCount >= currentLimit) {
          console.log('🚫 [ChatContainer] Query limit reached, showing limit message');

          // Check if both surveys are completed
          const bothCompleted = surveyStatus?.stage1_completed && surveyStatus?.stage2_completed;
          setBothSurveysCompleted(bothCompleted || false);

          // Determine which survey to show (if any)
          if (!surveyStatus?.stage1_completed) {
            setSurveyStage(1);
          } else if (!surveyStatus?.stage2_completed) {
            setSurveyStage(2);
          }

          // If no conversation, create one
          let convId = conversationId ? Number(conversationId) : null;
          const isNewConversation = !convId;

          if (!convId) {
            const newConv = await apiClient.createConversation(selectedAgent);
            convId = newConv.conversation_id;
          }

          // Add user message
          const userMessage: Message = {
            id: generateMessageId(),
            conversation_id: convId,
            sender: 'user',
            content,
            timestamp: new Date().toISOString(),
          };

          // Add query limit message as special bot response
          const limitMessage: Message = {
            id: generateMessageId(),
            conversation_id: convId,
            sender: 'bot',
            content: '__QUERY_LIMIT__', // Special marker
            timestamp: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, userMessage, limitMessage]);

          // Update URL if new conversation
          if (isNewConversation) {
            setSkipLoadMessages(true);
            setSearchParams({ conversation: convId.toString() });
          }

          return; // Don't send to backend
        }
      }

      setSending(true);

      // If no conversation selected, create one first
      let convId = conversationId ? Number(conversationId) : null;
      const isNewConversation = !convId;

      if (!convId) {
        const newConv = await apiClient.createConversation(selectedAgent);
        convId = newConv.conversation_id;
      }

      // Add user message to UI immediately
      const userMessage: Message = {
        id: generateMessageId(), // Unique ID
        conversation_id: convId,
        sender: 'user',
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Update URL AFTER adding message, and skip loading messages since we already have them
      if (isNewConversation) {
        setSkipLoadMessages(true);
        setSearchParams({ conversation: convId.toString() });
      }

      // Start streaming response
      await streamResponse(convId, content);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const streamResponse = async (convId: number, userMessage: string) => {
    try {
      setStreaming(true);
      setStreamingMessage('');
      // Set a stable ID for the streaming message
      const msgId = Date.now();
      setStreamingMessageId(msgId);

      // Use the API client's sendChatMessage method
      const response = await apiClient.sendChatMessage(
        convId,
        userMessage,
        selectedAgent
      );

      if (!response.ok) {
        // Handle 403 - user hasn't hired this agent
        if (response.status === 403) {
          const errorData = await response.json();
          console.error('403 Forbidden - Agent not hired or access denied:', {
            agent: selectedAgent,
            error: errorData,
          });
          throw new Error(errorData.detail || `You need to hire the ${selectedAgent} agent first. Please go to the Agents page to hire this agent before chatting.`);
        }
        console.error(`Chat request failed with status ${response.status}`);
        throw new Error('Streaming failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let plotData: any = null; // Store plot data if received

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (!data) continue;

            try {
              const parsed = JSON.parse(data);

              // Handle different event types
              switch (parsed.type) {
                case 'chunk':
                case 'text':
                case 'text_chunk':
                  if (parsed.content) {
                    accumulated += parsed.content;
                    setStreamingMessage(accumulated);
                  }
                  break;

                case 'plot':
                  // Handle plot data - store it for rendering
                  console.log('📊 Plot data received:', parsed.content);
                  plotData = parsed.content;
                  // Don't add to accumulated text - plot will be rendered separately
                  break;

                case 'approval_request':
                  // Handle approval request - combine with accumulated message
                  console.log('📋 Approval request received:', parsed);

                  // Combine accumulated message with approval request in a single bubble
                  const combinedMessage: Message & { approvalData?: any } = {
                    id: generateMessageId(),
                    conversation_id: convId,
                    sender: 'bot',
                    content: accumulated || parsed.message || '',
                    timestamp: new Date().toISOString(),
                    approvalData: {
                      conversationId: parsed.conversation_id || convId,
                      context: parsed.context || 'expert_contact',
                      question: parsed.approval_question || '',
                    },
                  };
                  setMessages((prev) => [...prev, combinedMessage]);
                  accumulated = ''; // Reset accumulated
                  setStreamingMessage('');
                  break;

                case 'done':
                  // Streaming complete
                  console.log('Stream complete');
                  break;

                case 'error':
                  throw new Error(parsed.message || 'Streaming error');

                case 'status':
                case 'processing':
                  console.log('Status:', parsed.message);
                  break;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data, e);
            }
          }
        }
      }

      // Add final bot message to messages
      if (accumulated || plotData) {
        const botMessage: Message = {
          id: generateMessageId(), // Unique ID
          conversation_id: convId,
          sender: 'bot',
          content: accumulated || '', // Can be empty if only plot
          timestamp: new Date().toISOString(),
          plotData: plotData || undefined, // Include plot data if present
        };
        setMessages((prev) => [...prev, botMessage]);
      }

      setStreamingMessage('');
      setStreamingMessageId(null);
    } catch (error) {
      console.error('Streaming error:', error);

      // Show specific error message to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      toast.error(errorMessage);

      setStreamingMessage('');
      setStreamingMessageId(null);
    } finally {
      setStreaming(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  // Show loading state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'rgba(0, 0, 0, 0.38)',
        }}
      >
        Loading conversation...
      </div>
    );
  }

  // Show welcome screen if no messages
  const hasMessages = messages.length > 0 || streamingMessage;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#ffffff',
        position: 'relative',
      }}
    >
      <ChatHeader
        selectedAgent={selectedAgent}
        onAgentChange={setSelectedAgent}
      />

      {!hasMessages ? (
        <WelcomeScreen
          agentType={selectedAgent}
          onPromptClick={handlePromptClick}
        />
      ) : (
        <MessageList
          messages={[
            ...messages.map((msg) => {
              // Check if this is a query limit message
              if (msg.sender === 'bot' && msg.content === '__QUERY_LIMIT__') {
                // Render query limit UI instead of normal content
                return {
                  ...msg,
                  content: '', // Will be handled specially in MessageBubble
                  isQueryLimitMessage: true,
                };
              }
              return msg;
            }),
            // Show streaming message if active
            ...(streamingMessage && streamingMessageId
              ? [
                  {
                    id: streamingMessageId,
                    conversation_id: Number(conversationId) || 0,
                    sender: 'bot' as const,
                    content: streamingMessage,
                    timestamp: new Date().toISOString(),
                  },
                ]
              : []),
          ]}
          isStreaming={streaming && !streamingMessage}
          queryLimitProps={{
            onUpgrade: () => {
              window.location.href = '/profile';
            },
            onTakeSurvey: () => {
              artifactContext?.triggerSurvey(surveyStage);
            },
            surveyStage,
            bothSurveysCompleted,
          }}
        />
      )}

      <ChatInput
        agentType={selectedAgent}
        onSend={handleSendMessage}
        disabled={sending || streaming}
        showSuggestions={!hasMessages}
        placeholder={
          hasMessages
            ? 'Continue the conversation...'
            : 'Ask about PV market data...'
        }
      />
    </div>
  );
}

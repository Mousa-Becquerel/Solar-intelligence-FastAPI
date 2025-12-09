/**
 * Chat Container
 *
 * Main chat interface with streaming support
 * Handles message loading, sending, and streaming responses
 */

import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../api';
import { useUIStore, useAuthStore } from '../../stores';
import type { Message } from '../../types/api';
import type { AgentType } from '../../constants/agents';
import ChatHeader from './ChatHeader';
import WelcomeScreen from './WelcomeScreen';
import LoadingSkeleton from './LoadingSkeleton';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { ArtifactContext } from '../../pages/ChatPage';

// Agent-specific placeholders
const AGENT_PLACEHOLDERS: Record<AgentType, string> = {
  market: 'Ask about PV market data...',
  news: 'Ask about solar industry news...',
  digitalization: 'Ask about digital transformation...',
  nzia_policy: 'Ask about NZIA policy and compliance...',
  manufacturer_financial: 'Ask about PV manufacturer financials...',
  nzia_market_impact: 'Ask about NZIA market impact...',
  component_prices: 'Ask about component prices...',
  seamless: 'Ask about IPV...',
  quality: 'Ask about PV risks, reliability, and degradation...',
};

// Helper to generate unique message IDs
let messageIdCounter = 0;
const generateMessageId = () => {
  return Date.now() * 1000 + messageIdCounter++;
};

export default function ChatContainer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const agentFromUrl = searchParams.get('agent') as AgentType | null;
  const { saveArtifact, restoreArtifact, activeConversationId, setActiveConversationId } = useUIStore();
  const { user } = useAuthStore();
  const artifactContext = useContext(ArtifactContext);

  // Use store-based conversation ID (not URL)
  const conversationId = activeConversationId;

  // Clean URL on mount if it has conversation param
  useEffect(() => {
    if (searchParams.has('conversation')) {
      // Remove conversation from URL but keep agent if present
      const agent = searchParams.get('agent');
      if (agent) {
        setSearchParams({ agent }, { replace: true });
      } else {
        navigate('/chat', { replace: true });
      }
    }
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  // Use agent from URL if provided, otherwise default to 'market'
  const [selectedAgent, setSelectedAgent] = useState<AgentType>(agentFromUrl || 'market');
  const [agentInitialized, setAgentInitialized] = useState(false);
  const [skipLoadMessages, setSkipLoadMessages] = useState(false);
  const [prevConversationId, setPrevConversationId] = useState<number | null>(null);
  const [surveyStage, setSurveyStage] = useState<1 | 2>(1);
  const [bothSurveysCompleted, setBothSurveysCompleted] = useState(false);

  // AbortController for canceling ongoing requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      // Clean up streaming state
      setStreaming(false);
      setSending(false);
      setStreamingMessage('');
      setStreamingMessageId(null);

      toast.info('Request canceled');
    }
  }, []);

  // Cancel request when navigating to new chat
  useEffect(() => {
    // If conversation changed and we had an ongoing request, cancel it
    if (prevConversationId !== conversationId && abortControllerRef.current) {
      cancelRequest();
    }
  }, [conversationId, prevConversationId, cancelRequest]);

  // Define loadMessages function before useEffect that uses it
  const loadMessages = useCallback(async (convId: number) => {
    try {
      setLoading(true);

      // Load messages directly - no need to restore agent selection
      // Users can talk to multiple agents in the same conversation
      const data = await apiClient.getMessages(convId);
      setMessages(data);
    } catch (error) {
      console.error('❌ [loadMessages] Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages and handle artifact persistence when conversation changes
  useEffect(() => {
    const convId = conversationId;
    const prevConvId = prevConversationId;

    // Save artifact for previous conversation before switching
    if (prevConvId && prevConvId !== convId) {
      saveArtifact(prevConvId);
    }

    // Restore artifact for new conversation
    if (convId) {
      restoreArtifact(convId);

      // Skip loading if we just created a new conversation and already have messages
      if (skipLoadMessages) {
        setSkipLoadMessages(false);
        setPrevConversationId(conversationId);
        return;
      }
      loadMessages(convId);
    } else {
      // No conversation selected - create one immediately
      // But only if agent has been properly initialized by ChatHeader
      const createInitialConversation = async () => {
        try {
          const newConv = await apiClient.createConversation(selectedAgent);
          setSkipLoadMessages(true);
          // Set conversation ID in store (not URL)
          setActiveConversationId(newConv.conversation_id);
        } catch (error) {
          console.error('❌ [useEffect] Failed to create initial conversation:', error);
        }
      };

      // Only create if we haven't just switched from a conversation AND agent is initialized
      if (prevConvId === null && agentInitialized) {
        createInitialConversation();
      } else if (prevConvId !== null) {
        // Clear artifacts and messages when switching away from a conversation
        restoreArtifact(-1);
        setMessages([]);
      }
    }

    setPrevConversationId(conversationId);
  }, [conversationId, prevConversationId, skipLoadMessages, saveArtifact, restoreArtifact, loadMessages, selectedAgent, setActiveConversationId, agentInitialized]);

  const handleSendMessage = async (content: string) => {
    try {
      // Check query limits for free tier users
      // Note: Sam (seamless) is allowed in fallback mode - backend handles daily quota
      if (user && user.plan_type === 'free' && artifactContext) {
        const currentUser = await apiClient.getCurrentUser();
        const queryCount = currentUser.monthly_query_count || 0;
        const surveyStatus = artifactContext.getSurveyStatus();

        // Calculate current query limit based on surveys completed
        // Free tier: 5 base + 5 after survey 1 + 5 after survey 2 = 15 total max
        let currentLimit = 5; // Base trial limit for free users
        if (surveyStatus?.stage1_completed) {
          currentLimit += 5; // +5 for Stage 1 completion = 10 total
        }
        if (surveyStatus?.stage2_completed) {
          currentLimit += 5; // +5 for Stage 2 completion = 15 total
        }

        // Check if user is in fallback mode (trial exhausted)
        const isInFallbackMode = queryCount >= currentLimit;

        // Sam (seamless) agent is allowed in fallback mode - backend will handle daily quota
        const isSamAgent = selectedAgent === 'seamless';

        // If at or over limit AND not using Sam agent, show the limit message
        if (isInFallbackMode && !isSamAgent) {

          // Check if both surveys are completed
          const bothCompleted = surveyStatus?.stage1_completed && surveyStatus?.stage2_completed;
          setBothSurveysCompleted(bothCompleted || false);

          // If both surveys completed (trial fully exhausted at 15 queries),
          // unhire all agents and redirect to Agents page
          if (bothCompleted) {
            try {
              // Call backend to unhire all non-fallback agents
              const trialStatus = await apiClient.checkTrialStatus();
              if (trialStatus.redirect_to_agents) {
                toast.info(trialStatus.message || 'Your trial has ended. Redirecting to Agents page...');
                // Redirect to Agents page
                navigate('/agents');
                return;
              }
            } catch (err) {
              console.error('Failed to check trial status:', err);
            }
          }

          // Determine which survey to show (if any)
          if (!surveyStatus?.stage1_completed) {
            setSurveyStage(1);
          } else if (!surveyStatus?.stage2_completed) {
            setSurveyStage(2);
          }

          // If no conversation, create one
          let convId = conversationId;
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

          // Update store if new conversation (not URL)
          if (isNewConversation) {
            setSkipLoadMessages(true);
            setActiveConversationId(convId);
          }

          return; // Don't send to backend
        }
        // If using Sam in fallback mode, allow the request - backend will handle daily quota
      }

      setSending(true);

      // If no conversation selected, create one first
      let convId = conversationId;
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

      // Update store AFTER adding message (not URL)
      if (isNewConversation) {
        setSkipLoadMessages(true);
        setActiveConversationId(convId);
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
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setStreaming(true);
      setStreamingMessage('');
      // Set a stable ID for the streaming message
      const msgId = Date.now();
      setStreamingMessageId(msgId);

      // Use the API client's sendChatMessage method with abort signal
      const response = await apiClient.sendChatMessage(
        convId,
        userMessage,
        selectedAgent,
        abortController.signal
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

        // Handle 429 - Rate limit / Query limit reached
        if (response.status === 429) {
          const errorData = await response.json();
          console.error('429 Too Many Requests - Query limit reached:', errorData);

          const detail = errorData.detail;

          // Check if it's daily fallback limit (Sam's 10 queries/day)
          if (detail?.is_fallback_mode && detail?.daily_queries_remaining === 0) {
            throw new Error('You\'ve used all 10 daily queries for Sam. Upgrade to Analyst or Strategist for unlimited access!');
          }

          // Check if trial ended and user trying non-fallback agent
          if (detail?.is_fallback_mode && detail?.fallback_agent) {
            throw new Error('Your trial has ended. Only Sam is available with 10 queries/day in the free tier. Upgrade for full access!');
          }

          // General query limit message
          throw new Error(detail?.error || 'Query limit reached. Please upgrade your plan for more queries.');
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

      // Buffer for accumulating incomplete data across chunks
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        // Append chunk to line buffer
        lineBuffer += chunk;

        // Split into lines, but keep the last incomplete line in the buffer
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || ''; // Keep incomplete line for next chunk

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
                  plotData = parsed.content;
                  // Don't add to accumulated text - plot will be rendered separately
                  break;

                case 'approval_request':
                  // Handle approval request - combine with accumulated message

                  // Combine accumulated message with approval request in a single bubble
                  const combinedMessage: Message & { approvalData?: any } = {
                    id: generateMessageId(),
                    conversation_id: convId,
                    sender: 'bot',
                    content: accumulated || parsed.message || '',
                    agent_type: selectedAgent,  // Include agent type for proper display
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
                  break;

                case 'error':
                  throw new Error(parsed.message || 'Streaming error');

                case 'status':
                case 'processing':
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', data, e);
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
          agent_type: selectedAgent,  // Include agent that answered
          timestamp: new Date().toISOString(),
          plotData: plotData || undefined, // Include plot data if present
        };
        setMessages((prev) => [...prev, botMessage]);
      }

      setStreamingMessage('');
      setStreamingMessageId(null);
      abortControllerRef.current = null; // Clear the ref after successful completion
    } catch (error) {
      // Check if error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't show error toast for user-initiated cancellations
        return;
      }

      console.error('Streaming error:', error);

      // Show specific error message to user for non-abort errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response';
      toast.error(errorMessage);

      setStreamingMessage('');
      setStreamingMessageId(null);
      abortControllerRef.current = null;
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
  // Only hide welcome after first message is added (not just when sending starts)
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
        onAgentInitialized={setAgentInitialized}
        initialAgentFromUrl={agentFromUrl}
      />

      <div
        style={{
          position: 'relative',
          flex: 1,
          overflow: 'hidden', // Prevent scrollbars on the container itself
          minHeight: 0, // Important for flex children
          contain: 'layout style paint', // CSS containment for better performance
        }}
      >
        {/* Welcome Screen Layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: hasMessages ? 0 : 1,
            visibility: hasMessages ? 'hidden' : 'visible',
            transform: hasMessages ? 'translateY(-10px)' : 'translateY(0)',
            transition: 'opacity 0.25s ease-out, transform 0.25s ease-out, visibility 0s linear 0.25s',
            pointerEvents: hasMessages ? 'none' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // Prevent scroll on welcome screen
            willChange: hasMessages ? 'opacity, transform' : 'auto',
          }}
        >
          {!agentInitialized ? (
            <LoadingSkeleton />
          ) : (
            <div
              className="fade-in-up"
              style={{
                animation: 'fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <WelcomeScreen
                agentType={selectedAgent}
                onPromptClick={handlePromptClick}
              />
            </div>
          )}
        </div>

        {/* Message List Layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: hasMessages ? 1 : 0,
            visibility: hasMessages ? 'visible' : 'hidden',
            transform: hasMessages ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.25s ease-out, transform 0.25s ease-out, visibility 0s linear 0s',
            pointerEvents: hasMessages ? 'auto' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // Let MessageList handle its own scrolling
            willChange: hasMessages ? 'auto' : 'opacity, transform',
          }}
        >
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
                      conversation_id: conversationId || 0,
                      sender: 'bot' as const,
                      content: streamingMessage,
                      agent_type: selectedAgent,  // Use current selected agent for streaming
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
        </div>
      </div>

      <ChatInput
        agentType={selectedAgent}
        onSend={handleSendMessage}
        onStop={cancelRequest}
        disabled={sending || streaming}
        isStreaming={streaming}
        showSuggestions={!hasMessages && agentInitialized}
        placeholder={
          hasMessages
            ? 'Continue the conversation...'
            : AGENT_PLACEHOLDERS[selectedAgent]
        }
      />

      {/* Animation styles */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

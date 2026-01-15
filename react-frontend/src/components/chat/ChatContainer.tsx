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
import StorageOptimizationDashboard from '../artifact/StorageOptimizationDashboard';
import OptimizationResultsPanel from '../artifact/OptimizationResultsPanel';
import ImageArtifact from '../artifact/ImageArtifact';
import BIPVDesignArtifactWrapper from '../artifact/BIPVDesignArtifactWrapper';
import { useBIPV } from '../../contexts/BIPVContext';
import type { DashboardData } from '../artifact/StorageOptimizationDashboard';

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
  storage_optimization: 'Ask about solar & battery system optimization...',
  bipv_design: 'Describe your BIPV design vision...',
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
  const { saveArtifact, restoreArtifact, activeConversationId, setActiveConversationId, openArtifact } = useUIStore();
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

  // BIPV Design agent context
  const bipvContext = useBIPV();

  // Store BIPV context in ref to avoid dependency issues in useEffect
  const bipvContextRef = useRef(bipvContext);
  bipvContextRef.current = bipvContext;

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

      // Check if any messages are from storage_optimization agent
      // If so, restore the dashboard artifact from the database
      const hasStorageOptimizationMessages = data.some(
        (msg: Message) => msg.agent_type === 'storage_optimization'
      );

      if (hasStorageOptimizationMessages) {
        try {
          const dashboardResponse = await apiClient.getDashboardData(convId);
          if (dashboardResponse.success) {
            const allResults = dashboardResponse.all_dashboard_results;
            if (allResults && allResults.length > 0) {
              // Use OptimizationResultsPanel for multiple results
              openArtifact(
                <OptimizationResultsPanel
                  results={allResults.map((r: { label: string; data: DashboardData }) => ({
                    label: r.label,
                    data: r.data as DashboardData
                  }))}
                />,
                'storage_dashboard',
                convId
              );
            } else if (dashboardResponse.dashboard_data) {
              // Fallback to single dashboard (backward compatibility)
              openArtifact(
                <StorageOptimizationDashboard data={dashboardResponse.dashboard_data as DashboardData} />,
                'storage_dashboard',
                convId
              );
            }
          }
        } catch (dashboardError) {
          // Silently fail - dashboard may not exist for this conversation yet
          console.log('No dashboard data to restore for this conversation');
        }
      }

      // Check if any messages are from bipv_design agent
      // If so, restore the generated images from the separate images table
      const hasBIPVMessages = data.some(
        (msg: Message) => msg.agent_type === 'bipv_design'
      );

      console.log('[BIPV] hasBIPVMessages:', hasBIPVMessages);

      // Restore images from the dedicated BIPV images endpoint
      if (hasBIPVMessages) {
        try {
          console.log('[BIPV] Fetching generated images from API');
          const bipvImages = await apiClient.getBIPVImages(convId);
          console.log('[BIPV] Found', bipvImages.length, 'BIPV images in database');

          // Clear existing generated images first to avoid duplicates
          // (images may have been added during real-time streaming)
          bipvContextRef.current.clearGeneratedImages();

          // Add each image to the BIPV context (with DB id and timestamp for deduplication)
          // DB returns oldest first, addGeneratedImage prepends (newest first)
          // So we iterate in DB order: oldest images get added first and end up at the end
          for (const img of bipvImages) {
            bipvContextRef.current.addGeneratedImage({
              imageData: img.image_data,
              mimeType: img.mime_type || 'image/png',
              title: img.title || 'Generated BIPV Visualization',
              prompt: img.prompt || '',
              id: img.id, // Pass DB id for deduplication
              timestamp: new Date(img.created_at).getTime(), // Use original timestamp from DB
            });
          }
          console.log('[BIPV] Successfully restored', bipvImages.length, 'BIPV images');
        } catch (bipvError) {
          console.log('[BIPV] No BIPV images to restore or error occurred:', bipvError);
        }
      }
    } catch (error) {
      console.error('❌ [loadMessages] Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [openArtifact]);

  // Load messages and handle artifact persistence when conversation changes
  useEffect(() => {
    const convId = conversationId;
    const prevConvId = prevConversationId;

    // Save artifact for previous conversation before switching
    // But don't save bipv_design artifacts - they're managed by the agent
    if (prevConvId && prevConvId !== convId && selectedAgent !== 'bipv_design') {
      saveArtifact(prevConvId);
    }

    // Clear BIPV context when conversation changes (new chat started)
    // This ensures the artifact panel is fresh for each new conversation
    if (selectedAgent === 'bipv_design' && prevConvId && prevConvId !== convId) {
      console.log('[BIPV] Clearing context for new conversation');
      bipvContextRef.current.clearAll();
    }

    // Restore artifact for new conversation
    // Skip for bipv_design agent - it manages its own artifact panel
    if (convId) {
      if (selectedAgent !== 'bipv_design') {
        restoreArtifact(convId);
      }

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
        // Skip for bipv_design - it manages its own artifact
        if (selectedAgent !== 'bipv_design') {
          restoreArtifact(-1);
        }
        setMessages([]);
      }
    }

    setPrevConversationId(conversationId);
  }, [conversationId, prevConversationId, skipLoadMessages, saveArtifact, restoreArtifact, loadMessages, selectedAgent, setActiveConversationId, agentInitialized]);

  const handleSendMessage = async (content: string, file?: File, images?: File[]) => {
    try {
      // For BIPV design agent, combine images from artifact with any images from input
      let allImages = images || [];
      if (selectedAgent === 'bipv_design') {
        // Combine building and PV module images from BIPV context
        const artifactImages = [...bipvContext.buildingImages, ...bipvContext.pvModuleImages];
        if (artifactImages.length > 0) {
          allImages = [...artifactImages, ...allImages];
        }
      }

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

        // Check if user has unlimited access to this specific agent via whitelist
        let hasUnlimitedAccess = false;
        if (isInFallbackMode && !isSamAgent) {
          try {
            const unlimitedCheck = await apiClient.checkUnlimitedAccess(selectedAgent);
            hasUnlimitedAccess = unlimitedCheck.has_unlimited;
            if (hasUnlimitedAccess) {
              console.log(`User has unlimited access to agent '${selectedAgent}', bypassing query limit check`);
            }
          } catch (err) {
            console.error('Failed to check unlimited access:', err);
            // On error, proceed with normal limit check (fail-safe)
          }
        }

        // If at or over limit AND not using Sam agent AND no unlimited access, show the limit message
        if (isInFallbackMode && !isSamAgent && !hasUnlimitedAccess) {

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
      // Store file info in metadata for Claude-style card display
      const userMessage: Message = {
        id: generateMessageId(), // Unique ID
        conversation_id: convId,
        sender: 'user',
        content: content,
        timestamp: new Date().toISOString(),
        metadata: file ? {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        } : undefined,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Update store AFTER adding message (not URL)
      if (isNewConversation) {
        setSkipLoadMessages(true);
        setActiveConversationId(convId);
      }

      // Start streaming response (use allImages for BIPV agent)
      await streamResponse(convId, content, file, allImages.length > 0 ? allImages : images);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const streamResponse = async (convId: number, userMessage: string, file?: File, images?: File[]) => {
    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setStreaming(true);
      setStreamingMessage('');
      // Set a stable ID for the streaming message
      const msgId = Date.now();
      setStreamingMessageId(msgId);

      // Use images API for BIPV design agent with images, otherwise use regular API
      let response: Response;
      if (images && images.length > 0 && selectedAgent === 'bipv_design') {
        response = await apiClient.sendChatMessageWithImages(
          convId,
          userMessage,
          selectedAgent,
          abortController.signal,
          images
        );
      } else {
        response = await apiClient.sendChatMessage(
          convId,
          userMessage,
          selectedAgent,
          abortController.signal,
          file
        );
      }

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

                case 'image':
                  // Handle generated image from BIPV Design agent
                  // Backend now sends image_id instead of full base64 to avoid SSE issues
                  if (parsed.content) {
                    const imageContent = parsed.content;
                    const imageId = imageContent.image_id;

                    if (imageId) {
                      // Fetch image from cache endpoint
                      const token = localStorage.getItem('fastapi_access_token');
                      const apiBase = import.meta.env.VITE_API_BASE_URL || '';

                      fetch(`${apiBase}/api/v1/chat/images/${imageId}`, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      })
                        .then(response => {
                          if (!response.ok) throw new Error('Failed to fetch image');
                          return response.blob();
                        })
                        .then(blob => {
                          // Convert blob to base64
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64data = reader.result as string;
                            // Remove the data URL prefix to get just base64
                            const base64Only = base64data.split(',')[1];

                            // Add to BIPV generated images array
                            bipvContext.addGeneratedImage({
                              imageData: base64Only,
                              mimeType: imageContent.mime_type || 'image/png',
                              title: imageContent.title || 'Generated BIPV Visualization',
                              prompt: userMessage,
                            });
                          };
                          reader.readAsDataURL(blob);
                        })
                        .catch(err => {
                          console.error('Error fetching generated image:', err);
                        });
                    }
                  }
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
                  // Streaming complete - check if dashboard data is available
                  if (parsed.has_dashboard && convId) {
                    // Fetch dashboard data from API and open in artifact panel
                    try {
                      const dashboardResponse = await apiClient.getDashboardData(convId);
                      if (dashboardResponse.success) {
                        // Check if we have multiple results (new format)
                        const allResults = dashboardResponse.all_dashboard_results;
                        if (allResults && allResults.length > 0) {
                          // Use OptimizationResultsPanel for multiple results
                          openArtifact(
                            <OptimizationResultsPanel
                              results={allResults.map((r: { label: string; data: DashboardData }) => ({
                                label: r.label,
                                data: r.data as DashboardData
                              }))}
                            />,
                            'storage_dashboard',
                            convId
                          );
                        } else if (dashboardResponse.dashboard_data) {
                          // Fallback to single dashboard (backward compatibility)
                          openArtifact(
                            <StorageOptimizationDashboard data={dashboardResponse.dashboard_data as DashboardData} />,
                            'storage_dashboard',
                            convId
                          );
                        }
                      }
                    } catch (dashboardError) {
                      console.error('Failed to fetch dashboard data:', dashboardError);
                    }
                  }
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

  // Store refs for callbacks to avoid dependency issues in useEffect
  const handleSendMessageRef = useRef(handleSendMessage);
  handleSendMessageRef.current = handleSendMessage;

  // Set up BIPV context generate handler - stable reference using ref
  useEffect(() => {
    if (selectedAgent === 'bipv_design') {
      bipvContextRef.current.setOnGenerate((prompt: string) => {
        handleSendMessageRef.current(prompt);
      });
    }
    return () => {
      if (selectedAgent === 'bipv_design') {
        bipvContextRef.current.setOnGenerate(null);
      }
    };
  }, [selectedAgent]);

  // Update isGenerating state in BIPV context
  useEffect(() => {
    if (selectedAgent === 'bipv_design') {
      bipvContextRef.current.setIsGenerating(streaming || sending);
    }
  }, [selectedAgent, streaming, sending]);

  // Open BIPV Design artifact when agent is selected
  // Track whether we've opened the artifact for the current bipv_design session
  const bipvArtifactOpenedForAgentRef = useRef<boolean>(false);

  // Reset the ref on component mount to handle navigation back to BIPV Design
  useEffect(() => {
    console.log('[BIPV Mount] Component mounted, resetting artifact opened flag');
    bipvArtifactOpenedForAgentRef.current = false;
    // Cleanup on unmount
    return () => {
      console.log('[BIPV Mount] Component unmounting');
      bipvArtifactOpenedForAgentRef.current = false;
    };
  }, []);

  useEffect(() => {
    console.log('[BIPV Effect] Running:', {
      selectedAgent,
      agentInitialized,
      alreadyOpened: bipvArtifactOpenedForAgentRef.current
    });

    if (selectedAgent === 'bipv_design') {
      // Open artifact when agent is bipv_design and initialized, but only once per session
      if (agentInitialized && !bipvArtifactOpenedForAgentRef.current) {
        console.log('[BIPV Effect] Opening artifact panel');
        bipvArtifactOpenedForAgentRef.current = true;
        // Use setTimeout to ensure this runs AFTER ChatPage's clearArtifact effect
        // This is needed because both effects run on mount but we need this one to win
        setTimeout(() => {
          openArtifact(
            <BIPVDesignArtifactWrapper />,
            'bipv_design',
            conversationId || undefined
          );
        }, 0);
      }
    } else {
      // Reset flag when switching away from bipv_design
      if (bipvArtifactOpenedForAgentRef.current) {
        console.log('[BIPV Effect] Resetting - switched away from bipv_design');
        bipvArtifactOpenedForAgentRef.current = false;
        bipvContextRef.current.clearAll();
      }
    }
  }, [selectedAgent, agentInitialized, openArtifact, conversationId]);

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

  // Check if this is the storage optimization agent
  const isOptimizationAgent = selectedAgent === 'storage_optimization';

  // Show integrated input in welcome screen for ALL agents (input below welcome message)
  const showIntegratedInput = !hasMessages && agentInitialized;

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
                integratedInput={showIntegratedInput ? (
                  <ChatInput
                    agentType={selectedAgent}
                    onSend={handleSendMessage}
                    onStop={cancelRequest}
                    disabled={sending || streaming}
                    isStreaming={streaming}
                    showSuggestions={false}
                    placeholder={AGENT_PLACEHOLDERS[selectedAgent]}
                    isFirstMessage={true}
                  />
                ) : undefined}
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

      {/* Hide bottom ChatInput when:
          1. Integrated input is shown in WelcomeScreen (for all agents on welcome)
          2. Agent is not initialized yet (loading skeleton includes input skeleton) */}
      {!showIntegratedInput && agentInitialized && (
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
          isFirstMessage={false}
        />
      )}

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

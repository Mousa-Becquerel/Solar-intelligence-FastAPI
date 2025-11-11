# React Expert Contact Flow - Implementation Status

## ✅ Components Created

### 1. ApprovalButtons.tsx
**Location**: `react-frontend/src/components/chat/ApprovalButtons.tsx`
- Yes/No buttons with Material Design 3 styling
- Handles approval response API call
- Disables after click to prevent double-submission
- Triggers callbacks for approved/rejected actions

### 2. ArtifactPanel.tsx
**Location**: `react-frontend/src/components/artifact/ArtifactPanel.tsx`
- Slide-in side panel from right
- Backdrop overlay with click-to-close
- ESC key support
- Smooth animations matching Flask design

## 🚧 Components Still Needed

### 3. ContactForm Component
**File**: `react-frontend/src/components/artifact/ContactForm.tsx`

```typescript
import { useState } from 'react';
import { apiClient } from '../../api';
import { toast } from 'sonner';

// Expert data
const EXPERTS = [
  {
    id: 'senior-analyst',
    title: 'Senior Analyst',
    description: 'Expert in PV market and price. Works with Alex and Maya',
    icon: 'chart',
  },
  // ... other experts
];

interface ContactFormProps {
  onSuccess: () => void;
}

export default function ContactForm({ onSuccess }: ContactFormProps) {
  const [message, setMessage] = useState('');
  const [selectedExperts, setSelectedExperts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!message.trim()) {
      toast.error('Please enter your message');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.request('contact/submit', {
        method: 'POST',
        body: JSON.stringify({
          message: message.trim(),
          selected_experts: selectedExperts,
        }),
      });

      toast.success('Request sent successfully!');
      onSuccess();
    } catch (error) {
      toast.error('Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Expert Cards Grid */}
      <div className="expert-cards-grid">
        {EXPERTS.map(expert => (
          <ExpertCard
            key={expert.id}
            expert={expert}
            selected={selectedExperts.includes(expert.id)}
            onToggle={() => toggleExpert(expert.id)}
          />
        ))}
      </div>

      {/* Message Textarea */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Please describe what information you're looking for..."
        rows={6}
        required
      />

      {/* Submit Button */}
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Request'}
      </button>
    </form>
  );
}
```

### 4. Update ChatContainer for Approval Requests

**File**: `react-frontend/src/components/chat/ChatContainer.tsx`

Add to streaming handler:

```typescript
// In streamResponse function, add approval_request handling:

case 'approval_request':
  console.log('📋 Approval request received:', parsed);

  // Add approval request message with buttons
  const approvalMessage: Message & { approvalData?: any } = {
    id: generateMessageId(),
    conversation_id: convId,
    role: 'assistant',
    content: parsed.message || '',
    timestamp: new Date().toISOString(),
    approvalData: {
      conversationId: parsed.conversation_id,
      context: parsed.context,
      question: parsed.approval_question,
    },
  };

  setMessages((prev) => [...prev, approvalMessage]);
  break;
```

### 5. Update MessageBubble to Render Approval Buttons

**File**: `react-frontend/src/components/chat/MessageBubble.tsx`

```typescript
import ApprovalButtons from './ApprovalButtons';

// Inside MessageBubble component:
{message.approvalData && (
  <ApprovalButtons
    conversationId={message.approvalData.conversationId}
    context={message.approvalData.context}
    onApproved={() => {
      // Open artifact panel with contact form
      setShowArtifact(true);
    }}
    onRejected={() => {
      // Just close - rejection message will come from backend
    }}
  />
)}
```

### 6. Add Artifact Panel to MainLayout

**File**: `react-frontend/src/components/layout/MainLayout.tsx`

```typescript
import { useState } from 'react';
import ArtifactPanel from '../artifact/ArtifactPanel';
import ContactForm from '../artifact/ContactForm';

export default function MainLayout() {
  const [showArtifact, setShowArtifact] = useState(false);
  const [artifactContent, setArtifactContent] = useState<'contact' | null>(null);

  return (
    <>
      {/* Main chat content */}
      <Outlet context={{
        setShowArtifact,
        setArtifactContent
      }} />

      {/* Artifact Panel */}
      <ArtifactPanel
        isOpen={showArtifact}
        title={artifactContent === 'contact' ? 'Contact Our Experts' : ''}
        onClose={() => setShowArtifact(false)}
      >
        {artifactContent === 'contact' && (
          <ContactForm
            onSuccess={() => {
              // Show success message
              setArtifactContent(null);
              setTimeout(() => setShowArtifact(false), 3000);
            }}
          />
        )}
      </ArtifactPanel>
    </>
  );
}
```

## 🔌 API Endpoints Needed in FastAPI

### 1. Approval Response Endpoint
**Already exists**: `POST /api/v1/approval_response`

**Request**:
```json
{
  "approved": true,
  "conversation_id": 123,
  "context": "expert_contact"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Excellent! Let me open the contact form...",
  "redirect_to_contact": true
}
```

### 2. Contact Submission Endpoint
**Already exists**: `POST /api/v1/contact/submit`

**Request**:
```json
{
  "message": "I need help with...",
  "selected_experts": ["senior-analyst", "ai-expert"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Thank you! Our experts will reach out within 24-48 hours."
}
```

## 🎨 CSS Styling Required

All CSS is already created in Flask. Key files:
- `static/css/components/expert-cards.css`
- `static/css/components/artifact-contact-form.css`

Need to extract and convert to React inline styles or CSS modules.

## 📝 Type Definitions Needed

**File**: `react-frontend/src/types/api.ts`

```typescript
// Add to existing types:

export interface ApprovalData {
  conversationId: number;
  context: string;
  question: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  plotData?: any;
  approvalData?: ApprovalData;  // NEW
}

export interface ContactRequest {
  message: string;
  selected_experts: string[];
}

export interface ApprovalResponse {
  approved: boolean;
  conversation_id: number;
  context: string;
}
```

## 🔄 Integration Steps

1. ✅ **ApprovalButtons component** - Created
2. ✅ **ArtifactPanel component** - Created
3. ⏳ **ContactForm component** - Need to create with expert cards
4. ⏳ **Update ChatContainer** - Add approval_request case to streaming
5. ⏳ **Update MessageBubble** - Render ApprovalButtons when approvalData exists
6. ⏳ **Update MainLayout** - Add ArtifactPanel with state management
7. ⏳ **Add API methods** - approval_response and contact_submit to apiClient
8. ⏳ **Add CSS** - Extract from Flask and add to React
9. ⏳ **Test flow** - User query → bad answer → approval → contact form → submit

## 🎯 Current Status

**Completed**: 2/9 components
**Next Step**: Create ContactForm with ExpertCard sub-component

The foundation is laid with ApprovalButtons and ArtifactPanel. The remaining work is to:
1. Build the ContactForm UI
2. Wire up the streaming to detect approval_request events
3. Connect everything together in MainLayout
4. Add the necessary CSS styling

All backend endpoints already exist in FastAPI and work correctly!

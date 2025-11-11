# Expert Contact Flow - Complete Implementation Guide

## Overview

The PV Capacity Agent (Market Intelligence Agent) has a sophisticated expert contact flow that triggers when:
1. The agent cannot find the requested data (**"bad_answer"**)
2. The user explicitly requests to speak with an expert (**"contact_request"**)

This document details EVERY aspect of how this feature works in the original Flask implementation.

---

## 🔄 Complete Flow Architecture

### 1. **User Query Processing**
```
User Query → Market Intelligence Agent → Evaluation Agent → Quality Classification
```

### 2. **Quality Classifications** (4 types)

The **Evaluation Agent** classifies responses as:

| Classification | Description | Trigger Condition | Action |
|---------------|-------------|-------------------|---------|
| **`good_answer`** | Agent found and provided the requested data | Response includes specific numerical data user requested | Route to Response Agent (format beautif answer) |
| **`bad_answer`** | Agent could NOT provide the requested data | Response says data "unavailable", "not found", or explains why missing | Route to Follow-up Agent → Show approval UI |
| **`neutral`** | Greetings, off-topic conversation | No data request being addressed | Route to Response Agent |
| **`contact_request`** | User explicitly asks to contact an expert | User query contains "speak with expert", "talk to human", etc. | Route to Follow-up Agent → Show approval UI |

---

## 📊 Backend Implementation

### A. **Market Intelligence Agent** (`market_intelligence_agent.py`)

#### **Evaluation Agent** (Lines 730-828)
```python
self.evaluation_agent = Agent(
    name="Evaluation Agent",
    instructions="""Classify the Market Intelligence Agent's response as:

    - "good_answer": Response includes the specific data/numbers requested
    - "bad_answer": Response does NOT provide requested data (even if explains why)
    - "neutral": Greetings or off-topic without addressing data request
    - "contact_request": User asks to speak to a human expert

    CRITICAL: Classify as "bad_answer" if response explains WHY data is
    missing or provides context INSTEAD of actual data. Explanations and
    context are NOT a substitute for data.
    """,
    model="gpt-4.1-mini",
    output_type=EvaluationAgentSchema
)
```

**Output Schema:**
```python
class EvaluationAgentSchema(BaseModel):
    response_quality: Literal["good_answer", "bad_answer", "neutral", "contact_request"]
```

#### **Follow-up Agent** (Lines 892-982)
Generates expert contact offer message:

```python
self.follow_up_agent = Agent(
    name="Follow-up Agent",
    instructions="""Response Structure:

    ## Your Query
    [Acknowledge what they asked for - 1 sentence]

    ## How Our Experts Can Help

    Our team of solar market specialists is here to provide you with:

    - **Detailed, tailored analysis** based on latest industry data
    - **Custom reports** addressing your specific questions
    - **Direct expert consultation** via email
    - **Personalized insights** from professionals with deep knowledge

    Our experts typically respond within **24-48 hours** with thorough,
    actionable insights tailored to your needs.

    **Would you like us to connect you with one of our solar market specialists?**
    """,
    model="gpt-4.1-mini"
)
```

#### **Streaming Logic** (Lines 1244-1284)

When `response_quality == "bad_answer"`:

```python
if response_quality == "bad_answer":
    logger.info("Bad answer detected - routing to follow-up agent")

    # Stream follow-up agent response
    result = Runner.run_streamed(
        self.follow_up_agent,
        input=query,
        session=session,
        run_config=RunConfig(...)
    )

    # Stream text chunks
    async for event in result.stream_events():
        if event.type == "raw_response_event":
            cleaned_delta = clean_citation_markers(event.data.delta)
            if cleaned_delta:
                yield json.dumps({
                    "type": "text_chunk",
                    "content": cleaned_delta
                })

    # After streaming complete, yield approval request
    yield json.dumps({
        "type": "approval_request",
        "message": "",  # Empty - text was already streamed
        "approval_question": "Would you like to proceed and reach the expert?",
        "conversation_id": conversation_id,
        "context": "expert_contact"
    })
```

---

### B. **Chat Processing** (`app/routes/chat.py`)

#### **SSE Stream Handler** (Lines 576-585)
```python
elif event_type == 'approval_request':
    # Stream approval request to frontend
    response_type = "approval_request"
    yield f"data: {json.dumps({
        'type': 'approval_request',
        'message': response_json.get('message'),
        'approval_question': response_json.get('approval_question'),
        'conversation_id': response_json.get('conversation_id'),
        'context': response_json.get('context')
    })}\n\n"
```

#### **Approval Response Endpoint** (Lines 673-756)
```python
@chat_bp.route('/api/approval_response', methods=['POST'])
@login_required
def approval_response():
    """Handle user approval (Yes/No) for expert contact."""
    data = request.get_json(force=True)

    approved = data.get('approved', False)
    conversation_id = data.get('conversation_id')
    context = data.get('context', '')

    if approved:
        response_message = "Excellent! Let me open the contact form..."
        redirect_to_contact = True
    else:
        response_message = "No problem! Can I help you with other queries then?"
        redirect_to_contact = False

    # Save approval to conversation history
    if conversation_id:
        conv_service.add_message(
            conversation_id=conversation_id,
            content="Yes, I want to contact an expert" if approved else "No, thanks",
            sender='user'
        )
        conv_service.add_message(
            conversation_id=conversation_id,
            content=response_message,
            sender='bot'
        )

    return jsonify({
        'success': True,
        'message': response_message,
        'redirect_to_contact': redirect_to_contact
    })
```

#### **Contact Form Submission** (Lines 601-670)
```python
@chat_bp.route('/contact/submit', methods=['POST'])
@login_required
def submit_expert_contact():
    """Handle expert contact form submission from artifact panel."""
    data = request.get_json()

    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    company = data.get('company', '').strip()
    message = data.get('message', '').strip()
    selected_experts = data.get('selected_experts', [])

    # Save to database
    contact_request = ContactRequest(
        user_id=current_user.id,
        name=name,
        email=email,
        company=company if company else None,
        message=message,
        source='artifact_panel',
        selected_experts=selected_experts
    )
    db.session.add(contact_request)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Thank you! Our experts will reach out within 24-48 hours.'
    })
```

---

## 🎨 Frontend Implementation

### A. **Approval Flow Module** (`static/js/modules/chat/approvalFlow.js`)

#### **Create Approval UI** (Lines 22-73)
```javascript
createApprovalUI(data) {
    const { message, approval_question, conversation_id, context } = data;

    // Create message container
    const messageContainer = createElement('div', {
        classes: 'message-container approval-container',
        attributes: {
            'data-msg-type': 'approval_request',
            'data-context': context,
            'data-conversation-id': conversation_id
        }
    });

    // Create message div with rendered markdown
    const messageDiv = createElement('div', {
        classes: 'message bot-message market-agent',
        innerHTML: safeRenderMarkdown(message || '')
    });

    // Create approval buttons
    const approvalButtons = createElement('div', {
        classes: 'approval-buttons'
    });

    // Yes button
    const yesBtn = createElement('button', {
        classes: 'approval-btn approval-yes',
        textContent: 'Yes, contact expert'
    });
    yesBtn.addEventListener('click', () => {
        this.handleApprovalResponse(true, conversation_id, context, messageContainer);
    });

    // No button
    const noBtn = createElement('button', {
        classes: 'approval-btn approval-no',
        textContent: 'No, thanks'
    });
    noBtn.addEventListener('click', () => {
        this.handleApprovalResponse(false, conversation_id, context, messageContainer);
    });

    approvalButtons.appendChild(yesBtn);
    approvalButtons.appendChild(noBtn);
    messageDiv.appendChild(approvalButtons);
    messageContainer.appendChild(messageDiv);

    return messageContainer;
}
```

#### **Handle Approval Response** (Lines 82-171)
```javascript
async handleApprovalResponse(approved, conversationId, context, messageContainer) {
    // Disable buttons
    const buttons = messageContainer.querySelectorAll('.approval-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });

    // Show loading
    const loadingDiv = createElement('div', {
        classes: 'approval-loading',
        textContent: 'Processing your response...'
    });
    messageContainer.querySelector('.message').appendChild(loadingDiv);

    try {
        // Send to backend
        const result = await api.sendApprovalResponse(approved, conversationId, context);

        // Remove loading and buttons
        loadingDiv.remove();
        messageContainer.querySelector('.approval-buttons')?.remove();

        // Show bot response
        const responseContainer = createElement('div', {
            classes: 'message-container',
            innerHTML: safeRenderMarkdown(result.message)
        });
        chatWrapper.appendChild(responseContainer);

        // If approved, open contact form in artifact panel
        if (approved && result.redirect_to_contact) {
            setTimeout(() => {
                contactFormHandler.showContactForm();
            }, 800);
        }

        scrollToBottom(chatMessages);

    } catch (error) {
        // Show error, re-enable buttons
        console.error('Error handling approval:', error);
        loadingDiv.remove();
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
    }
}
```

---

### B. **Artifact Panel** (`static/js/modules/ui/artifactPanel.js`)

Side panel that slides in from the right with contact form.

#### **Panel Structure** (Lines 8-20)
```javascript
class ArtifactPanel {
    constructor() {
        this.panel = document.getElementById('artifact-panel');
        this.mainLayout = document.getElementById('main-layout');
        this.titleElement = document.getElementById('artifact-title');
        this.contentElement = document.getElementById('artifact-content');
        this.closeBtn = document.getElementById('artifact-close-btn');
        this.toggleBtn = document.getElementById('artifact-toggle-btn');

        this.isOpen = false;
        this.currentContent = null;
    }
}
```

#### **Open Panel** (Lines 65-111)
```javascript
open(options = {}) {
    const { title = 'Artifact', content = '', type = 'html' } = options;

    // Set title
    this.titleElement.textContent = title;

    // Set content (HTML string or Element)
    if (typeof content === 'string') {
        this.contentElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        this.contentElement.innerHTML = '';
        this.contentElement.appendChild(content);
    }

    // Update main layout to show artifact
    this.mainLayout.setAttribute('data-artifact-open', 'true');

    this.isOpen = true;
    this.currentContent = { title, content, type };

    // Show toggle button
    this.toggleBtn.style.display = 'flex';
}
```

---

### C. **Contact Form Handler** (`static/js/modules/ui/contactFormHandler.js`)

#### **Show Contact Form** (Lines 21-39)
```javascript
showContactForm() {
    // Get CSRF token
    const csrfToken = document.querySelector('input[name="csrf_token"]')?.value || '';

    // Generate form HTML
    const formHTML = generateContactFormHTML(csrfToken);

    // Open artifact panel
    artifactPanel.open({
        title: '',
        content: formHTML,
        type: 'form'
    });

    // Setup form after panel opens
    setTimeout(() => {
        this.setupForm();
    }, 100);
}
```

#### **Form Submission** (Lines 143-208)
```javascript
async handleSubmit() {
    // Validate
    if (!this.validateForm()) {
        this.showFormMessage('Please fix the errors', 'error');
        return;
    }

    // Get user info from meta tags
    const userName = document.querySelector('meta[name="user-name"]')?.content || 'User';
    const userEmail = document.querySelector('meta[name="user-email"]')?.content || '';

    // Get selected experts
    const selectedExpertIds = this.getSelectedExperts ? this.getSelectedExperts() : [];
    const selectedExpertTitles = getExpertTitles(selectedExpertIds);

    // Build message with expert preferences
    let messageText = formData.get('message');
    if (selectedExpertTitles.length > 0) {
        messageText = `[Requested Experts: ${selectedExpertTitles.join(', ')}]\n\n${messageText}`;
    }

    const data = {
        name: userName,
        email: userEmail,
        company: '',
        message: messageText,
        selected_experts: selectedExpertIds
    };

    // Submit
    const response = await fetch('/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        this.showSuccess(userName);
    }
}
```

---

### D. **CSS Styling** (`static/css/components/messages.css`)

#### **Approval Buttons** (Lines 1904-1985)
```css
.approval-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    justify-content: flex-start;
}

.approval-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 9999px;                  /* Pill shape */
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    box-shadow: none;                       /* Flat design */
    min-width: 140px;
    text-align: center;
    position: relative;
    overflow: hidden;
}

/* Material Design 3 State Layer */
.approval-btn::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: white;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
}

.approval-yes {
    background: #FFB74D;                    /* Material Gold */
    color: #1e293b;
}

.approval-yes:hover:not(:disabled)::before {
    opacity: 0.08;                          /* State layer */
}

.approval-no {
    background: #F5F5F5;                    /* Light gray */
    color: #64748b;
}

.approval-no:hover:not(:disabled) {
    background: #EEEEEE;
}

.approval-btn:disabled {
    opacity: 0.38;
    cursor: not-allowed;
}
```

---

## 📋 Database Model

### **ContactRequest** (`models.py`)
```python
class ContactRequest(Base):
    """Model for storing contact form submissions"""
    __tablename__ = "contact_request"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.id'))
    name = Column(String(100), nullable=False)
    email = Column(String(120), nullable=False)
    company = Column(String(150), nullable=True)
    phone = Column(String(20), nullable=True)
    message = Column(Text, nullable=False)
    source = Column(String(50), nullable=False)  # 'artifact_panel', 'landing_page', 'contact_page'
    status = Column(String(20), default='pending')  # 'pending', 'contacted', 'resolved'
    selected_experts = Column(Text, nullable=True)  # JSON array of expert IDs
    created_at = Column(DateTime, default=datetime.utcnow)
    contacted_at = Column(DateTime, nullable=True)
```

---

## 🔁 Complete User Journey

### **Scenario: User asks for unavailable data**

1. **User**: "What is the BESS capacity in Italy for 2024?"

2. **Market Intelligence Agent**: Searches data, responds: "BESS data is not available in the dataset..."

3. **Evaluation Agent**: Classifies as `"bad_answer"` (data not provided)

4. **Follow-up Agent**: Streams response:
   ```markdown
   ## Your Query
   You asked about battery energy storage systems (BESS) capacity trends in Italy.

   ## How Our Experts Can Help
   Our team of solar market specialists is here to provide you with:
   - **Detailed, tailored analysis** based on latest industry data
   - **Custom reports** addressing your specific questions
   - **Direct expert consultation** via email
   - **Personalized insights** from professionals with deep knowledge

   Our experts typically respond within **24-48 hours**.

   **Would you like us to connect you with one of our solar market specialists?**
   ```

5. **Frontend**: Renders message + approval buttons (Yes / No)

6. **User clicks "Yes, contact expert"**

7. **Backend**: Returns success + `redirect_to_contact: true`

8. **Frontend**: Opens artifact panel with contact form after 800ms

9. **User fills form** with message and selects expert categories

10. **Submit**: Saves `ContactRequest` to database with `source='artifact_panel'`

11. **Success screen** shows: "Thank you! Our experts will reach out within 24-48 hours."

---

## 🎯 Key Implementation Details

### **1. Message Streaming**
- Follow-up agent message is **streamed** as `text_chunk` events
- Approval request is sent **after** streaming completes
- This prevents duplicate text display

### **2. Approval Context**
- `context: "expert_contact"` identifies the approval type
- Saved to conversation history for tracking
- Can support multiple approval types in future

### **3. Expert Selection**
- Contact form includes expert cards (e.g., "Market Analysis", "Technical Consulting")
- User can select multiple experts
- Selections saved as JSON array in `selected_experts` column

### **4. User Data Pre-fill**
- User's name and email pre-filled from authenticated session
- Meta tags used: `<meta name="user-name" content="...">`
- Company field optional

### **5. Response Tracking**
- All contact requests saved with `status='pending'`
- Admin can update to `'contacted'` or `'resolved'`
- `contacted_at` timestamp when admin marks as contacted

---

## 🚀 React Migration Requirements

To implement this in React:

### **Required Components**
1. `ApprovalButtons.tsx` - Yes/No buttons with state management
2. `ArtifactPanel.tsx` - Side panel container (slide-in from right)
3. `ContactForm.tsx` - Form with expert cards, validation
4. `ExpertCards.tsx` - Selectable expert categories

### **Required API Endpoints** (Already in FastAPI)
1. `POST /api/v1/approval_response` - Handle Yes/No response
2. `POST /api/v1/contact/submit` - Submit contact form

### **Required State Management**
1. Track approval request in chat state
2. Manage artifact panel open/close
3. Handle form validation and submission

### **Required Styling**
1. Material Design 3 flat buttons
2. Slide-in panel animation
3. Form field validation states

---

## 📝 Summary

The expert contact flow is triggered when the Market Intelligence Agent:
- **Cannot find requested data** (`bad_answer`)
- **User explicitly requests expert** (`contact_request`)

Flow: **Query** → **Evaluation** → **Follow-up Message** → **Approval UI** → **Contact Form (Artifact Panel)** → **Database**

This provides a seamless, professional way to connect users with human experts when AI cannot satisfy their query.

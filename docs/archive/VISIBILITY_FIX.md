# Message Visibility Fix

## Issue
When user sent a query:
- User message was not visible in the chat
- Welcome message remained visible
- Suggested queries remained visible
- Input field showed "Processing your request..."

## Root Cause
The visibility functions were checking the wrong container:
- **Messages are added to**: `.chat-messages-wrapper`
- **Visibility functions were checking**: `#chat-messages`

This mismatch meant that even when messages were added, the functions couldn't detect them.

## Fix Applied

### 1. Fixed `updateSuggestedQueriesVisibility()` (line 2473-2482)
**Before:**
```javascript
function updateSuggestedQueriesVisibility() {
    const chatMessages = document.getElementById('chat-messages');
    const messageCount = chatMessages ? chatMessages.querySelectorAll('.message-container').length : 0;

    if (messageCount === 0) {
        showSuggestedQueries();
    } else {
        hideSuggestedQueries();
    }
}
```

**After:**
```javascript
function updateSuggestedQueriesVisibility() {
    const chatWrapper = document.querySelector('.chat-messages-wrapper');
    const messageCount = chatWrapper ? chatWrapper.querySelectorAll('.message-container').length : 0;

    if (messageCount === 0) {
        showSuggestedQueries();
    } else {
        hideSuggestedQueries();
    }
}
```

### 2. Fixed `updateWelcomeMessageVisibility()` (line 2173-2188)
**Before:**
```javascript
function updateWelcomeMessageVisibility() {
    const welcomeMessage = document.getElementById('welcome-message');
    const chatWrapper = document.querySelector('.chat-messages-wrapper');

    if (!welcomeMessage) return;

    // Show welcome message if no messages in chat, hide otherwise
    const hasMessages = chatWrapper && chatWrapper.children.length > 0;

    if (hasMessages) {
        welcomeMessage.classList.add('hidden');
    } else {
        welcomeMessage.classList.remove('hidden');
    }
}
```

**After:**
```javascript
function updateWelcomeMessageVisibility() {
    const welcomeMessage = document.getElementById('welcome-message');
    const chatWrapper = document.querySelector('.chat-messages-wrapper');

    if (!welcomeMessage) return;

    // Show welcome message if no messages in chat, hide otherwise
    const messageCount = chatWrapper ? chatWrapper.querySelectorAll('.message-container').length : 0;
    const hasMessages = messageCount > 0;

    if (hasMessages) {
        welcomeMessage.classList.add('hidden');
    } else {
        welcomeMessage.classList.remove('hidden');
    }
}
```

**Improvement**: Changed from checking `children.length` (which includes loading spinners) to checking `.message-container` count specifically.

## Expected Behavior After Fix

When user sends a query:
1. ✅ User message appears in chat
2. ✅ Welcome message hides
3. ✅ Suggested queries hide
4. ✅ Loading spinner appears
5. ✅ Bot response appears when ready

## Files Modified
- `static/js/main.js` (lines 2173-2188, 2473-2482)

## Testing
To test:
1. Refresh the page
2. Enter a query in the input field
3. Click send or press Enter
4. Verify:
   - User message appears
   - Welcome message disappears
   - Suggested queries disappear
   - Loading spinner shows
   - Bot response appears

## Related Issues
- This was a continuation issue from the previous session
- Related to the loading spinner fix (we fixed the spinner issue, but introduced this visibility bug)
- The visibility functions were calling after `addMessage()`, but checking the wrong container

---

**Fix Date**: 2025-10-27
**Status**: ✅ Completed

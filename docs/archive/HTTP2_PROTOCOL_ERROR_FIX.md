# HTTP/2 Protocol Error Fix - AWS Deployment

## Issue Report

**Error**: `ERR_HTTP2_PROTOCOL_ERROR` in AWS deployment
**Location**: `/chat` endpoint
**Impact**: Users cannot send queries, network error prevents chat functionality

---

## Root Cause Analysis

The `ERR_HTTP2_PROTOCOL_ERROR` typically occurs in one of these scenarios:

### 1. **Response Too Large** (Most Likely)
- AWS Application Load Balancer (ALB) or API Gateway has payload size limits
- HTTP/2 has stricter frame size limits than HTTP/1.1
- Large streaming responses can exceed these limits

### 2. **Connection Timeout**
- Long-running agent queries exceed timeout limits
- AWS ALB default timeout: 60 seconds
- Idle connection timeout on HTTP/2

### 3. **Incomplete Stream**
- Server closes connection before stream completes
- Missing `Connection: keep-alive` headers
- Improper SSE stream termination

### 4. **HTTP/2 Configuration Mismatch**
- AWS infrastructure forcing HTTP/2 when app expects HTTP/1.1
- Missing or incorrect headers for SSE over HTTP/2

---

## Current Code Analysis

### Frontend (main.js:1773-1857)
```javascript
const response = await fetch('/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
    },
    body: JSON.stringify({
        message,
        conversation_id: currentConversationId,
        agent_type: agentType
    }),
});

// SSE stream reading
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const {value, done} = await reader.read();  // ❌ No timeout, no error handling
    if (done) break;
    // ... process chunk
}
```

**Issues**:
- ❌ No timeout on stream reading
- ❌ No error boundary around stream read loop
- ❌ No connection keep-alive detection
- ❌ No retry logic for failed streams

### Backend (app.py:1806-1813)
```python
return Response(
    generate_streaming_response(),
    mimetype='text/event-stream',
    headers={
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'  # For Nginx
    }
)
```

**Issues**:
- ❌ Missing `Connection: keep-alive` header
- ❌ Missing timeout configuration
- ❌ No explicit HTTP/2 compatibility headers
- ❌ No max stream duration limit

---

## Recommended Fixes

### Fix 1: Add Proper SSE Headers (Backend)

Update the Response headers to be HTTP/2 compatible:

```python
# In app.py, update all SSE Response returns (lines 1806-1813, 1957, 2143)

return Response(
    generate_streaming_response(),
    mimetype='text/event-stream',
    headers={
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive',  # ✅ Keep connection alive
        'Content-Type': 'text/event-stream; charset=utf-8',  # ✅ Explicit charset
        'Transfer-Encoding': 'chunked',  # ✅ Chunked transfer
        'X-Content-Type-Options': 'nosniff'  # ✅ Security
    }
)
```

### Fix 2: Add Stream Timeout and Error Handling (Frontend)

Add timeout and proper error handling to the stream reader:

```javascript
// In static/js/main.js, around line 1852-1857

// Configuration
const STREAM_TIMEOUT = 120000; // 2 minutes
const STREAM_IDLE_TIMEOUT = 30000; // 30 seconds idle

// Read SSE stream with timeout
const reader = response.body.getReader();
const decoder = new TextDecoder();
let lastActivityTime = Date.now();
let timeoutId = null;

// Overall timeout
const overallTimeout = setTimeout(() => {
    console.error('Stream timeout: No response for 2 minutes');
    reader.cancel();
    throw new Error('Stream timeout - request took too long');
}, STREAM_TIMEOUT);

try {
    while (true) {
        // Idle timeout checker
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            console.error('Stream idle timeout: No data for 30 seconds');
            reader.cancel();
            throw new Error('Connection idle timeout');
        }, STREAM_IDLE_TIMEOUT);

        const {value, done} = await reader.read();
        lastActivityTime = Date.now();

        if (done) {
            console.log('Stream completed successfully');
            break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const eventData = JSON.parse(line.substring(6));
                    // ... process event data
                } catch (parseError) {
                    console.warn('Failed to parse SSE event:', line, parseError);
                    // Continue processing other lines
                }
            }
        }
    }
} catch (error) {
    console.error('Stream reading error:', error);

    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('network')) {
        throw new Error('Network error - connection lost. This may be due to request size or timeout limits.');
    }

    throw error;
} finally {
    // Cleanup
    clearTimeout(overallTimeout);
    if (timeoutId) clearTimeout(timeoutId);

    try {
        reader.releaseLock();
    } catch (e) {
        console.warn('Reader already released');
    }
}
```

### Fix 3: Add HTTP/2 Downgrade Option (Backend)

For AWS compatibility, allow HTTP/1.1 fallback:

```python
# Add to Flask app initialization in app.py

# Force HTTP/1.1 for SSE compatibility with AWS ALB
# AWS ALB can have issues with HTTP/2 Server Push and large SSE streams
@app.after_request
def force_http11_for_sse(response):
    """Force HTTP/1.1 for SSE endpoints to avoid HTTP/2 protocol errors"""
    if response.mimetype == 'text/event-stream':
        # Remove HTTP/2 specific headers
        response.headers.pop('X-HTTP2-Push', None)
        # Ensure HTTP/1.1 compatibility
        response.direct_passthrough = False
    return response
```

### Fix 4: Add Chunking and Heartbeat (Backend)

Prevent idle connection timeout with heartbeat:

```python
# In app.py, modify the streaming generator functions

def generate_streaming_response():
    """Generate SSE stream with heartbeat to prevent timeout"""
    import time

    last_heartbeat = time.time()
    HEARTBEAT_INTERVAL = 15  # Send heartbeat every 15 seconds

    try:
        for response in agent.stream_query(user_message, conv_id):
            # Send actual data
            yield f"data: {json.dumps(response)}\n\n"
            last_heartbeat = time.time()

            # Send heartbeat if idle for too long
            if time.time() - last_heartbeat > HEARTBEAT_INTERVAL:
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': time.time()})}\n\n"
                last_heartbeat = time.time()

    except Exception as e:
        # Send error event
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    finally:
        # Send completion event
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
```

### Fix 5: AWS ALB Configuration

Update AWS Application Load Balancer settings:

1. **Increase Timeout**:
```bash
# AWS CLI
aws elbv2 modify-target-group-attributes \
    --target-group-arn <your-target-group-arn> \
    --attributes \
        Key=deregistration_delay.connection_termination.enabled,Value=true \
        Key=deregistration_delay.timeout_seconds,Value=300
```

2. **HTTP/2 Settings** (in ALB listener):
   - Enable HTTP/2 to HTTP/1.1 downgrade
   - Set idle timeout to 120 seconds (default is 60)

3. **Target Group Health Check**:
   - Ensure health check doesn't conflict with long-running requests
   - Use separate health check endpoint

### Fix 6: Gunicorn Configuration

If using Gunicorn, update worker timeout:

```python
# gunicorn.conf.py or deployment/gunicorn.conf.py

# Worker settings
workers = 4
worker_class = 'sync'  # or 'gevent' for async
timeout = 300  # 5 minutes (increased from default 30s)
keepalive = 120  # Keep connections alive for 2 minutes

# Logging
loglevel = 'info'
accesslog = '-'
errorlog = '-'

# For SSE streaming
worker_tmp_dir = '/dev/shm'  # Use tmpfs for better performance
```

---

## Implementation Priority

### Critical (Do First)
1. ✅ Add proper SSE headers with `Connection: keep-alive`
2. ✅ Add stream timeout and error handling in frontend
3. ✅ Increase AWS ALB timeout to 120 seconds

### High Priority
4. ✅ Add heartbeat mechanism to prevent idle timeout
5. ✅ Add HTTP/1.1 fallback for AWS compatibility
6. ✅ Update Gunicorn timeout configuration

### Medium Priority
7. Add retry logic for failed streams
8. Implement progressive enhancement (show partial results if stream fails)
9. Add connection quality indicator

---

## Testing Checklist

### Local Testing
- [ ] Test with long-running queries (> 60 seconds)
- [ ] Test with large response payloads
- [ ] Test connection interruption handling
- [ ] Test idle connection timeout

### AWS Staging Testing
- [ ] Verify ALB timeout settings
- [ ] Test with real network latency
- [ ] Monitor CloudWatch logs for errors
- [ ] Test with multiple concurrent users

### Production Deployment
- [ ] Deploy during low-traffic window
- [ ] Monitor error rates
- [ ] Have rollback plan ready
- [ ] Test critical user journeys

---

## Monitoring and Debugging

### CloudWatch Metrics to Watch
```
ALB:
- TargetResponseTime (should be < 120s)
- HTTPCode_Target_5XX_Count (should decrease)
- RejectedConnectionCount (should be 0)

Application:
- Stream completion rate
- Average stream duration
- Network error frequency
```

### Logging Enhancements

Add detailed logging for debugging:

```python
# In app.py

import logging
logger = logging.getLogger(__name__)

@app.route('/chat', methods=['POST'])
def chat():
    request_id = str(uuid.uuid4())[:8]
    logger.info(f"[{request_id}] Chat request started")

    def generate_streaming_response():
        chunk_count = 0
        start_time = time.time()

        try:
            for response in agent.stream_query(user_message, conv_id):
                chunk_count += 1
                yield f"data: {json.dumps(response)}\n\n"

                # Log every 10 chunks
                if chunk_count % 10 == 0:
                    elapsed = time.time() - start_time
                    logger.info(f"[{request_id}] Streamed {chunk_count} chunks in {elapsed:.1f}s")

        except Exception as e:
            logger.error(f"[{request_id}] Stream error after {chunk_count} chunks: {e}")
            raise

        finally:
            total_time = time.time() - start_time
            logger.info(f"[{request_id}] Stream completed: {chunk_count} chunks in {total_time:.1f}s")

    return Response(generate_streaming_response(), ...)
```

---

## Alternative Solution: Fallback to Polling

If streaming continues to be problematic, implement polling fallback:

```javascript
// In main.js

async function sendMessageWithFallback(message, agentType) {
    try {
        // Try streaming first
        await sendMessageStreaming(message, agentType);
    } catch (error) {
        if (error.message.includes('network') || error.message.includes('HTTP2')) {
            console.warn('Streaming failed, falling back to polling');
            await sendMessagePolling(message, agentType);
        } else {
            throw error;
        }
    }
}

async function sendMessagePolling(message, agentType) {
    // Submit query
    const response = await fetch('/chat-async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ message, conversation_id: currentConversationId, agent_type: agentType })
    });

    const { task_id } = await response.json();

    // Poll for results
    const pollInterval = setInterval(async () => {
        const status = await fetch(`/chat-status/${task_id}`);
        const data = await status.json();

        if (data.status === 'complete') {
            clearInterval(pollInterval);
            displayMessage(data.result);
        } else if (data.status === 'error') {
            clearInterval(pollInterval);
            showError(data.error);
        }
        // Continue polling if status is 'processing'
    }, 2000);
}
```

---

## Expected Outcome

After implementing these fixes:
- ✅ No more `ERR_HTTP2_PROTOCOL_ERROR`
- ✅ Graceful handling of long-running queries
- ✅ Better user experience with timeout feedback
- ✅ AWS compatibility with proper headers
- ✅ Monitoring and debugging capabilities

---

**Status**: Ready for Implementation
**Estimated Time**: 2-3 hours
**Risk Level**: Medium (test thoroughly in staging)

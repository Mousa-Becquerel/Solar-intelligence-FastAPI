# Duplicate Message Bug Fix

## Problem

Users were seeing duplicate messages in conversation history for the **News Agent** and **Market Intelligence Agent**.

### Example:
```
User: Hi
User: Who are you
User: What did I ask before

Agent response: "You asked 6 questions: Hi (twice), Who are you (twice), What did I ask before (twice)"
```

## Root Cause

Both the **News Agent** and **Market Intelligence Agent** use **multi-agent workflows** where multiple agents are called in sequence:

### News Agent Workflow:
1. **Intent Classifier** → Determines if query is general news or needs web scraping
2. **News/Scraping Agent** → Actually answers the query

### Market Intelligence Agent Workflow:
1. **Classification Agent** → Determines if query is about data or plotting
2. **Plotting Agent** OR **Market Intelligence Agent** → Generates the response

**The Bug**: All agents in the chain were being called with `session=session`, which meant the OpenAI Agents SDK's `SQLiteSession` was storing each user query **multiple times** (once per agent call).

## The Fix

Only the **final processing agent** should maintain conversation history. Classification/routing agents should use `session=None`.

### Files Changed:

#### 1. news_agent.py

**Line 285** (in `analyze_stream` method):
```python
# BEFORE:
classify_result = await Runner.run(self.intent_agent, query, session=session)

# AFTER:
# IMPORTANT: Don't pass session to intent classifier to avoid duplicate messages in history
classify_result = await Runner.run(self.intent_agent, query, session=None)
```

**Line 356** (in `analyze` method):
```python
# BEFORE:
classify_result = await Runner.run(self.intent_agent, query, session=session)

# AFTER:
# IMPORTANT: Don't pass session to intent classifier to avoid duplicate messages in history
classify_result = await Runner.run(self.intent_agent, query, session=None)
```

#### 2. market_intelligence_agent.py

**Lines 813-816** (in `analyze_stream` method):
```python
# BEFORE:
classification_result = await Runner.run(
    self.classification_agent,
    input=query,
    session=session,

# AFTER:
# IMPORTANT: Don't pass session to classification agent to avoid duplicate messages
classification_result = await Runner.run(
    self.classification_agent,
    input=query,
    session=None,
```

**Lines 833-835** (plotting agent call):
```python
# BEFORE:
plotting_result = await Runner.run(
    self.plotting_agent,
    input=query,
    session=session,

# AFTER:
# IMPORTANT: Don't pass session here either, as plotting agent doesn't need conversation context
plotting_result = await Runner.run(
    self.plotting_agent,
    input=query,
    session=None,
```

**Lines 728-731** (in non-streaming method):
```python
# BEFORE:
classification_result_temp = await Runner.run(
    self.classification_agent,
    input=user_query,
    session=session,

# AFTER:
# IMPORTANT: Don't pass session to classification agent to avoid duplicate messages
classification_result_temp = await Runner.run(
    self.classification_agent,
    input=user_query,
    session=None,
```

**Lines 751-754** (plotting agent in non-streaming):
```python
# BEFORE:
plotting_result_temp = await Runner.run(
    self.plotting_agent,
    input=user_query,
    session=session,

# AFTER:
# IMPORTANT: Don't pass session here either, as plotting agent doesn't need conversation context
plotting_result_temp = await Runner.run(
    self.plotting_agent,
    input=user_query,
    session=None,
```

## Other Agents

**Checked and confirmed OK**:
- ✅ **Digitalization Agent** - Only has one agent, session correctly passed
- ✅ **Leo O&M Agent** - Only has one agent, session correctly passed
- ✅ **Module Prices Agent** - Doesn't use OpenAI Agents SDK, no session management

## Testing

After applying this fix, test by:

1. Starting a fresh conversation
2. Sending 3-4 messages
3. Asking "What did I ask before?" or "How many queries have I made?"
4. Verify the agent only reports each message **once** in history

## To Apply Fix

Rebuild the Docker container to pick up the changes:

```bash
docker-compose down
docker-compose build
docker-compose up
```

Or for quick testing without rebuild (if using volume mounts):
```bash
docker-compose restart
```

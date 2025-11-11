# Code Cleanup Plan for app.py

## Issues Found

### 1. **Duplicate Imports**
- **Line 12**: `from module_prices_agent import ModulePricesAgent, ModulePricesConfig, PlotResult, DataAnalysisResult, MultiResult, PlotDataResult`
- **Line 735**: Same import repeated
- **Action**: Remove duplicate on line 735

### 2. **Commented Out Code**
- **Line 130**: `# close_pydantic_weaviate_agent()  # REMOVED - this was clearing conversation memory`
- **Action**: Remove commented line - no longer needed since old market agent is gone

### 3. **Deprecated Functions**
- **Lines 2825-2847**: Admin memory debugging endpoints marked as DEPRECATED
- **Action**: Consider removing entirely or keeping with clear deprecation notice

### 4. **Outdated Comments**
- **Line 22**: `# Disabled for production deployment` (load_dotenv)
- **Line 73**: Same comment
- **Line 165**: `# Market agent now uses market_intel with OpenAI Agents SDK`
- **Line 1309**: Same comment about market_intel
- **Action**: Update comments to reflect current architecture (market agent, not market_intel)

### 5. **Inconsistent Naming**
- Comments still reference "market_intel" but code uses "market"
- **Action**: Update all comments for consistency

### 6. **Rate Limiter Comment**
- **Line 333**: `# Initialize rate limiter - DISABLED default limits to fix 429 errors`
- **Action**: Clarify if rate limiting is actually disabled or just modified

### 7. **Old Format Handling**
- **Line 2048**: Comment about "Old format from plot explanation agent"
- **Action**: Review if this legacy code is still needed

## Cleanup Priority

### High Priority
1. ✅ Remove duplicate import (line 735)
2. ✅ Remove commented-out code (line 130)
3. ✅ Update market_intel references to market in comments
4. ✅ Clean up deprecated admin endpoints

### Medium Priority
5. Review and document rate limiter configuration
6. Clean up old format handling code if no longer needed
7. Add better documentation for memory management functions

### Low Priority
8. Add docstrings to functions missing them
9. Consolidate similar error handling blocks
10. Review and optimize database query patterns

## Specific Changes

### Change 1: Remove Duplicate Import
```python
# DELETE line 735
from module_prices_agent import ModulePricesAgent, ModulePricesConfig, PlotResult, DataAnalysisResult, MultiResult, PlotDataResult
```

### Change 2: Remove Commented Code
```python
# DELETE line 130
# close_pydantic_weaviate_agent()  # REMOVED - this was clearing conversation memory
```

### Change 3: Update Comments
```python
# Line 165: Change from
# Market agent now uses market_intel with OpenAI Agents SDK (SQLite sessions) - no in-memory state to clear

# To:
# Market agent uses OpenAI Agents SDK (SQLite sessions) - no in-memory state to clear
```

```python
# Line 1309: Same update
```

### Change 4: Remove or Document Deprecated Endpoints
Option A: Remove entirely
Option B: Add clear warning in docstring that these are deprecated and don't work

## Code Quality Improvements

### Add Type Hints
Consider adding type hints to key functions:
```python
def cleanup_memory() -> bool:
    """Perform memory cleanup operations"""

def clear_conversation_memory(conversation_id: str = None) -> bool:
    """Clear conversation memory for specific conversation"""
```

### Consolidate Error Handling
Multiple try-except blocks could be consolidated with a decorator or helper function.

### Extract Magic Numbers
- Memory thresholds (450MB, 350MB, etc.) should be constants
- Query limits should be configurable

## Testing Checklist
After cleanup:
- [ ] App starts successfully
- [ ] All agents work correctly
- [ ] Memory management still functions
- [ ] No import errors
- [ ] Admin endpoints behave as expected
- [ ] Database operations work correctly

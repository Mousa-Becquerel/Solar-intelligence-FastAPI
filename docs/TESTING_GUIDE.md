# 🧪 CSS Grid Architecture - Testing Guide

**Quick Reference:** How to test the new layout system

---

## 🎯 Quick Test Steps

### 1. Test Default State (Everything Collapsed)
1. Open the app at http://localhost:5000
2. **Expected:**
   - Sidebar: Narrow (60px) with icons only
   - Chat: Full width
   - No artifact panel visible

**✅ Pass if:** Chat takes full width, sidebar shows only icons

---

### 2. Test Sidebar Expansion
1. Click the sidebar toggle button (top-left)
2. **Expected:**
   - Sidebar: Expands to 280px with full text
   - Chat: Shrinks to accommodate sidebar
   - Transition: Smooth 0.4s animation
   - No overlap: Sidebar pushes chat, doesn't cover it

**✅ Pass if:** Smooth transition, no overlap, chat messages remain readable

---

### 3. Test Artifact Opening (Sidebar Collapsed)
1. Collapse sidebar if expanded
2. Type "Yes, contact expert" in chat OR trigger approval flow
3. **Expected:**
   - Artifact: Slides in from right (40% width)
   - Chat: Shrinks to ~60% width
   - Sidebar: Stays at 60px
   - Both visible: Chat + artifact side-by-side
   - Backdrop: None on desktop

**✅ Pass if:** Side-by-side layout, both panels scrollable independently

---

### 4. Test Both Expanded (Tightest Layout)
1. Expand sidebar (click toggle)
2. Open artifact (trigger contact form)
3. **Expected:**
   - Sidebar: 280px (left)
   - Artifact: 40% of screen (right)
   - Chat: Remaining space (middle)
   - No overlap: All three visible
   - Chat messages: Still readable (min ~600px on 1440px+ screens)

**✅ Pass if:** All three zones visible with proper spacing, no overlap

---

### 5. Test Artifact Close
1. With artifact open, click the X button
2. **Expected:**
   - Artifact: Fades out, width goes to 0
   - Chat: Expands to fill space
   - Smooth transition: 0.4s

**✅ Pass if:** Smooth close animation, chat expands properly

**Alternative close methods to test:**
- Press ESC key
- Click backdrop (on tablet/mobile only)

---

## 📱 Responsive Testing

### Desktop (>1200px)
**Test on:** 1920x1080, 1440x900, 1366x768

1. Open artifact with sidebar collapsed
2. **Expected:** Side-by-side layout, no backdrop

2. Open artifact with sidebar expanded
3. **Expected:** Three columns visible, proper spacing

**✅ Pass if:** Side-by-side works on all desktop sizes

---

### Tablet (768px - 1200px)
**Test on:** iPad, Surface, or browser resize to ~900px

1. Open artifact
2. **Expected:**
   - Artifact: Fixed overlay from right (50% width)
   - Backdrop: Dark blur overlay behind artifact
   - Chat: Stays full width (doesn't shrink)
   - Click backdrop: Closes artifact

**✅ Pass if:** Overlay mode works, backdrop closes artifact

---

### Mobile (<768px)
**Test on:** Phone or browser resize to ~400px

1. Open artifact
2. **Expected:**
   - Artifact: Full-width overlay
   - Backdrop: Dark blur
   - Chat: Hidden behind backdrop
   - Sidebar: Always collapsed (60px)

3. Try expanding sidebar
4. **Expected:**
   - Sidebar: Becomes overlay (280px)
   - Higher z-index than artifact

**✅ Pass if:** Full-width overlays work, proper stacking

---

## 🔄 State Transition Matrix

Test all state changes:

| From State | To State | Action | Expected Result |
|------------|----------|--------|-----------------|
| Default | Sidebar+ | Click toggle | Sidebar expands, chat shrinks |
| Default | Artifact+ | Open form | Artifact appears, chat shrinks |
| Sidebar+ | Default | Click toggle | Sidebar collapses, chat expands |
| Sidebar+ | Both+ | Open form | Artifact appears, all three visible |
| Artifact+ | Default | Close artifact | Artifact closes, chat expands |
| Artifact+ | Both+ | Expand sidebar | Sidebar expands, all three visible |
| Both+ | Sidebar+ | Close artifact | Artifact closes, sidebar+chat remain |
| Both+ | Artifact+ | Collapse sidebar | Sidebar collapses, chat+artifact remain |

**✅ Pass if:** All transitions smooth, no layout glitches

---

## 🐛 Common Issues to Check

### Issue 1: Elements Overlap
**Symptoms:** Sidebar covers chat, or artifact covers sidebar
**Cause:** CSS Grid not working
**Check:**
- Browser dev tools → Inspect `.main-layout`
- Should show: `display: grid`
- Grid columns should update when states change

---

### Issue 2: No Transitions
**Symptoms:** Instant snap instead of smooth animation
**Check:**
- Dev tools → `.main-layout` computed styles
- Should have: `transition: grid-template-columns 0.4s ...`

---

### Issue 3: Artifact Doesn't Open
**Symptoms:** Nothing happens when triggering contact form
**Check:**
- Console errors
- `.main-layout` data attribute: `data-artifact-open` should be "true"
- Check if `artifactPanel.js` is loaded

---

### Issue 4: Sidebar Doesn't Expand Chat
**Symptoms:** Sidebar expands but chat width doesn't change
**Check:**
- `.main-layout[data-sidebar-expanded="true"]` CSS rule applied
- `--sidebar-width` variable updated to 280px

---

## 🎨 Visual Checks

### Check 1: Spacing
- Chat messages have breathing room
- Sidebar content not cramped
- Artifact content properly padded

### Check 2: Alignment
- Headers align with their containers
- Scrollbars don't cause alignment issues
- Borders and shadows look clean

### Check 3: Typography
- Text remains readable in all states
- No text overflow
- Line lengths appropriate

---

## ⌨️ Keyboard Testing

1. **Tab navigation:**
   - Should move through: sidebar → chat input → artifact (if open)
   - No focus traps

2. **ESC key:**
   - Closes artifact if open
   - Doesn't affect sidebar

3. **Shortcuts:**
   - Ctrl/Cmd+Enter: Send message (existing)

---

## 🚨 Critical Test Scenarios

### Scenario 1: User Approval Flow
1. Start new chat
2. Ask: "I want to contact an expert"
3. Answer: "Yes"
4. **Expected:** Artifact opens with contact form
5. Fill form and submit
6. **Expected:** Success message in artifact

**✅ Pass if:** Entire flow works smoothly

---

### Scenario 2: Rapid Toggling
1. Quickly toggle sidebar open/close 5 times
2. Quickly open/close artifact 5 times
3. **Expected:** No visual glitches, animations complete properly

**✅ Pass if:** No flickering, no stuck states

---

### Scenario 3: Window Resize
1. Open artifact
2. Resize browser from 1920px → 900px → 400px
3. **Expected:**
   - 1920px: Side-by-side
   - 900px: Artifact becomes overlay
   - 400px: Artifact full-width overlay

**✅ Pass if:** Layout adapts at breakpoints without glitches

---

## 📊 Performance Checks

### Smooth Animations
- Open dev tools → Performance tab
- Record while toggling sidebar/artifact
- Check for 60fps (no janky frames)

### Memory Usage
- Open dev tools → Memory tab
- Toggle states 10+ times
- Check for memory leaks

---

## ✅ Sign-Off Checklist

Before marking as production-ready:

- [ ] All 4 layout states work
- [ ] All state transitions smooth
- [ ] Desktop side-by-side works
- [ ] Tablet overlay works
- [ ] Mobile full-width works
- [ ] Contact form flow works end-to-end
- [ ] No overlap in any state
- [ ] No console errors
- [ ] Performance is smooth (60fps)
- [ ] Works in Chrome/Edge
- [ ] Works in Firefox
- [ ] Keyboard navigation works
- [ ] ESC key closes artifact

---

## 🎬 Quick Demo Script

**For showcasing the new layout:**

1. "Let me show you our new clean architecture..."
2. [Default state] "Here's the default view - collapsed sidebar, full chat"
3. [Expand sidebar] "Sidebar expands to show full history"
4. [Collapse sidebar] "Collapses back for more chat space"
5. [Open artifact] "When you need help, artifact panel slides in"
6. [Show side-by-side] "Notice both chat and form are usable at once"
7. [Expand sidebar with artifact] "Even with both open, everything has space"
8. [Resize window] "And on smaller screens, it adapts automatically"
9. [Mobile view] "On mobile, it becomes a full overlay"
10. [Close artifact] "Close when done, everything flows smoothly"

---

## 🔗 Related Files

- [GRID_ARCHITECTURE_IMPLEMENTATION_SUMMARY.md](./GRID_ARCHITECTURE_IMPLEMENTATION_SUMMARY.md) - What was built
- [CLEAN_ARCHITECTURE_IMPLEMENTATION_PLAN.md](./CLEAN_ARCHITECTURE_IMPLEMENTATION_PLAN.md) - Original plan
- [app-layout.css](../static/css/layouts/app-layout.css) - CSS Grid code
- [artifactPanel.js](../static/js/modules/ui/artifactPanel.js) - JavaScript controller

---

**Last Updated:** October 29, 2025
**Status:** Ready for Testing

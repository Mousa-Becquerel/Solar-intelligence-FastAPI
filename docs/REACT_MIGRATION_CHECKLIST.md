# React Migration Checklist

> **Goal**: Migrate Flask frontend to React with 100% visual and UX parity - "we dont want to loose anything"

---

## Pre-Migration Setup

### Documentation Review
- [ ] Read [VISUAL_PARITY_GUIDE.md](./VISUAL_PARITY_GUIDE.md)
- [ ] Read [REACT_MIGRATION_PLAN.md](./REACT_MIGRATION_PLAN.md)
- [ ] Review [VISUAL_PARITY_IMPLEMENTATION_SUMMARY.md](./VISUAL_PARITY_IMPLEMENTATION_SUMMARY.md)

### Environment Setup
- [ ] Install Node.js 18+ and npm/pnpm
- [ ] Install Playwright for testing: `npm install -D @playwright/test`
- [ ] Install visual regression tools
- [ ] Set up screenshot comparison baseline

### Project Initialization
- [ ] Create React + TypeScript + Vite project
- [ ] Install Tailwind CSS
- [ ] Copy [tailwind.config.example.js](./react-migration/tailwind.config.example.js) to project
- [ ] Copy [theme.example.ts](./react-migration/theme.example.ts) to `src/theme/`
- [ ] Copy [visual-regression.spec.ts](./react-migration/visual-regression.spec.ts) to `tests/`
- [ ] Install dependencies (React Router, Zustand, TanStack Query, Framer Motion)

---

## Phase 1: Foundation (Week 1)

### Core Setup
- [ ] Configure Vite with proper build settings
- [ ] Set up TypeScript strict mode
- [ ] Configure ESLint and Prettier
- [ ] Set up path aliases (@components, @utils, etc.)
- [ ] Create folder structure (see REACT_MIGRATION_PLAN.md)

### Theme Configuration
- [ ] Verify all Tailwind tokens match Flask CSS variables
- [ ] Test theme.ts in a sample component
- [ ] Set up CSS reset matching Flask reset.css
- [ ] Configure font loading (Inter, Open Sans)
- [ ] Test Material Design 3 state layers

### API Client Migration
- [ ] Migrate `static/js/modules/core/api.js` to TypeScript
- [ ] Add type definitions for all API responses
- [ ] Test authentication flow (JWT tokens)
- [ ] Verify SSE streaming still works
- [ ] Test error handling

### State Management
- [ ] Set up Zustand stores for:
  - [ ] Authentication state
  - [ ] Conversation state
  - [ ] UI state (sidebar, artifact panel)
  - [ ] Agent selection state
- [ ] Add persistence with localStorage
- [ ] Test state updates and subscriptions

### Routing
- [ ] Set up React Router v6
- [ ] Define all routes matching Flask routes
- [ ] Implement protected routes
- [ ] Test navigation and redirects

### Testing Framework
- [ ] Configure Vitest for unit tests
- [ ] Configure React Testing Library
- [ ] Set up Playwright for E2E tests
- [ ] Run baseline visual regression tests on Flask
- [ ] Verify tests can capture screenshots correctly

---

## Phase 2: Core Components (Week 2)

### Layout Components

#### AppLayout (CSS Grid 3-Zone)
- [ ] Implement `.main-layout` with CSS Grid
- [ ] Add `data-sidebar-expanded` state handling
- [ ] Add `data-artifact-open` state handling
- [ ] Test transitions (0.4s cubic-bezier)
- [ ] Verify responsive breakpoints (768px, 1200px)
- [ ] **Visual regression test**: Compare with Flask
- [ ] **CSS property test**: Verify grid-template-columns values

#### Sidebar Component
- [ ] Implement sidebar panel structure
- [ ] Add expand/collapse button (40x40px, white bg, indigo color)
- [ ] Style with `#F5F5F5` background (MD3 flat gray)
- [ ] Add conversation list
- [ ] Implement hover states (8% opacity state layer)
- [ ] Add scrollbar styling (4px thin, nearly invisible)
- [ ] Test collapsed state (72px width)
- [ ] Test expanded state (280px width)
- [ ] **Visual regression test**: Compare expanded and collapsed states
- [ ] **Interaction test**: Click expand button, verify animation

#### Chat Panel
- [ ] Implement flex column structure (header + messages + input)
- [ ] Add chat header
- [ ] Add scrollable messages container
- [ ] Add fixed input footer
- [ ] Style with white background
- [ ] **Visual regression test**: Compare layout

#### Artifact Panel
- [ ] Implement artifact container
- [ ] Add gold header (`#FFB74D` background, white text)
- [ ] Add close button with MD3 state layer
- [ ] Add scrollable content area
- [ ] Test fade-in animation (opacity 0.3s ease)
- [ ] Test overlay mode at tablet breakpoint (< 1200px)
- [ ] Add backdrop blur on tablet/mobile
- [ ] **Visual regression test**: Compare open and closed states
- [ ] **Responsive test**: Verify overlay behavior at 768px

### Chat Components

#### Message Components
- [ ] Create UserMessage component
  - [ ] Background: `#FFB74D` (MD3 flat gold)
  - [ ] Text color: `#1e293b`
  - [ ] Border radius: `12px` (bottom-right: `6px`)
  - [ ] Font: `0.9375rem`, weight `400`, spacing `-0.01em`
  - [ ] Padding: `12px 16px`
  - [ ] Max width: `85%`
  - [ ] Right-aligned (margin-left: auto)
  - [ ] No shadow (MD3 flat)
  - [ ] **Visual regression test**: Compare with Flask user message
  - [ ] **CSS property test**: Verify all computed styles match

- [ ] Create BotMessage component
  - [ ] Background: `white`
  - [ ] Text color: `#1e293b`
  - [ ] Border radius: `12px` (bottom-left: `6px`)
  - [ ] Font: `0.9375rem`, weight `300`, spacing `-0.01em`
  - [ ] Padding: `12px 16px`
  - [ ] Max width: `85%`
  - [ ] Left-aligned (margin-right: auto)
  - [ ] Border: `1px solid rgba(0, 0, 0, 0.05)`
  - [ ] No shadow (MD3 flat)
  - [ ] **Visual regression test**: Compare with Flask bot message

- [ ] Implement message appear animation
  - [ ] Keyframe: `translateY(15px)` → `translateY(0)`
  - [ ] Duration: `0.4s`
  - [ ] Easing: `cubic-bezier(0.4, 0, 0.2, 1)`
  - [ ] Opacity: `0` → `1`
  - [ ] **Animation test**: Record and compare timing

#### Message List
- [ ] Create scrollable container with thin scrollbar
- [ ] Implement auto-scroll to bottom on new message
- [ ] Add welcome message component
- [ ] Test message rendering performance (100+ messages)
- [ ] **Scroll test**: Verify smooth scrolling

#### Chat Input
- [ ] Create textarea with auto-resize
- [ ] Add send button with hover state
- [ ] Style with brand colors
- [ ] Add loading state
- [ ] Test enter key to send
- [ ] Test shift+enter for newline
- [ ] **Interaction test**: Type and send message

#### Loading Spinner
- [ ] Create 4-dot spinner
- [ ] Colors: `#5C6BC0`, `#7986CB`, `#FFB74D`, `#FFA726`
- [ ] Dot size: `12px`
- [ ] Animation: `dotPulse 1.4s ease-in-out infinite`
- [ ] Stagger delays: `0s, 0.2s, 0.4s, 0.6s`
- [ ] **Animation test**: Compare animation timing

### Agent Components
- [ ] Create agent card component
- [ ] Style with MD3 design
- [ ] Add hover states
- [ ] Add badge for plan requirements
- [ ] **Visual regression test**: Compare agent cards

### Sidebar Components
- [ ] Create conversation item component
- [ ] Add new conversation button
- [ ] Add delete conversation button
- [ ] Style active conversation indicator
- [ ] **Interaction test**: Click conversation, verify active state

---

## Phase 3: Pages & Features (Week 3)

### Authentication Pages

#### Login Page
- [ ] Migrate `templates/login.html` layout
- [ ] Style gradient background exactly
- [ ] Add email and password inputs
- [ ] Add remember me checkbox
- [ ] Add submit button with loading state
- [ ] Implement form validation
- [ ] Test authentication flow
- [ ] **Visual regression test**: Full page at 3 viewports
- [ ] **Form test**: Submit with valid/invalid credentials

#### Register Page
- [ ] Migrate registration form
- [ ] Add field validation
- [ ] Test password strength indicator
- [ ] **Visual regression test**: Full page

### Main Application Pages

#### Dashboard/Chat Page
- [ ] Integrate all chat components
- [ ] Add welcome message
- [ ] Test conversation flow
- [ ] Test artifact panel integration
- [ ] **E2E test**: Complete user journey (login → chat → receive response)

#### Agents Page
- [ ] Migrate `templates/agents.html`
- [ ] Add sidebar with hired agents
- [ ] Create agent card grid
- [ ] Add hire/fire functionality
- [ ] Test responsive layout
- [ ] **Visual regression test**: Full page at all viewports

### Advanced Features

#### Artifact System
- [ ] Implement dynamic artifact rendering
- [ ] Add contact form artifact
- [ ] Add map artifact
- [ ] Add chart/graph artifacts
- [ ] Test artifact switching
- [ ] **Integration test**: Open artifact with real data

#### Conversation Management
- [ ] Create new conversation
- [ ] Load conversation history
- [ ] Delete conversations
- [ ] Search conversations
- [ ] **State test**: Verify persistence

#### Agent Selection
- [ ] Dropdown or selector component
- [ ] Show available agents based on plan
- [ ] Test agent switching mid-conversation
- [ ] **Access control test**: Verify premium agents blocked for free users

---

## Phase 4: Polish & Deploy (Week 4)

### Responsive Testing
- [ ] Test at 375px (mobile portrait)
- [ ] Test at 667px (mobile landscape)
- [ ] Test at 768px (tablet)
- [ ] Test at 1024px (desktop)
- [ ] Test at 1440px (desktop wide)
- [ ] Test at 1920px (ultra wide)
- [ ] Verify sidebar collapse behavior
- [ ] Verify artifact overlay behavior
- [ ] **Visual regression**: All pages, all viewports

### Animation & Interaction Polish
- [ ] Verify all animations run at 60fps
- [ ] Test on lower-end devices
- [ ] Add loading states to all async operations
- [ ] Add error states with recovery options
- [ ] Implement skeleton loaders
- [ ] **Performance test**: Lighthouse score > 90

### Cross-Browser Testing
- [ ] Chrome (primary browser)
- [ ] Firefox
- [ ] Safari (macOS/iOS)
- [ ] Edge
- [ ] Test font rendering consistency
- [ ] Test backdrop-filter support (Safari)
- [ ] **Compatibility test**: No visual differences

### Accessibility
- [ ] Keyboard navigation works on all interactive elements
- [ ] Focus indicators visible and styled
- [ ] ARIA labels on all controls
- [ ] Screen reader testing
- [ ] Color contrast ratios meet WCAG AA
- [ ] **a11y test**: axe-core audit passes

### Performance Optimization
- [ ] Code splitting by route
- [ ] Lazy load heavy components
- [ ] Optimize bundle size (< 500KB gzipped)
- [ ] Implement virtual scrolling for long message lists
- [ ] Add service worker for offline support (optional)
- [ ] **Bundle analysis**: No unnecessary dependencies

### Final Visual Regression
- [ ] Run full test suite on all pages
- [ ] Compare every component state
- [ ] Verify all hover states
- [ ] Check all animations
- [ ] Test responsive transitions
- [ ] **Zero differences allowed** - must achieve 100% parity

### Deployment Preparation
- [ ] Set up production build
- [ ] Configure environment variables
- [ ] Test production build locally
- [ ] Set up CI/CD pipeline
- [ ] Configure Nginx/CDN for static assets
- [ ] **Smoke test**: Production build works end-to-end

---

## Sign-Off Criteria

### Visual Parity (100% Required)
- [ ] All colors match exactly (hex codes)
- [ ] All fonts, sizes, and weights match
- [ ] All spacing values match (padding, margin, gap)
- [ ] All border radius values match
- [ ] All animations have correct timing and easing
- [ ] All hover states behave identically
- [ ] All transitions are smooth
- [ ] Material Design 3 flat design preserved (no shadows)

### Functionality Parity (100% Required)
- [ ] All user flows work identically
- [ ] Authentication works
- [ ] Chat streaming works
- [ ] Artifact panel works
- [ ] Conversation management works
- [ ] Agent selection works
- [ ] All API calls succeed

### Performance (Must Meet/Exceed Flask)
- [ ] Initial load time ≤ Flask version
- [ ] 60fps animations maintained
- [ ] Zero layout shift (CLS = 0)
- [ ] Time to interactive ≤ Flask version
- [ ] Lighthouse performance score > 90

### Testing (All Tests Pass)
- [ ] All unit tests pass (100% coverage on utils)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] All visual regression tests pass (zero differences)
- [ ] All accessibility tests pass
- [ ] All cross-browser tests pass

### Code Quality
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] All components properly typed
- [ ] Code reviewed by team
- [ ] Documentation complete

### User Acceptance
- [ ] Internal team review passed
- [ ] Beta user testing passed (if applicable)
- [ ] No visual regression reports from users
- [ ] Positive feedback on UI/UX

---

## Rollback Plan

### If Issues Found Post-Deployment
1. **Immediate**: Revert to Flask frontend via Nginx routing
2. **Document**: Log all visual differences or bugs found
3. **Fix**: Address issues in React version
4. **Retest**: Run full visual regression suite
5. **Redeploy**: Only when 100% parity restored

### Risk Mitigation
- Keep Flask frontend running in parallel during transition
- Use feature flags to toggle React frontend on/off
- Route percentage of traffic to React (10% → 50% → 100%)
- Monitor error rates and user feedback closely

---

## Success Metrics

### Primary Goal: Zero Visual Differences
Target: **100% parity** with Flask frontend
Measurement: Playwright visual regression tests pass with 0 pixel differences

### Secondary Goals:
- **Performance**: Bundle size < 500KB gzipped
- **Accessibility**: axe-core score 100/100
- **SEO**: Lighthouse SEO score > 95
- **Maintainability**: TypeScript coverage 100%

---

## Notes

- **Take your time**: Visual parity is more important than speed
- **Test frequently**: Run visual regression after each component
- **When in doubt**: Reference the Flask implementation exactly
- **Ask questions**: If something is unclear, check the Visual Parity Guide
- **No redesigns**: This is a technology upgrade, not a visual overhaul

---

## Resources

- [VISUAL_PARITY_GUIDE.md](./VISUAL_PARITY_GUIDE.md) - Complete style documentation
- [REACT_MIGRATION_PLAN.md](./REACT_MIGRATION_PLAN.md) - Full migration strategy
- [VISUAL_PARITY_IMPLEMENTATION_SUMMARY.md](./VISUAL_PARITY_IMPLEMENTATION_SUMMARY.md) - Quick reference
- [tailwind.config.example.js](./react-migration/tailwind.config.example.js) - Ready-to-use Tailwind config
- [theme.example.ts](./react-migration/theme.example.ts) - TypeScript theme object
- [visual-regression.spec.ts](./react-migration/visual-regression.spec.ts) - Automated tests

---

## Timeline

- **Week 1**: Foundation setup + Theme configuration ✓
- **Week 2**: Core components (Layout, Chat, Messages) ✓
- **Week 3**: Pages, Features, Artifact system ✓
- **Week 4**: Polish, Testing, Deployment ✓

**Total**: 3-4 weeks for complete migration with 100% visual parity

---

## Daily Workflow Recommendation

1. **Morning**: Review checklist, pick component to migrate
2. **Implementation**: Build component referencing Visual Parity Guide
3. **Testing**: Run visual regression test for that component
4. **Iteration**: Fix any differences until 100% match
5. **Commit**: Only commit when test passes
6. **Repeat**: Move to next component

---

## Final Reminder

**"We don't want to lose anything"** - This means:
- Every pixel must match
- Every color must be exact
- Every animation must feel the same
- Every interaction must behave identically

**When complete, users should not notice any difference except improved performance.**

Good luck with the migration! 🚀

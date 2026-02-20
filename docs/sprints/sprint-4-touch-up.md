# Sprint 4: Touch Up / Clean Up — The Polish Sprint

**Goal:** Visual polish, custom assets, and real-world testing. This sprint leverages the plug-and-play architecture from Sprint 3 to rapidly iterate on designs. Friends install the app and provide feedback.

**Status:** IMPLEMENTED (P0 items — 4 tasks: title bar, empty states, micro-interactions, scrollbar fix)

---

## Focus Areas

### 1. Custom SVGs & Icons
- [ ] Design custom app icon — Task #1
- [ ] Desktop shortcut icon for installer — Task #3
- [ ] Custom SVG icons for sidebar navigation items
- [ ] Custom SVG icons for task status indicators
- [ ] Custom SVG illustrations for empty states
- [ ] Loading/skeleton state SVG animations
- [ ] Tools: Superdesign MCP, svg-logo-designer skill, svg-precision skill

### 2. Custom Logo & Branding
- [ ] Design logo for in-app branding and GitHub — Task #4
- [ ] Logo variants: icon-only, wordmark, horizontal, stacked
- [ ] Sign-in screen logo (replace "C" placeholder)
- [ ] Sidebar header logo
- [ ] GitHub social preview image
- [ ] README header graphic
- [ ] About/splash screen design

### 3. Custom Components
- [ ] Refined button styles (beyond Radix defaults)
- [ ] Custom card designs per feature area
- [x] Polished form inputs with micro-interactions — DONE (Button scale/shadow, Input/Textarea focus shadow)
- [ ] Custom toast/notification designs
- [ ] Progress indicators with personality
- [ ] Refined dropdown menus and popovers
- [x] Custom scrollbar styling — DONE (theme-aware color-mix, no hardcoded colors)

### 4. Custom Layouts
- [ ] Leverage Sprint 3 compositional system for layout experiments
- [ ] Try different sidebar configurations (collapsible, mini, overlay)
- [ ] Experiment with dashboard grid layouts
- [x] Custom title bar — DONE (frameless window + TitleBar.tsx + window IPC domain)
- [ ] Window chrome that matches the theme system
- [ ] Explore: tabbed vs. single-page navigation styles

### 5. Beta Testing
- [ ] Package the app for Windows installer (electron-builder)
- [ ] Package for macOS DMG (if applicable)
- [ ] Create a "beta tester" setup guide
- [ ] Set up feedback collection method (GitHub Issues? In-app form?)
- [ ] Recruit 3-5 friends to install and test
- [ ] Collect and triage feedback
- [ ] Prioritize UX pain points from real usage

### 6. Throw Stuff at the Wall
- [ ] Try alternative color themes based on tester feedback
- [ ] Experiment with animation/motion (framer-motion or CSS transitions)
- [ ] Try different typography scales
- [ ] Experiment with information density (compact vs. comfortable)
- [ ] A/B test layout variations with testers

---

## Success Criteria

> The app looks and feels like a polished product, not a developer prototype. Beta testers can install, use, and provide feedback without the developer (me) sitting next to them.

---

## Dependencies

- Sprint 3 complete (compositional components = fast iteration)
- Design tools set up: Superdesign MCP, SVG skills, optionally Figma — Task #6
- Packaged builds working (electron-builder)

---

## Tooling

| Tool | Purpose |
|------|---------|
| Superdesign MCP | Generate logo/icon concepts |
| svg-logo-designer skill | Professional SVG logo variations |
| svg-precision skill | Pixel-perfect SVG icons |
| Figma (if set up) | Polish and iterate on designs |
| electron-builder | Package for distribution |

---

## Notes

_This is the most iterative sprint — expect lots of "try it, look at it, tweak it" cycles. The compositional architecture from Sprint 3 makes this fast instead of painful._

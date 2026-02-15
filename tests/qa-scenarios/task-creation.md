# QA Scenario: Task Creation Flow

## Objective

Verify that users can create tasks through the kanban board UI with proper validation, feedback, and error handling.

## Preconditions

- Application is running (`npm run dev`)
- MCP Electron server is accessible (port 9222)
- At least one project exists in the project list
- User is on the kanban board view (or can navigate to it)

## Setup Steps

1. Use `get_electron_window_info` to verify app is running
2. Take baseline screenshot
3. If not on kanban board, navigate there via sidebar

---

## Test Case 1: Happy Path — Create Task with All Fields

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Navigate to kanban board | `click_by_text` "Tasks" or sidebar navigation | Kanban board visible with columns |
| 2 | Screenshot baseline | `take_screenshot` | Board shows existing tasks or empty state |
| 3 | Click "New Task" button | `click_by_text` "New Task" or `click_by_selector` with button selector | Task creation modal/form opens |
| 4 | Screenshot modal | `take_screenshot` | Modal visible with empty form fields |
| 5 | Enter title | `fill_input` with placeholder or selector, value: "QA Test Task" | Title field populated |
| 6 | Enter description | `fill_input` value: "Created by QA agent for testing" | Description field populated |
| 7 | Screenshot filled form | `take_screenshot` | All fields show entered values |
| 8 | Submit form | `click_by_text` "Create" or submit button | Form submits |
| 9 | Wait for UI update | Brief pause | Modal closes, board updates |
| 10 | Screenshot result | `take_screenshot` | New task card visible in backlog/first column |
| 11 | Check console logs | `read_electron_logs` | No errors related to task creation |

### Expected Outcomes

- Task card appears in the appropriate column (likely "Backlog" or "Queue")
- Card displays the title "QA Test Task"
- Modal/form closes after successful creation
- No console errors
- Optional: Toast notification confirms creation

---

## Test Case 2: Validation — Empty Title

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Open task creation modal | `click_by_text` "New Task" | Modal opens |
| 2 | Leave title field empty | Do not fill title | Title field is empty |
| 3 | Optionally fill description | `fill_input` value: "Description without title" | Description filled |
| 4 | Screenshot form state | `take_screenshot` | Form shows empty title |
| 5 | Click submit | `click_by_text` "Create" | Submit attempted |
| 6 | Screenshot validation | `take_screenshot` | Validation error visible |
| 7 | Verify form state | `verify_form_state` | Form still open, not submitted |

### Expected Outcomes

- Form does NOT submit
- Validation error message appears near title field
- Error message is clear: "Title is required" or similar
- Modal/form remains open for correction
- No task created in the board

---

## Test Case 3: Edge Case — Very Long Title

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Open task creation modal | `click_by_text` "New Task" | Modal opens |
| 2 | Enter 500-character title | `fill_input` with long string | Title field accepts or truncates |
| 3 | Screenshot filled form | `take_screenshot` | Title field shows input |
| 4 | Submit form | `click_by_text` "Create" | Form submits |
| 5 | Screenshot result | `take_screenshot` | Task card visible |
| 6 | Verify card display | Visual inspection | Title truncated gracefully, no overflow |

### Test Data

```
Title (500 chars): Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Additional text to reach five hundred total characters here.
```

### Expected Outcomes

- Either: Task created with full title (if no limit)
- Or: Task created with truncated title + warning shown
- Or: Validation error with character limit message
- Card on board does not break layout with long title

---

## Test Case 4: Edge Case — Special Characters (XSS Prevention)

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Open task creation modal | `click_by_text` "New Task" | Modal opens |
| 2 | Enter XSS payload as title | `fill_input` value: see below | Title field accepts input |
| 3 | Submit form | `click_by_text` "Create" | Form submits |
| 4 | Screenshot result | `take_screenshot` | Task card visible |
| 5 | Check console logs | `read_electron_logs` | No script execution errors |

### Test Data

```
Title: <script>alert('xss')</script>
Description: <img src=x onerror="alert('xss')">
```

### Expected Outcomes

- Title displayed as literal text, NOT executed as HTML/script
- No JavaScript alerts or errors
- Task card shows escaped/sanitized content
- This is a **SECURITY** test — failure is **CRITICAL**

---

## Test Case 5: Edge Case — SQL Injection Payload

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Open task creation modal | `click_by_text` "New Task" | Modal opens |
| 2 | Enter SQL payload as title | `fill_input` value: see below | Title field accepts input |
| 3 | Submit form | `click_by_text` "Create" | Form submits normally |
| 4 | Verify task created | Visual inspection + screenshot | Task visible with literal payload |

### Test Data

```
Title: '; DROP TABLE tasks;--
Description: Robert'); DROP TABLE Students;--
```

### Expected Outcomes

- Task created with literal SQL as title
- No database errors
- No data corruption
- Note: This app uses file-based storage, but test anyway for defense-in-depth

---

## Test Case 6: Edge Case — Emoji and Unicode

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Open task creation modal | `click_by_text` "New Task" | Modal opens |
| 2 | Enter emoji title | `fill_input` value: see below | Title field accepts emoji |
| 3 | Submit form | `click_by_text` "Create" | Form submits |
| 4 | Screenshot result | `take_screenshot` | Task card shows emoji correctly |

### Test Data

```
Title: Task with emoji 🚀🎉✨
Description: International: cafe, resume, uber
```

### Expected Outcomes

- Emoji render correctly in form and on card
- No encoding issues or replacement characters
- Unicode characters display properly

---

## Test Case 7: Interaction — Rapid Task Creation

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Create task 1 | Full creation flow | Task 1 appears |
| 2 | Immediately create task 2 | Full creation flow | Task 2 appears |
| 3 | Immediately create task 3 | Full creation flow | Task 3 appears |
| 4 | Immediately create task 4 | Full creation flow | Task 4 appears |
| 5 | Immediately create task 5 | Full creation flow | Task 5 appears |
| 6 | Screenshot final state | `take_screenshot` | All 5 tasks visible |
| 7 | Check console logs | `read_electron_logs` | No race condition errors |

### Test Data

```
Task 1: Rapid Task Alpha
Task 2: Rapid Task Beta
Task 3: Rapid Task Gamma
Task 4: Rapid Task Delta
Task 5: Rapid Task Epsilon
```

### Expected Outcomes

- All 5 tasks created successfully
- No duplicate tasks
- No missing tasks
- No console errors about race conditions or duplicate IDs
- Tasks appear in correct order (most recent first or last, depending on UI)

---

## Test Case 8: Accessibility — Keyboard-Only Creation

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Focus New Task button | `send_keyboard_shortcut` Tab until focused | Button receives focus |
| 2 | Activate button | `send_keyboard_shortcut` Enter | Modal opens |
| 3 | Tab to title field | `send_keyboard_shortcut` Tab | Title field focused |
| 4 | Enter title | `fill_input` or `eval` with keyboard input | Title entered |
| 5 | Tab to description | `send_keyboard_shortcut` Tab | Description field focused |
| 6 | Enter description | `fill_input` | Description entered |
| 7 | Tab to submit button | `send_keyboard_shortcut` Tab | Submit button focused |
| 8 | Submit with Enter | `send_keyboard_shortcut` Enter | Form submits |
| 9 | Screenshot result | `take_screenshot` | Task created |

### Expected Outcomes

- Entire flow completable without mouse
- Focus indicators visible throughout
- Tab order is logical (title -> description -> submit)
- Enter key triggers submit button
- Escape key closes modal (test separately)

---

## Test Case 9: Cancellation — Close Modal Without Saving

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Open task creation modal | `click_by_text` "New Task" | Modal opens |
| 2 | Enter title | `fill_input` value: "Task to be cancelled" | Title filled |
| 3 | Screenshot partial form | `take_screenshot` | Form has unsaved data |
| 4 | Press Escape or click close | `send_keyboard_shortcut` Escape or click X | Modal closes |
| 5 | Screenshot board | `take_screenshot` | Board unchanged |
| 6 | Verify no task created | Visual inspection | "Task to be cancelled" not in board |

### Expected Outcomes

- Modal closes without creating task
- No partial/incomplete task in the board
- Form data is NOT persisted
- Optional: Confirmation dialog if data entered (depends on UX design)

---

## Cleanup Steps

After completing all test cases:

1. Note any tasks created during testing that should be removed
2. Document cleanup procedure if needed
3. Take final screenshot of board state

---

## Accessibility Checklist

- [ ] All form inputs have visible labels or aria-labels
- [ ] Focus indicators are visible on all interactive elements
- [ ] Error messages are programmatically associated with inputs
- [ ] Modal can be closed with Escape key
- [ ] Submit button is keyboard accessible
- [ ] Color is not the only indicator of required fields
- [ ] Error messages use appropriate contrast

---

## Console Log Patterns to Watch For

**Errors** (test fails if present):
- `TypeError: Cannot read property`
- `Unhandled promise rejection`
- `Failed to create task`
- `Network error`

**Warnings** (note but may not fail):
- `React key warning`
- `Deprecation warning`
- `Missing prop type`

# QA Scenario: Project Management Flow

## Objective

Verify that users can add, remove, and switch between projects with proper validation, confirmation dialogs, and state management.

## Preconditions

- Application is running (`npm run dev`)
- MCP Electron server is accessible (port 9222)
- User has access to a valid directory on disk (for adding projects)
- Application may or may not have existing projects

## Setup Steps

1. Use `get_electron_window_info` to verify app is running
2. Take baseline screenshot of sidebar/project list
3. Note current project count (may be 0)
4. Read console logs for baseline state

---

## Test Case 1: Happy Path — Add New Project

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Navigate to projects view | `click_by_text` "Projects" or sidebar | Projects list visible |
| 2 | Screenshot baseline | `take_screenshot` | Current project list shown |
| 3 | Click "Add Project" button | `click_by_text` "Add Project" or equivalent | Directory picker dialog or action triggered |
| 4 | Wait for dialog | Brief pause | System dialog or project form appears |
| 5 | Screenshot dialog state | `take_screenshot` | Dialog visible |
| 6 | Select/confirm directory | May need to use native dialog or test folder | Directory selected |
| 7 | Wait for project add | Brief pause | Project being added |
| 8 | Screenshot result | `take_screenshot` | New project appears in list |
| 9 | Check console logs | `read_electron_logs` | No errors |

### Expected Outcomes

- New project appears in the project list/sidebar
- Project name derived from directory name
- Project becomes selectable
- No console errors

### Notes

- Directory selection may use native OS dialog which MCP cannot control
- If blocked by dialog, mark as BLOCKED with explanation
- Test may need a pre-existing test directory path

---

## Test Case 2: Happy Path — Switch Between Projects

### Preconditions for this test

- At least two projects exist in the application

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Screenshot initial project | `take_screenshot` | Current project visible |
| 2 | Note current project name | Visual inspection | Record project A name |
| 3 | Get page structure | `get_page_structure` | Identify project switch UI |
| 4 | Click different project | `click_by_text` or `click_by_selector` | Different project clicked |
| 5 | Wait for switch | Brief pause | Project switching |
| 6 | Screenshot after switch | `take_screenshot` | New project loaded |
| 7 | Verify context changed | Visual inspection | Tasks/board show different data |
| 8 | Check console logs | `read_electron_logs` | No errors during switch |

### Expected Outcomes

- UI updates to show new project's data
- Sidebar/header shows new project name
- Tasks displayed are for the new project
- Previous project's tasks are NOT shown
- No "flash" of wrong data during transition

---

## Test Case 3: Remove Project

### Preconditions

- At least one project exists (ideally a test project)

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Screenshot project list | `take_screenshot` | Current projects visible |
| 2 | Count projects | Visual inspection | Record count N |
| 3 | Locate remove button | `get_page_structure` | Find remove/delete button |
| 4 | Click remove on project | `click_by_selector` or `click_by_text` | Remove action initiated |
| 5 | Screenshot confirmation | `take_screenshot` | Confirmation dialog appears (if any) |
| 6 | Confirm removal | `click_by_text` "Confirm" or "Remove" | Removal confirmed |
| 7 | Wait for update | Brief pause | UI updates |
| 8 | Screenshot result | `take_screenshot` | Project removed from list |
| 9 | Verify count | Visual inspection | Count is now N-1 |
| 10 | Check console logs | `read_electron_logs` | No errors |

### Expected Outcomes

- Confirmation dialog appears before removal (safety)
- Project is removed from the list
- If removed project was active, UI switches to another project or empty state
- No orphaned data or errors
- File system project directory is NOT deleted (only reference removed)

---

## Test Case 4: Edge Case — Add Duplicate Project Path

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Add project at path X | Follow add project flow | Project added |
| 2 | Attempt to add same path X again | Follow add project flow | Error or prevention |
| 3 | Screenshot result | `take_screenshot` | Error message or graceful handling |

### Expected Outcomes

- Either: Error message "Project already exists"
- Or: Graceful handling that focuses existing project
- NOT: Duplicate project entries in list

---

## Test Case 5: Edge Case — Add Invalid/Non-Existent Path

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Attempt to add non-existent path | If path input available | Error shown |
| 2 | Screenshot error | `take_screenshot` | Error visible |

### Expected Outcomes

- Error message indicates invalid path
- No crash or unhandled exception
- User can retry with valid path

### Notes

- If only directory picker is available (no manual path entry), this test may be BLOCKED
- Mark as N/A if not applicable to UI design

---

## Test Case 6: Edge Case — Remove Last Project (Empty State)

### Preconditions

- Exactly one project exists

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Screenshot single project | `take_screenshot` | One project visible |
| 2 | Remove the project | Follow remove flow | Project removed |
| 3 | Screenshot empty state | `take_screenshot` | Empty state shown |
| 4 | Verify empty state UI | Visual inspection | Helpful empty state message |

### Expected Outcomes

- Empty state is displayed (not blank screen)
- "Add your first project" or similar prompt
- No console errors
- App remains usable, can add new project

---

## Test Case 7: Edge Case — Project Path with Special Characters

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Prepare directory with special chars | Path like: `/projects/test & demo` | Directory exists |
| 2 | Add project with that path | Follow add project flow | Project added |
| 3 | Screenshot result | `take_screenshot` | Project name shown correctly |

### Test Data

Paths to test (if possible):
- `/path/with spaces/project`
- `/path/with&ampersand/project`
- `/path/with'apostrophe/project`
- `/path/with"quotes/project`

### Expected Outcomes

- Project added successfully
- Project name displays special characters correctly
- No encoding issues in sidebar

---

## Test Case 8: Edge Case — Rapid Project Switching

### Preconditions

- At least 3 projects exist

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Click project A | `click_by_text` | Switch starts |
| 2 | Immediately click project B | `click_by_text` | Second switch |
| 3 | Immediately click project C | `click_by_text` | Third switch |
| 4 | Wait for settle | Brief pause | UI stabilizes |
| 5 | Screenshot final state | `take_screenshot` | Project C is active |
| 6 | Check console logs | `read_electron_logs` | No race condition errors |

### Expected Outcomes

- Final active project is the last one clicked (C)
- No visual glitches during rapid switching
- No "stuck" loading states
- No console errors about cancelled requests or race conditions

---

## Test Case 9: State Persistence — Project Selection After Restart

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Select specific project | Click project | Project becomes active |
| 2 | Screenshot active project | `take_screenshot` | Project X is selected |
| 3 | Note the project name | Visual inspection | Record name |
| 4 | Close and reopen app | Cannot control via MCP | Manual step required |
| 5 | After restart, screenshot | `take_screenshot` | Check which project is active |

### Expected Outcomes

- After restart, the previously selected project is still active
- Or: A sensible default is selected (first project, most recent)
- NOT: No project selected, broken state

### Notes

- This test requires manual app restart
- Mark with NOTE about manual step required

---

## Test Case 10: Accessibility — Keyboard Navigation

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Focus projects list | Tab navigation | Focus enters project list |
| 2 | Navigate between projects | Arrow keys or Tab | Can move between items |
| 3 | Select project | Enter key | Project becomes active |
| 4 | Access remove action | Keyboard | Can reach remove button |
| 5 | Screenshot focus states | `take_screenshot` | Focus indicators visible |

### Expected Outcomes

- All project items are focusable
- Focus indicators are visible
- Projects can be selected with Enter/Space
- Remove action accessible via keyboard

---

## Test Case 11: Remove Confirmation — Cancel Action

### Steps

| # | Action | Method | Expected Result |
|---|--------|--------|-----------------|
| 1 | Initiate remove project | Click remove button | Confirmation appears |
| 2 | Screenshot confirmation | `take_screenshot` | Dialog visible |
| 3 | Click Cancel or press Escape | `click_by_text` "Cancel" or `send_keyboard_shortcut` Escape | Dialog closes |
| 4 | Screenshot result | `take_screenshot` | Project still exists |

### Expected Outcomes

- Confirmation dialog can be cancelled
- Project is NOT removed when cancelled
- Escape key closes confirmation
- Focus returns to appropriate element

---

## Cleanup Steps

After completing all test cases:

1. Remove any test projects created during testing
2. Restore original project state if possible
3. Take final screenshot of app state
4. Document any lingering test data

---

## Accessibility Checklist

- [ ] Project list items are focusable
- [ ] Focus indicators visible on all items
- [ ] Remove buttons have accessible names (aria-label)
- [ ] Confirmation dialogs are modal and trap focus
- [ ] Screen reader announces project changes
- [ ] Keyboard navigation follows expected patterns

---

## Console Log Patterns to Watch For

**Errors** (test fails if present):
- `ENOENT: no such file or directory`
- `Failed to load project`
- `Cannot read property 'id' of undefined`
- `Project not found`

**Warnings** (note but may not fail):
- `Deprecation warning`
- `Missing directory`

---

## State Verification Points

After each operation, verify these invariants:

1. **Sidebar consistency** — Sidebar project list matches internal state
2. **Active project indicator** — Currently active project is visually indicated
3. **Task context** — Tasks shown are for the active project only
4. **No orphaned references** — Removed projects don't leave dangling references

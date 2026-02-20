/**
 * Notes page E2E tests.
 *
 * Verifies the notes split panel layout, new note creation,
 * note selection, note editing, and no unexpected console errors.
 */

import { expect, test } from './electron.setup';
import { assertNoConsoleErrors, createConsoleCollector } from './helpers/console-collector';
import { navigateToSidebarItem, waitForRoute } from './helpers/navigation';
import { waitForPageContent } from './helpers/page-helpers';

import type { ConsoleCollector } from './helpers/console-collector';

test.describe('Notes Page', () => {
  let collector: ConsoleCollector;

  test.beforeEach(async ({ authenticatedWindow }) => {
    collector = createConsoleCollector(authenticatedWindow);
    await navigateToSidebarItem(authenticatedWindow, 'Notes');
    await waitForRoute(authenticatedWindow, '/notes');
    await waitForPageContent(authenticatedWindow);
  });

  test('notes page loads', async ({ authenticatedWindow }) => {
    // Verify we navigated to the notes route
    await expect(authenticatedWindow).toHaveURL(/\/notes/);

    // Page should not be blank
    const bodyText = await authenticatedWindow.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test('split panel layout with list and editor area', async ({ authenticatedWindow }) => {
    // The notes page uses a flex split: left panel (w-72 with border-r) + right panel (flex-1)
    // Left panel contains the NotesList with a search input
    const searchInput = authenticatedWindow.getByPlaceholder('Search notes...');
    await expect(searchInput).toBeVisible();

    // The right panel shows either a selected note editor or the empty state message
    // "Select a note or create a new one"
    const emptyEditorText = authenticatedWindow.getByText('Select a note or create a new one');
    const editorTitle = authenticatedWindow.getByPlaceholder('Note title...');

    const hasEmptyEditor = await emptyEditorText.isVisible().catch(() => false);
    const hasEditor = await editorTitle.isVisible().catch(() => false);

    // One of these should be visible (either empty state or active editor)
    expect(hasEmptyEditor || hasEditor).toBe(true);
  });

  test('new note button is present and clickable', async ({ authenticatedWindow }) => {
    // The NotesList has a "New Note" button
    const newNoteButton = authenticatedWindow.getByRole('button', { name: /New Note/i });
    await expect(newNoteButton).toBeVisible();
    await expect(newNoteButton).toBeEnabled();

    // Click to create a new note
    await newNoteButton.click();

    // After creation, the editor should appear with the title input
    // (the mutation creates "Untitled Note" and selects it)
    await expect(
      authenticatedWindow.getByPlaceholder('Note title...'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('note selection populates editor', async ({ authenticatedWindow }) => {
    // First, ensure at least one note exists by creating one
    const newNoteButton = authenticatedWindow.getByRole('button', { name: /New Note/i });
    await newNoteButton.click();

    // Wait for editor to appear
    await expect(
      authenticatedWindow.getByPlaceholder('Note title...'),
    ).toBeVisible({ timeout: 10_000 });

    // The editor should now have the title input, tags input, and content textarea
    await expect(authenticatedWindow.getByPlaceholder('Note title...')).toBeVisible();
    await expect(authenticatedWindow.getByPlaceholder('Tags (comma separated)...')).toBeVisible();
    await expect(authenticatedWindow.getByPlaceholder('Write your note...')).toBeVisible();

    // The toolbar buttons should be visible (pin, save, delete, close)
    await expect(
      authenticatedWindow.getByRole('button', { name: /pin note/i }),
    ).toBeVisible();
    await expect(
      authenticatedWindow.getByRole('button', { name: /save note/i }),
    ).toBeVisible();
  });

  test('note editor accepts text input', async ({ authenticatedWindow }) => {
    // Create a new note to get the editor visible
    const newNoteButton = authenticatedWindow.getByRole('button', { name: /New Note/i });
    await newNoteButton.click();

    // Wait for editor
    const titleInput = authenticatedWindow.getByPlaceholder('Note title...');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });

    // Clear and type a new title
    await titleInput.fill('E2E Test Note');
    const titleValue = await titleInput.inputValue();
    expect(titleValue).toBe('E2E Test Note');

    // Type into the content area
    const contentArea = authenticatedWindow.getByPlaceholder('Write your note...');
    await contentArea.fill('This is test content from E2E.');
    const contentValue = await contentArea.inputValue();
    expect(contentValue).toBe('This is test content from E2E.');

    // After making changes, the save button should be enabled (hasChanges = true)
    const saveButton = authenticatedWindow.getByRole('button', { name: /save note/i });
    await expect(saveButton).toBeEnabled();
  });

  test('no unexpected console errors', async () => {
    assertNoConsoleErrors(collector);
  });
});

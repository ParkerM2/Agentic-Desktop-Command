import { useEffect } from 'react';

import { useTestSuiteStore } from '../test-suite-store';

export function useTestSuiteShortcuts() {
  const setActiveTab = useTestSuiteStore((s) => s.setActiveTab);
  const setShortcutHelpOpen = useTestSuiteStore((s) => s.setShortcutHelpOpen);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutHelpOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        setShortcutHelpOpen(false);
        return;
      }

      if (e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setActiveTab('recording');
            break;
          case '2':
            e.preventDefault();
            setActiveTab('library');
            break;
          case '3':
            e.preventDefault();
            setActiveTab('results');
            break;
          case '4':
            e.preventDefault();
            setActiveTab('screenshots');
            break;
          case '5':
            e.preventDefault();
            setActiveTab('analytics');
            break;
          case '6':
            e.preventDefault();
            setActiveTab('export');
            break;
          case 's':
            e.preventDefault();
            setActiveTab('library');
            setTimeout(() => {
              const searchInput = document.querySelector<HTMLInputElement>(
                '[data-testid="test-suite-search"]',
              );
              searchInput?.focus();
            }, 50);
            break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, setShortcutHelpOpen]);
}

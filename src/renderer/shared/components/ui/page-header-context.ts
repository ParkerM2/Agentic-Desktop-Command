/**
 * PageHeader context — separated to avoid react-refresh/only-export-components warning.
 */

import { createContext, useContext } from 'react';

interface PageHeaderContextValue {
  /** Whether sub-components are being rendered inside PageHeader */
  isComposed: boolean;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  isComposed: false,
});

function usePageHeader() {
  return useContext(PageHeaderContext);
}

export { PageHeaderContext, usePageHeader };
export type { PageHeaderContextValue };

/**
 * token-sections — Section definitions grouping tokens by semantic purpose
 */

interface TokenEntry {
  key: string;
  label: string;
}

export const TOKEN_SECTIONS: Array<{ title: string; tokens: TokenEntry[] }> = [
  {
    title: 'Base',
    tokens: [
      { key: 'background', label: 'Background' },
      { key: 'foreground', label: 'Foreground' },
    ],
  },
  {
    title: 'Card & Surface',
    tokens: [
      { key: 'card', label: 'Card' },
      { key: 'card-foreground', label: 'Card Foreground' },
      { key: 'popover', label: 'Popover' },
      { key: 'popover-foreground', label: 'Popover Foreground' },
    ],
  },
  {
    title: 'Brand',
    tokens: [
      { key: 'primary', label: 'Primary' },
      { key: 'primary-foreground', label: 'Primary Foreground' },
      { key: 'secondary', label: 'Secondary' },
      { key: 'secondary-foreground', label: 'Secondary Foreground' },
    ],
  },
  {
    title: 'Semantic',
    tokens: [
      { key: 'destructive', label: 'Destructive' },
      { key: 'destructive-foreground', label: 'Destructive Foreground' },
      { key: 'success', label: 'Success' },
      { key: 'success-foreground', label: 'Success Foreground' },
      { key: 'warning', label: 'Warning' },
      { key: 'warning-foreground', label: 'Warning Foreground' },
      { key: 'info', label: 'Info' },
      { key: 'info-foreground', label: 'Info Foreground' },
      { key: 'error', label: 'Error' },
    ],
  },
  {
    title: 'Controls',
    tokens: [
      { key: 'border', label: 'Border' },
      { key: 'input', label: 'Input' },
      { key: 'ring', label: 'Ring' },
      { key: 'muted', label: 'Muted' },
      { key: 'muted-foreground', label: 'Muted Foreground' },
      { key: 'accent', label: 'Accent' },
      { key: 'accent-foreground', label: 'Accent Foreground' },
    ],
  },
  {
    title: 'Sidebar',
    tokens: [
      { key: 'sidebar', label: 'Sidebar' },
      { key: 'sidebar-foreground', label: 'Sidebar Foreground' },
    ],
  },
  {
    title: 'Utility',
    tokens: [
      { key: 'error-light', label: 'Error Light' },
      { key: 'success-light', label: 'Success Light' },
      { key: 'warning-light', label: 'Warning Light' },
      { key: 'info-light', label: 'Info Light' },
      { key: 'shadow-focus', label: 'Shadow Focus' },
    ],
  },
];

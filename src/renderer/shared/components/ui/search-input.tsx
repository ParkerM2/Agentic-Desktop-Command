import { Search, X } from 'lucide-react';

import { cn } from '@renderer/shared/lib/utils';

import { Button } from './button';
import { Input } from './input';

import type { InputProps } from './input';

// ─── Component (React 19 — no forwardRef) ───────────────

interface SearchInputProps extends Omit<InputProps, 'type'> {
  /** Called when the clear button is clicked */
  onClear?: () => void;
  /** Whether to show the clear button (shown when value is non-empty) */
  showClear?: boolean;
}

function SearchInput({ className, value, onClear, showClear, size, ...props }: SearchInputProps) {
  const hasValue = showClear ?? Boolean(value);

  return (
    <div className="relative" data-slot="search-input">
      <Search
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground',
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
        )}
      />
      <Input
        className={cn(size === 'sm' ? 'pl-8' : 'pl-9', hasValue ? 'pr-8' : '', className)}
        size={size}
        type="search"
        value={value}
        {...props}
      />
      {hasValue && onClear !== undefined ? (
        <Button
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          size="icon-xs"
          variant="ghost"
          onClick={onClear}
        >
          <X aria-hidden="true" className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
        </Button>
      ) : null}
    </div>
  );
}

export { SearchInput };
export type { SearchInputProps };

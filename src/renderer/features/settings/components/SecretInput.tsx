/**
 * SecretInput — Password-style input with visibility toggle for sensitive values.
 */

import { Eye, EyeOff } from 'lucide-react';

import { INPUT_CLASS } from './webhook-constants';

interface SecretInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onChange: (value: string) => void;
}

export function SecretInput({
  id,
  label,
  placeholder,
  value,
  isVisible,
  onToggleVisibility,
  onChange,
}: SecretInputProps) {
  return (
    <div>
      <label className="text-foreground mb-1.5 block text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          className={INPUT_CLASS}
          id={id}
          placeholder={placeholder}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
        <button
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1"
          type="button"
          onClick={onToggleVisibility}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

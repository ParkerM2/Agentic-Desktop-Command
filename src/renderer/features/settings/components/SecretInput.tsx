/**
 * SecretInput — Password-style input with visibility toggle for sensitive values.
 */

import { Eye, EyeOff } from 'lucide-react';

import { Button, Input, Label } from '@ui';

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
      <Label className="mb-1.5 block" htmlFor={id}>
        {label}
      </Label>
      <div className="relative">
        <Input
          className="pr-10"
          id={id}
          placeholder={placeholder}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
        <Button
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute top-1/2 right-2 -translate-y-1/2"
          size="icon"
          variant="ghost"
          onClick={onToggleVisibility}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

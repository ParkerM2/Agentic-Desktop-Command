import { useId } from 'react';

import { cn } from '@renderer/shared/lib/utils';

import { Checkbox } from './checkbox';
import { Input } from './input';
import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Switch } from './switch';
import { Textarea } from './textarea';

import type { LabelProps } from './label';
import type { AnyFieldApi } from '@tanstack/react-form';

// ─── Re-export useForm for convenience ───────────────────

export { useForm } from '@tanstack/react-form';

// ─── Form (wrapper around <form>) ───────────────────────

interface FormProps extends React.ComponentProps<'form'> {
  /** Call form.handleSubmit() inside this handler */
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
}

function Form({ className, onSubmit, ...props }: FormProps) {
  return (
    <form
      className={cn('space-y-6', className)}
      data-slot="form"
      onSubmit={onSubmit}
      {...props}
    />
  );
}

// ─── Helpers ────────────────────────────────────────────

function getLabelVariant(
  error: string | undefined,
  required: boolean,
): LabelProps['variant'] {
  if (error) return 'error';
  if (required) return 'required';
  return 'default';
}

function getFieldError(field: AnyFieldApi): string | undefined {
  if (!field.state.meta.isTouched) return;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- AnyFieldApi errors are typed as any[]
  const firstError = field.state.meta.errors[0];
  if (firstError === undefined || firstError === null) return;
  if (typeof firstError === 'string') return firstError;
  if (typeof firstError === 'object' && 'message' in firstError) {
    return (firstError as { message: string }).message;
  }
  return String(firstError);
}

// ─── FormField (layout wrapper: label + children + description + error) ───

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
  description?: string;
  error?: string;
  htmlFor?: string;
  label: string;
  required?: boolean;
}

function FormField({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
  required = false,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)} data-slot="form-field">
      <Label
        htmlFor={htmlFor}
        variant={getLabelVariant(error, required)}
      >
        {label}
      </Label>
      {children}
      {description && !error ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

// ─── FormInput ──────────────────────────────────────────

interface FormInputProps {
  className?: string;
  description?: string;
  disabled?: boolean;
  field: AnyFieldApi;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: React.ComponentProps<'input'>['type'];
}

function FormInput({
  className,
  description,
  disabled,
  field,
  label,
  placeholder,
  required = false,
  type,
}: FormInputProps) {
  const autoId = useId();
  const fieldId = `${autoId}-${String(field.name)}`;
  const error = getFieldError(field);

  return (
    <FormField
      className={className}
      description={description}
      error={error}
      htmlFor={fieldId}
      label={label}
      required={required}
    >
      <Input
        disabled={disabled}
        id={fieldId}
        name={String(field.name)}
        placeholder={placeholder}
        type={type}
        value={field.state.value as string}
        variant={error ? 'error' : 'default'}
        onBlur={field.handleBlur}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          field.handleChange(e.target.value);
        }}
      />
    </FormField>
  );
}

// ─── FormTextarea ───────────────────────────────────────

interface FormTextareaProps {
  className?: string;
  description?: string;
  disabled?: boolean;
  field: AnyFieldApi;
  label: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

function FormTextarea({
  className,
  description,
  disabled,
  field,
  label,
  placeholder,
  required = false,
  rows,
}: FormTextareaProps) {
  const autoId = useId();
  const fieldId = `${autoId}-${String(field.name)}`;
  const error = getFieldError(field);

  return (
    <FormField
      className={className}
      description={description}
      error={error}
      htmlFor={fieldId}
      label={label}
      required={required}
    >
      <Textarea
        disabled={disabled}
        id={fieldId}
        name={String(field.name)}
        placeholder={placeholder}
        rows={rows}
        value={field.state.value as string}
        variant={error ? 'error' : 'default'}
        onBlur={field.handleBlur}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          field.handleChange(e.target.value);
        }}
      />
    </FormField>
  );
}

// ─── FormSelect ─────────────────────────────────────────

interface FormSelectOption {
  label: string;
  value: string;
}

interface FormSelectProps {
  className?: string;
  description?: string;
  disabled?: boolean;
  field: AnyFieldApi;
  label: string;
  options: FormSelectOption[];
  placeholder?: string;
  required?: boolean;
}

function FormSelect({
  className,
  description,
  disabled,
  field,
  label,
  options,
  placeholder,
  required = false,
}: FormSelectProps) {
  const autoId = useId();
  const fieldId = `${autoId}-${String(field.name)}`;
  const error = getFieldError(field);

  return (
    <FormField
      className={className}
      description={description}
      error={error}
      htmlFor={fieldId}
      label={label}
      required={required}
    >
      <Select
        disabled={disabled}
        name={String(field.name)}
        value={field.state.value as string}
        onValueChange={(value: string) => {
          field.handleChange(value);
        }}
      >
        <SelectTrigger id={fieldId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

// ─── FormCheckbox ───────────────────────────────────────

interface FormCheckboxProps {
  className?: string;
  description?: string;
  disabled?: boolean;
  field: AnyFieldApi;
  label: string;
}

function FormCheckbox({
  className,
  description,
  disabled,
  field,
  label,
}: FormCheckboxProps) {
  const autoId = useId();
  const fieldId = `${autoId}-${String(field.name)}`;
  const error = getFieldError(field);

  return (
    <div className={cn('space-y-2', className)} data-slot="form-checkbox">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={field.state.value as boolean}
          disabled={disabled}
          id={fieldId}
          onCheckedChange={(checked: boolean | 'indeterminate') => {
            field.handleChange(checked === true);
          }}
        />
        <Label
          htmlFor={fieldId}
          variant={error ? 'error' : 'default'}
        >
          {label}
        </Label>
      </div>
      {description && !error ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

// ─── FormSwitch ─────────────────────────────────────────

interface FormSwitchProps {
  className?: string;
  description?: string;
  disabled?: boolean;
  field: AnyFieldApi;
  label: string;
}

function FormSwitch({
  className,
  description,
  disabled,
  field,
  label,
}: FormSwitchProps) {
  const autoId = useId();
  const fieldId = `${autoId}-${String(field.name)}`;
  const error = getFieldError(field);

  return (
    <div className={cn('space-y-2', className)} data-slot="form-switch">
      <div className="flex items-center gap-2">
        <Switch
          checked={field.state.value as boolean}
          disabled={disabled}
          id={fieldId}
          onCheckedChange={(checked: boolean) => {
            field.handleChange(checked);
          }}
        />
        <Label
          htmlFor={fieldId}
          variant={error ? 'error' : 'default'}
        >
          {label}
        </Label>
      </div>
      {description && !error ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

export {
  Form,
  FormCheckbox,
  FormField,
  FormInput,
  FormSelect,
  FormSwitch,
  FormTextarea,
};
export type {
  FormCheckboxProps,
  FormFieldProps,
  FormInputProps,
  FormProps,
  FormSelectOption,
  FormSelectProps,
  FormSwitchProps,
  FormTextareaProps,
};

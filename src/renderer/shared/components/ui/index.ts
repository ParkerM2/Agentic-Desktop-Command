// ─── Design System Barrel Export ─────────────────────────────
// All UI primitives re-exported from a single entry point.
// Usage: import { Button, Card, Input } from '@ui';

// Tier 1: Form Primitives
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

export { Input, inputVariants } from './input';
export type { InputProps } from './input';

export { Textarea, textareaVariants } from './textarea';
export type { TextareaProps } from './textarea';

export { Label, labelVariants } from './label';
export type { LabelProps } from './label';

// Tier 1: Display Primitives
export { Badge, badgeVariants } from './badge';
export type { BadgeProps } from './badge';

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
} from './card';

export { Skeleton } from './skeleton';
export type { SkeletonProps } from './skeleton';

export { Spinner, spinnerVariants } from './spinner';
export type { SpinnerProps } from './spinner';

export { EmptyState, emptyStateVariants } from './empty-state';
export type { EmptyStateProps } from './empty-state';

// Tier 1: Layout & Typography
export { PageContent, PageHeader, PageLayout } from './page-layout';
export type { PageContentProps, PageHeaderProps, PageLayoutProps } from './page-layout';

export { Code, Heading, headingVariants, Text, textVariants } from './typography';
export type { CodeProps, HeadingProps, TextProps } from './typography';

export { Grid, gridVariants } from './grid';
export type { GridProps } from './grid';

export { Stack, stackVariants } from './stack';
export type { StackProps } from './stack';

export { Flex, flexVariants } from './flex';
export type { FlexProps } from './flex';

export { Container, containerVariants } from './container';
export type { ContainerProps } from './container';

export { Separator } from './separator';
export type { SeparatorProps } from './separator';

// Tier 2: Radix Wrappers — Dialogs & Menus
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog';

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './dropdown-menu';

// Tier 2: Radix Wrappers — Feedback & Navigation
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

export { Switch, switchVariants } from './switch';
export type { SwitchProps } from './switch';

export { Checkbox, checkboxVariants } from './checkbox';
export type { CheckboxProps } from './checkbox';

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toastVariants,
} from './toast';
export type { ToastProps } from './toast';

// Tier 2: Radix Wrappers — Layout & Display
export { ScrollArea, ScrollBar } from './scroll-area';
export type { ScrollAreaProps, ScrollBarProps } from './scroll-area';

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';
export type { PopoverContentProps } from './popover';

export { Progress, progressVariants } from './progress';
export type { ProgressProps } from './progress';

export { Slider, sliderThumbVariants, sliderTrackVariants } from './slider';
export type { SliderProps } from './slider';

export {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';
export type { CollapsibleContentProps, CollapsibleProps, CollapsibleTriggerProps } from './collapsible';

// Tier 3: Form System (TanStack Form + Zod v4)
// Note: import { useForm } from '@tanstack/react-form' directly — not re-exported here
export {
  Form,
  FormCheckbox,
  FormField,
  FormInput,
  FormSelect,
  FormSwitch,
  FormTextarea,
} from './form';
export type {
  FormCheckboxProps,
  FormFieldProps,
  FormInputProps,
  FormProps,
  FormSelectOption,
  FormSelectProps,
  FormSwitchProps,
  FormTextareaProps,
} from './form';

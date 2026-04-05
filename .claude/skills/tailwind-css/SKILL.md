---
name: tailwind-css
description: Core Tailwind CSS patterns, gotchas, and fixes for layout, alignment, spacing, and responsive design. Use when debugging visual layout issues or writing Tailwind classes.
metadata:
  model: inherit
---

# Tailwind CSS Reference

## Flex & Grid Alignment

### Text + Icon vertical alignment — always use Tailwind classes for icon size
Lucide's `size` prop sets fixed pixel attributes (`width="12" height="12"`), which don't respond to the rem system. Tailwind v4's `text-xs` line-height is `calc(1 / 0.75) × font-size` (unitless ratio, rem-scaled). When `data-ui-scale` changes `html { font-size }`, the text box scales but the fixed-pixel icon doesn't — causing optical misalignment.

**Fix: always size icons with Tailwind classes, never the `size` prop.**

```tsx
// ❌ Fixed pixels bypass rem scaling — misaligns with text at non-100% ui-scale
<Button size="sm">
  {email}
  <X size={12} />
</Button>

// ✅ Tailwind size class scales with the rem system
<Button size="sm">
  {email}
  <X className="size-3 shrink-0" />
</Button>
```

`size-3` = `0.75rem` — same as `text-xs` font-size, so icon and text scale together. `shrink-0` prevents the icon from being compressed in constrained layouts.

### Anonymous text nodes in flex
Bare text nodes in flex containers are valid flex items. Wrapping in `<span>` is only needed if you need to apply classes to the text.

### items-center vs items-baseline
- `items-center` — mathematical center of each flex item's box. Use for icon+text rows.
- `items-baseline` — aligns text baselines across items with different font sizes. Use for mixed-size text.

### SVG icons in flex
Lucide/Heroicon SVGs are `inline` by default. In a flex container they become flex items. Add `shrink-0` to prevent icons from being squished in constrained layouts:
```tsx
<Icon className="shrink-0" size={16} />
```

---

## Spacing

### space-y / space-x override order
`space-y-4` and `space-y-6` are in the same Tailwind group. Tailwind-merge resolves conflicts — the **last** one wins when using `cn()`:
```ts
cn('space-y-6', 'space-y-4') // → space-y-4 ✅
cn('space-y-4', 'space-y-6') // → space-y-6 ✅
```
Always pass overrides as the last argument to `cn()`.

### padding shorthand vs sides
`px-4` and `pl-3` conflict — Tailwind-merge keeps the more specific one:
```ts
cn('px-4', 'pl-3')  // → px-4 pl-3... tailwind-merge keeps pl-3 and removes px-4's left
```
Be explicit: `pr-4 pl-3` rather than mixing `px-*` with `pl-*`/`pr-*`.

---

## Height & Sizing

### h-full requires parent height
`h-full` resolves to the parent's height. If the parent has no explicit height, `h-full` = 0.

```tsx
// ❌ h-full resolves to 0 — parent has no height
<div>
  <div className="h-full" />
</div>

// ✅ Chain explicit heights up to a fixed ancestor
<div className="h-screen flex flex-col">
  <div className="flex-1">          {/* grows to fill remaining space */}
    <div className="h-full" />      {/* now resolves correctly */}
  </div>
</div>
```

### flex-1 vs h-full
- `flex-1` — grow to fill remaining space in a flex container. Use inside `flex flex-col` parents.
- `h-full` — 100% of parent's height. Requires parent to have an explicit height.
- Prefer `flex-1` over `h-full` in flex layouts.

### min-h-0 for overflow in flex children
Flex children have `min-height: auto` by default, preventing overflow/scroll from working:
```tsx
// ❌ Overflow won't work — min-height prevents shrinking
<div className="flex flex-col">
  <div className="flex-1 overflow-auto">...</div>
</div>

// ✅ min-h-0 allows the child to shrink below its content size
<div className="flex flex-col">
  <div className="flex-1 min-h-0 overflow-auto">...</div>
</div>
```

---

## Responsive & Container

### Container queries vs viewport queries
- `sm:`, `md:`, `lg:` — respond to **viewport** width
- `@container` + `@sm:` etc. — respond to **parent container** width (Tailwind v3.2+)

### Tailwind v4 differences from v3
- `@theme` directive replaces `theme.extend` in config
- CSS-first config via `globals.css` instead of `tailwind.config.js`
- No `tailwind.config.js` needed for most customization
- `color-mix()` is the preferred way to create opacity variants of theme tokens

---

## Common Gotchas

### Dynamic class names are purged
Never construct class names dynamically — Tailwind only includes classes it sees as complete strings:
```ts
// ❌ Purged — Tailwind can't detect these
const color = 'red';
<div className={`text-${color}-500`} />

// ✅ Full class names are safe
const cls = isError ? 'text-red-500' : 'text-green-500';
<div className={cls} />
```

### Conflicting utilities need tailwind-merge
Vanilla class concatenation doesn't resolve Tailwind conflicts:
```ts
// ❌ Both classes present — browser applies last one in stylesheet, not in string
`bg-red-500 ${isActive ? 'bg-blue-500' : ''}`

// ✅ tailwind-merge resolves conflicts
cn('bg-red-500', isActive && 'bg-blue-500')
```

### Button nested inside span (interactive nesting)
Placing a `<button>` inside a `<span>` causes alignment bugs because `span` is an inline element — flex alignment within `inline-flex` breaks for nested block-level elements.

```tsx
// ❌ Button inside Badge (span) — alignment issues
<Badge>
  {email}
  <Button>X</Button>   {/* button inside span = broken */}
</Badge>

// ✅ Use a div wrapper or a single Button
<div className="inline-flex items-center rounded-full border ...">
  <Button>{email}</Button>
  <Button size="icon"><X /></Button>
</div>
```

/**
 * TransitionOutlet — Animated route transition wrapper
 *
 * Wraps content that should fade in on route changes. Uses `key` to
 * force remount and replay the CSS entrance animation.
 *
 *   <TransitionOutlet routeKey={pathname}>
 *     <Outlet />
 *   </TransitionOutlet>
 */

import { cn } from '@renderer/shared/lib/utils';

interface TransitionOutletProps extends React.ComponentProps<'div'> {
  /** Value that changes on route transitions (e.g. pathname) */
  routeKey: string;
}

function TransitionOutlet({
  routeKey,
  className,
  children,
  ...props
}: TransitionOutletProps) {
  return (
    <div
      key={routeKey}
      className={cn('h-full animate-fade-in overflow-hidden', className)}
      data-slot="transition-outlet"
      {...props}
    >
      {children}
    </div>
  );
}

export { TransitionOutlet };
export type { TransitionOutletProps };

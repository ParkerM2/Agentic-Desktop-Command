import { z } from 'zod';

import { SuccessResponseSchema } from '../common/schemas';

import { RUNNERS, RUNNERS_EVENTS } from './channels';
import {
  RunnerHealthEventSchema,
  RunnerInstanceSchema,
  RunnerOutputEventSchema,
  RunnerProfileSchema,
  RunnerStatusEventSchema,
  ScopeRefSchema,
} from './schemas';

// ─── Invoke Channels ──────────────────────────────────────────

export const runnersInvoke = {
  [RUNNERS.PROFILE.LIST]: {
    input: z.object({ projectId: z.string() }),
    output: z.array(RunnerProfileSchema),
  },
  [RUNNERS.PROFILE.SAVE]: {
    input: z.object({ profile: RunnerProfileSchema }),
    output: RunnerProfileSchema,
  },
  [RUNNERS.PROFILE.DELETE]: {
    input: z.object({ profileId: z.string() }),
    output: SuccessResponseSchema,
  },
  [RUNNERS.INSTANCE.LIST]: {
    input: z.object({ scope: ScopeRefSchema }),
    output: z.array(RunnerInstanceSchema),
  },
  [RUNNERS.INSTANCE.START]: {
    input: z.object({ profileId: z.string(), scope: ScopeRefSchema }),
    output: RunnerInstanceSchema,
  },
  [RUNNERS.INSTANCE.STOP]: {
    input: z.object({ instanceId: z.string() }),
    output: SuccessResponseSchema,
  },
  [RUNNERS.INSTANCE.RESTART]: {
    input: z.object({ instanceId: z.string() }),
    output: RunnerInstanceSchema,
  },
} as const;

// ─── Event Channels ───────────────────────────────────────────

export const runnersEvents = {
  [RUNNERS_EVENTS.INSTANCE.STATUS]: { payload: RunnerStatusEventSchema },
  [RUNNERS_EVENTS.INSTANCE.OUTPUT]: { payload: RunnerOutputEventSchema },
  [RUNNERS_EVENTS.INSTANCE.HEALTH]: { payload: RunnerHealthEventSchema },
} as const;

import { z } from 'zod';

import { RUNNERS } from './channels';
import {
  RunnerInstanceSchema,
  RunnerProfileSchema,
  ScopeRefSchema,
} from './schemas';

export const RUNNERS_CONTRACT = {
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
    output: z.object({ success: z.literal(true) }),
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
    output: z.object({ success: z.literal(true) }),
  },
  [RUNNERS.INSTANCE.RESTART]: {
    input: z.object({ instanceId: z.string() }),
    output: RunnerInstanceSchema,
  },
} as const;

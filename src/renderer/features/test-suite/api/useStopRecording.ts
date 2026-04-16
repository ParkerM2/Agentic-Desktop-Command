import { useMutation } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

export function useStopRecording() {
  return useMutation({
    mutationFn: () => ipc(TEST_SUITE['BROWSER-VIEW'].DESTROY, {}),
  });
}

import { useMutation } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

export function useStartRecording() {
  return useMutation({
    mutationFn: ({ url, width, height }: { url: string; width: number; height: number }) =>
      ipc(TEST_SUITE['BROWSER-VIEW'].CREATE, {
        url,
        bounds: { x: 0, y: 0, width, height },
      }),
  });
}

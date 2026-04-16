import { useMutation } from '@tanstack/react-query';

import { TEST_SUITE } from '@shared/ipc/test-suite/channels';

import { ipc } from '@renderer/shared/lib/ipc';

export function useParseDataFile() {
  return useMutation({
    mutationFn: (filePath: string) => ipc(TEST_SUITE['DATA-RUN'].PARSE, { filePath }),
  });
}

export function useExecuteDataRun() {
  return useMutation({
    mutationFn: (input: { scriptId: string; dataFilePath: string }) =>
      ipc(TEST_SUITE['DATA-RUN'].EXECUTE, input),
  });
}

import { once } from 'node:events';

import { describe, expect, it } from 'vitest';

import { ProcessSupervisor } from '@main/features/runners/process-supervisor';

describe('ProcessSupervisor', () => {
  it('spawns a process, emits stdout, and resolves exit code', async () => {
    const sup = new ProcessSupervisor();
    const outputs: string[] = [];
    sup.on('output', ({ chunk, stream }: { chunk: string; stream: string }) => {
      if (stream === 'stdout') outputs.push(chunk);
    });

    const handle = sup.spawn({
      id: 'a1',
      command: process.platform === 'win32' ? 'cmd /c echo hello' : 'echo hello',
      cwd: process.cwd(),
      env: {},
    });

    const [exit] = (await once(sup, 'exit')) as [{ id: string; code: number | null }];
    expect(exit.id).toBe('a1');
    expect(exit.code).toBe(0);
    expect(outputs.join('')).toMatch(/hello/);
    expect(handle.id).toBe('a1');
  });

  it('kill() terminates a long-running process', async () => {
    const sup = new ProcessSupervisor();
    const cmd =
      process.platform === 'win32'
        ? 'node -e "setInterval(()=>console.log(1),100)"'
        : 'node -e "setInterval(()=>console.log(1),100)"';

    sup.spawn({ id: 'b1', command: cmd, cwd: process.cwd(), env: {} });
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 150);
    });
    sup.kill('b1');

    const [exit] = (await once(sup, 'exit')) as [{ id: string; code: number | null }];
    expect(exit.id).toBe('b1');
  });
});

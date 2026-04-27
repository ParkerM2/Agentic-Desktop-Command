import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

export interface SpawnOptions {
  id: string;
  command: string;
  cwd: string;
  env: Record<string, string>;
}

export interface SpawnHandle {
  id: string;
  pid: number | undefined;
}

export interface SupervisorEvents {
  output: (payload: { id: string; stream: 'stdout' | 'stderr'; chunk: string }) => void;
  exit: (payload: { id: string; code: number | null; signal: NodeJS.Signals | null }) => void;
  error: (payload: { id: string; message: string }) => void;
}

export class ProcessSupervisor extends EventEmitter {
  private procs = new Map<string, ChildProcess>();

  spawn(opts: SpawnOptions): SpawnHandle {
    // `command` is a single shell-style string (supports quoting, pipes, etc.),
    // so always run it through a shell. On Windows this is cmd.exe; elsewhere /bin/sh.
    const proc = spawn(opts.command, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.procs.set(opts.id, proc);

    proc.stdout.on('data', (buf: Buffer) => {
      this.emit('output', { id: opts.id, stream: 'stdout', chunk: buf.toString('utf8') });
    });
    proc.stderr.on('data', (buf: Buffer) => {
      this.emit('output', { id: opts.id, stream: 'stderr', chunk: buf.toString('utf8') });
    });
    proc.on('error', (err) => {
      this.emit('error', { id: opts.id, message: err.message });
    });
    proc.on('exit', (code, signal) => {
      this.procs.delete(opts.id);
      this.emit('exit', { id: opts.id, code, signal });
    });

    return { id: opts.id, pid: proc.pid };
  }

  kill(id: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const proc = this.procs.get(id);
    if (!proc) return false;
    try {
      proc.kill(signal);
    } catch {
      return false;
    }
    return true;
  }

  isAlive(id: string): boolean {
    return this.procs.has(id);
  }

  killAll(): void {
    for (const id of this.procs.keys()) {
      this.kill(id);
    }
  }
}

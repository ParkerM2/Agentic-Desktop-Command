/**
 * Docker Service — Detects Docker Desktop and auto-provisions the ADC Hub container.
 *
 * Provides a zero-terminal-commands setup experience:
 * 1. Detect if Docker is installed and running
 * 2. Pull the Hub image
 * 3. Start the container on port 3200
 * 4. Wait for the health endpoint
 * 5. Generate an API key
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const HUB_IMAGE = 'parkerm2/adc-hub:latest';
const HUB_CONTAINER_NAME = 'adc-hub';
const HUB_PORT = 3200;
const HUB_URL = `http://localhost:${String(HUB_PORT)}`;
const HEALTH_TIMEOUT_MS = 30_000;
const HEALTH_POLL_MS = 1_000;

export interface DockerService {
  getStatus: () => Promise<{ installed: boolean; running: boolean }>;
  setupHub: () => Promise<{ success: boolean; url?: string; apiKey?: string; error?: string; step?: string }>;
}

export function createDockerService(): DockerService {
  /** Run a docker CLI command, returning stdout. Throws on non-zero exit. */
  async function docker(...args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('docker', args, { timeout: 120_000 });
    return stdout.trim();
  }

  async function getStatus(): Promise<{ installed: boolean; running: boolean }> {
    try {
      await docker('info');
      return { installed: true, running: true };
    } catch {
      // Check if docker binary exists but daemon isn't running
      try {
        await docker('version');
        return { installed: true, running: false };
      } catch {
        return { installed: false, running: false };
      }
    }
  }

  /** Check if the adc-hub container exists (running or stopped). */
  async function getContainerState(): Promise<'running' | 'stopped' | 'none'> {
    try {
      const out = await docker('inspect', '--format', '{{.State.Running}}', HUB_CONTAINER_NAME);
      return out === 'true' ? 'running' : 'stopped';
    } catch {
      return 'none';
    }
  }

  /** Wait for the Hub health endpoint to return 200. */
  async function waitForHealth(): Promise<boolean> {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => { controller.abort(); }, 3000);
        const response = await fetch(`${HUB_URL}/api/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) return true;
      } catch {
        // Not ready yet
      }
      await new Promise((resolve) => { setTimeout(resolve, HEALTH_POLL_MS); });
    }
    return false;
  }

  /** Generate the first API key via the Hub endpoint. */
  async function generateApiKey(): Promise<string> {
    const response = await fetch(`${HUB_URL}/api/auth/generate-key`, { method: 'POST' });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`generate-key failed (${String(response.status)}): ${body}`);
    }
    const data = (await response.json()) as { key: string };
    return data.key;
  }

  async function setupHub(): Promise<{
    success: boolean;
    url?: string;
    apiKey?: string;
    error?: string;
    step?: string;
  }> {
    try {
      // Step 1: Ensure Docker is running
      const status = await getStatus();
      if (!status.installed) {
        return { success: false, error: 'Docker is not installed', step: 'docker-check' };
      }
      if (!status.running) {
        return { success: false, error: 'Docker Desktop is not running. Please start it and try again.', step: 'docker-check' };
      }

      // Step 2: Check if container already exists
      const containerState = await getContainerState();

      if (containerState === 'running') {
        // Container already running — just get the API key
        const healthy = await waitForHealth();
        if (!healthy) {
          return { success: false, error: 'Hub container is running but not responding', step: 'health-check' };
        }

        try {
          const apiKey = await generateApiKey();
          return { success: true, url: HUB_URL, apiKey };
        } catch {
          // API key already exists — container was previously set up.
          // User needs to provide their existing key or reset the container.
          return {
            success: false,
            error: 'Hub is already running with an existing API key. Enter your key manually, or remove the container and try again.',
            step: 'api-key',
          };
        }
      }

      if (containerState === 'stopped') {
        // Restart existing container
        await docker('start', HUB_CONTAINER_NAME);
      } else {
        // Step 3: Pull the image
        await docker('pull', HUB_IMAGE);

        // Step 4: Run the container
        await docker(
          'run', '-d',
          '--name', HUB_CONTAINER_NAME,
          '-p', `${String(HUB_PORT)}:${String(HUB_PORT)}`,
          '--restart', 'unless-stopped',
          HUB_IMAGE,
        );
      }

      // Step 5: Wait for health
      const healthy = await waitForHealth();
      if (!healthy) {
        return { success: false, error: 'Hub container started but health check timed out', step: 'health-check' };
      }

      // Step 6: Generate API key
      const apiKey = await generateApiKey();

      return { success: true, url: HUB_URL, apiKey };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, step: 'unknown' };
    }
  }

  return { getStatus, setupHub };
}

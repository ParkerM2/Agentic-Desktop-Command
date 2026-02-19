/**
 * Docker IPC Handlers
 *
 * Wires docker.getStatus and docker.setupHub to the Docker service.
 */

import type { DockerService } from '../../services/docker/docker-service';
import type { IpcRouter } from '../router';

export function registerDockerHandlers(router: IpcRouter, dockerService: DockerService): void {
  router.handle('docker.getStatus', () => dockerService.getStatus());
  router.handle('docker.setupHub', () => dockerService.setupHub());
}

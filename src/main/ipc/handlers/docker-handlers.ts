/**
 * Docker IPC Handlers
 *
 * Wires docker.getStatus and docker.setupHub to the Docker service.
 */

import { DOCKER } from '@shared/ipc/docker/channels';

import type { DockerService } from '../../services/docker/docker-service';
import type { IpcRouter } from '../router';

export function registerDockerHandlers(router: IpcRouter, dockerService: DockerService): void {
  router.handle(DOCKER.GET.STATUS, () => dockerService.getStatus());
  router.handle(DOCKER.SETUP.HUB, () => dockerService.setupHub());
}

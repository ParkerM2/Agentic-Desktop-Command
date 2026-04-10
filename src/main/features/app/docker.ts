/**
 * App — Docker sub-module
 *
 * Re-exports Docker service components. Absorbed from features/docker/.
 */

export { createDockerService } from '../docker/docker-service';
export { registerDockerHandlers } from '../docker/docker-handlers';

export type { DockerService } from '../docker/docker-service';

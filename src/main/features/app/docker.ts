/**
 * App — Docker sub-module barrel (re-exports from top-level feature)
 */

export { createDockerService } from '../docker/docker-service';
export { registerDockerHandlers } from '../docker/docker-handlers';

export type { DockerService } from '../docker/docker-service';

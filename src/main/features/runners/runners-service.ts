import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { and, eq } from 'drizzle-orm';

import { RUNNERS_EVENTS } from '@shared/ipc/runners/channels';
import type {
  RunnerInstance,
  RunnerProfile,
  RunnerStatus,
  ScopeRef,
} from '@shared/ipc/runners/schemas';
import { generateId } from '@shared/lib/id';

import type { AdcDatabase } from '@main/db';
import type { IpcRouter } from '@main/ipc/router';

import { pollUntilHealthy } from './health-check';
import { ProcessSupervisor } from './process-supervisor';
import { runnerInstances, runnerProfiles } from './schema';

interface ProjectServiceLike {
  getProjectPath: (projectId: string) => string | undefined;
}

export interface RunnersServiceDeps {
  db: AdcDatabase;
  router: IpcRouter;
  projectService: ProjectServiceLike;
}

export interface RunnersService {
  listProfiles: (projectId: string) => RunnerProfile[];
  saveProfile: (profile: RunnerProfile) => RunnerProfile;
  deleteProfile: (profileId: string) => { success: boolean };

  listInstances: (scope: ScopeRef) => RunnerInstance[];
  startInstance: (profileId: string, scope: ScopeRef) => RunnerInstance;
  stopInstance: (instanceId: string) => { success: boolean };
  restartInstance: (instanceId: string) => RunnerInstance;

  dispose: () => void;
}

export function createRunnersService(deps: RunnersServiceDeps): RunnersService {
  const { db, router, projectService } = deps;
  const supervisor = new ProcessSupervisor();
  const healthControllers = new Map<string, AbortController>();

  supervisor.on('output', ({ id, stream, chunk }: { id: string; stream: 'stdout' | 'stderr'; chunk: string }) => {
    router.emit(RUNNERS_EVENTS.INSTANCE.OUTPUT, { instanceId: id, stream, chunk });
  });
  supervisor.on('exit', ({ id, code }: { id: string; code: number | null }) => {
    const nextStatus: RunnerStatus = code === 0 ? 'stopped' : 'failed';
    updateInstance(id, {
      status: nextStatus,
      exitCode: code ?? undefined,
      stoppedAt: new Date().toISOString(),
    });
    router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, {
      instanceId: id,
      status: nextStatus,
      exitCode: code,
    });
    healthControllers.get(id)?.abort();
    healthControllers.delete(id);
  });
  supervisor.on('error', ({ id, message }: { id: string; message: string }) => {
    updateInstance(id, { status: 'failed', lastError: message });
    router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, {
      instanceId: id,
      status: 'failed',
      lastError: message,
    });
  });

  function rowToProfile(row: typeof runnerProfiles.$inferSelect): RunnerProfile {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      command: row.command,
      cwdRelative: row.cwdRelative,
      env: JSON.parse(row.envJson) as Record<string, string>,
      healthCheckUrl: row.healthCheckUrl ?? undefined,
      healthCheckTimeoutMs: row.healthCheckTimeoutMs,
      autoRestart: row.autoRestart,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  function rowToInstance(row: typeof runnerInstances.$inferSelect): RunnerInstance {
    const scope: ScopeRef =
      row.scopeKind === 'project'
        ? { kind: 'project', projectId: row.scopeProjectId }
        : {
            kind: 'worktree',
            projectId: row.scopeProjectId,
            worktreePath: row.scopeWorktreePath ?? '',
          };
    return {
      id: row.id,
      profileId: row.profileId,
      scope,
      status: row.status as RunnerStatus,
      pid: row.pid ?? undefined,
      resolvedCwd: row.resolvedCwd,
      resolvedCommand: row.resolvedCommand,
      exitCode: row.exitCode ?? null,
      startedAt: row.startedAt ?? undefined,
      readyAt: row.readyAt ?? undefined,
      stoppedAt: row.stoppedAt ?? undefined,
      lastError: row.lastError ?? undefined,
    };
  }

  function updateInstance(
    id: string,
    patch: Partial<typeof runnerInstances.$inferInsert>,
  ): void {
    db.update(runnerInstances).set(patch).where(eq(runnerInstances.id, id)).run();
  }

  function resolveCwd(profile: RunnerProfile, scope: ScopeRef): string {
    const base =
      scope.kind === 'worktree'
        ? scope.worktreePath
        : projectService.getProjectPath(scope.projectId);
    if (!base) throw new Error(`Cannot resolve cwd for scope ${JSON.stringify(scope)}`);
    const resolved = profile.cwdRelative === '.' ? base : join(base, profile.cwdRelative);
    if (!existsSync(resolved)) throw new Error(`Resolved cwd does not exist: ${resolved}`);
    return resolved;
  }

  function startHealthCheck(instanceId: string, url: string, timeoutMs: number): void {
    const controller = new AbortController();
    healthControllers.set(instanceId, controller);
    void pollUntilHealthy({ url, timeoutMs, signal: controller.signal })
      .then((result) => {
        router.emit(RUNNERS_EVENTS.INSTANCE.HEALTH, {
          instanceId,
          healthy: result.healthy,
          statusCode: result.statusCode,
          responseTimeMs: result.responseTimeMs,
        });
        if (result.healthy) {
          updateInstance(instanceId, { status: 'ready', readyAt: new Date().toISOString() });
          router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, { instanceId, status: 'ready' });
        }
        return result;
      })
      .finally(() => {
        healthControllers.delete(instanceId);
      });
  }

  return {
    listProfiles(projectId) {
      return db
        .select()
        .from(runnerProfiles)
        .where(eq(runnerProfiles.projectId, projectId))
        .all()
        .map(rowToProfile);
    },

    saveProfile(profile) {
      db.insert(runnerProfiles)
        .values({
          id: profile.id,
          projectId: profile.projectId,
          name: profile.name,
          command: profile.command,
          cwdRelative: profile.cwdRelative,
          envJson: JSON.stringify(profile.env),
          healthCheckUrl: profile.healthCheckUrl ?? null,
          healthCheckTimeoutMs: profile.healthCheckTimeoutMs,
          autoRestart: profile.autoRestart,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        })
        .onConflictDoUpdate({
          target: runnerProfiles.id,
          set: {
            name: profile.name,
            command: profile.command,
            cwdRelative: profile.cwdRelative,
            envJson: JSON.stringify(profile.env),
            healthCheckUrl: profile.healthCheckUrl ?? null,
            healthCheckTimeoutMs: profile.healthCheckTimeoutMs,
            autoRestart: profile.autoRestart,
            updatedAt: profile.updatedAt,
          },
        })
        .run();
      return profile;
    },

    deleteProfile(profileId) {
      db.delete(runnerProfiles).where(eq(runnerProfiles.id, profileId)).run();
      return { success: true };
    },

    listInstances(scope) {
      const rows = db
        .select()
        .from(runnerInstances)
        .where(
          scope.kind === 'worktree'
            ? and(
                eq(runnerInstances.scopeProjectId, scope.projectId),
                eq(runnerInstances.scopeKind, 'worktree'),
                eq(runnerInstances.scopeWorktreePath, scope.worktreePath),
              )
            : and(
                eq(runnerInstances.scopeProjectId, scope.projectId),
                eq(runnerInstances.scopeKind, 'project'),
              ),
        )
        .all();
      return rows.map(rowToInstance);
    },

    startInstance(profileId, scope) {
      const profileRow = db
        .select()
        .from(runnerProfiles)
        .where(eq(runnerProfiles.id, profileId))
        .get();
      if (!profileRow) throw new Error(`Profile ${profileId} not found`);
      const profile = rowToProfile(profileRow);

      const resolvedCwd = resolveCwd(profile, scope);
      const id = generateId();
      const now = new Date().toISOString();

      db.insert(runnerInstances)
        .values({
          id,
          profileId,
          scopeKind: scope.kind,
          scopeProjectId: scope.projectId,
          scopeWorktreePath: scope.kind === 'worktree' ? scope.worktreePath : null,
          status: 'starting',
          resolvedCwd,
          resolvedCommand: profile.command,
          startedAt: now,
        })
        .run();

      router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, { instanceId: id, status: 'starting' });

      const handle = supervisor.spawn({
        id,
        command: profile.command,
        cwd: resolvedCwd,
        env: profile.env,
      });

      updateInstance(id, { pid: handle.pid ?? null, status: 'running' });
      router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, { instanceId: id, status: 'running' });

      if (profile.healthCheckUrl) {
        startHealthCheck(id, profile.healthCheckUrl, profile.healthCheckTimeoutMs);
      } else {
        updateInstance(id, { status: 'ready', readyAt: new Date().toISOString() });
        router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, { instanceId: id, status: 'ready' });
      }

      const freshRow = db
        .select()
        .from(runnerInstances)
        .where(eq(runnerInstances.id, id))
        .get();
      if (!freshRow) throw new Error('Instance row vanished');
      return rowToInstance(freshRow);
    },

    stopInstance(instanceId) {
      updateInstance(instanceId, { status: 'stopping' });
      router.emit(RUNNERS_EVENTS.INSTANCE.STATUS, { instanceId, status: 'stopping' });
      supervisor.kill(instanceId);
      return { success: true };
    },

    restartInstance(instanceId) {
      const row = db
        .select()
        .from(runnerInstances)
        .where(eq(runnerInstances.id, instanceId))
        .get();
      if (!row) throw new Error(`Instance ${instanceId} not found`);
      supervisor.kill(instanceId);
      const inst = rowToInstance(row);
      return this.startInstance(inst.profileId, inst.scope);
    },

    dispose() {
      for (const c of healthControllers.values()) c.abort();
      healthControllers.clear();
      supervisor.killAll();
    },
  };
}

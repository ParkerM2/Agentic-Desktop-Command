/**
 * Setup Pipeline Orchestrator — Coordinates all project setup steps
 *
 * Runs each step sequentially, emitting progress events via the IPC router
 * after each step status change. The pipeline always completes — errors are
 * reported per-step via progress events, never thrown.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import type { CodebaseAnalysis, CreateProjectInput, SetupStepStatus } from '@shared/types';

import { serviceLogger } from '@main/lib/logger';

import { ensureGitignoreEntries } from './gitignore-manager';

import type { ClaudeMdGeneratorService } from './claudemd-generator';
import type { CodebaseAnalyzerService } from './codebase-analyzer';
import type { DocGeneratorService } from './doc-generator';
import type { GitHubRepoCreatorService } from './github-repo-creator';
import type { ProjectService } from './project-service';
import type { SkillsResolverService } from './skills-resolver';
import type { IpcRouter } from '../../ipc/router';
import type { GitService } from '../git/git-service';

// ─── Types ──────────────────────────────────────────────────

interface PipelineStep {
  id: string;
  label: string;
  status: SetupStepStatus;
  error?: string;
  /** Return true to skip this step (mark as 'skipped' without running) */
  shouldSkip?: () => boolean;
  run: () => Promise<void> | void;
}

export interface SetupPipelineService {
  runForExisting: (projectId: string) => Promise<void>;
  runForNew: (input: CreateProjectInput & { projectId: string }) => Promise<void>;
}

export interface SetupPipelineDeps {
  codebaseAnalyzer: CodebaseAnalyzerService;
  claudeMdGenerator: ClaudeMdGeneratorService;
  skillsResolver: SkillsResolverService;
  docGenerator: DocGeneratorService;
  githubRepoCreator: GitHubRepoCreatorService;
  projectService: ProjectService;
  gitService: GitService;
  router: IpcRouter;
}

// ─── Helpers ────────────────────────────────────────────────

/** Run steps sequentially, emitting progress after each status change */
async function runSteps(steps: PipelineStep[], emitProgress: () => void): Promise<void> {
  for (const step of steps) {
    if (step.shouldSkip?.() === true) {
      step.status = 'skipped';
      emitProgress();
      continue;
    }

    step.status = 'running';
    emitProgress();
    try {
      await step.run();
      step.status = 'done';
    } catch (error: unknown) {
      step.status = 'error';
      step.error = error instanceof Error ? error.message : 'Unknown error';
      serviceLogger.error(`[SetupPipeline] Step "${step.id}" failed:`, step.error);
    }
    emitProgress();
  }
}

// ─── Factory ────────────────────────────────────────────────

export function createSetupPipeline(deps: SetupPipelineDeps): SetupPipelineService {
  const {
    codebaseAnalyzer,
    claudeMdGenerator,
    skillsResolver,
    docGenerator,
    githubRepoCreator,
    projectService,
    gitService,
    router,
  } = deps;

  /** Build the common setup steps for an existing project */
  function buildExistingSteps(
    projectId: string,
    projectPath: string,
    projectName: string,
    analysisRef: { current: CodebaseAnalysis | undefined },
  ): PipelineStep[] {
    return [
      {
        id: 'analyze',
        label: 'Analyzing codebase',
        status: 'pending',
        run() {
          analysisRef.current = codebaseAnalyzer.analyzeCodebase(projectPath);
        },
      },
      {
        id: 'claudemd',
        label: 'Generating CLAUDE.md',
        status: 'pending',
        run() {
          const analysis = analysisRef.current;
          if (!analysis) {
            throw new Error('Codebase analysis not available — analyze step may have failed');
          }
          const content = claudeMdGenerator.generateClaudeMd(projectName, projectPath, analysis);
          writeFileSync(join(projectPath, 'CLAUDE.md'), content, 'utf-8');
        },
      },
      {
        id: 'claude-config',
        label: 'Creating .claude/ config',
        status: 'pending',
        run() {
          const claudeDir = join(projectPath, '.claude');
          if (!existsSync(claudeDir)) {
            mkdirSync(claudeDir, { recursive: true });
          }
        },
      },
      {
        id: 'skills',
        label: 'Installing agent skills',
        status: 'pending',
        run() {
          const analysis = analysisRef.current;
          if (!analysis) {
            throw new Error('Codebase analysis not available — analyze step may have failed');
          }
          const skills = skillsResolver.resolveSkills(analysis);
          skillsResolver.installSkills(projectPath, skills);
        },
      },
      {
        id: 'docs',
        label: 'Generating documentation',
        status: 'pending',
        run() {
          const analysis = analysisRef.current;
          if (!analysis) {
            throw new Error('Codebase analysis not available — analyze step may have failed');
          }
          docGenerator.generateDocs(projectPath, projectName, analysis);
        },
      },
      {
        id: 'adc-init',
        label: 'Initializing ADC workspace',
        status: 'pending',
        run() {
          const result = projectService.initializeProject(projectId);
          if (!result.success) {
            throw new Error(result.error ?? 'Failed to initialize ADC workspace');
          }
          ensureGitignoreEntries(projectPath, ['.adc/', '.claude/settings.local.json']);
        },
      },
    ];
  }

  /** Create the progress emitter function */
  function createEmitter(
    steps: PipelineStep[],
    projectId: string,
    analysisRef: { current: CodebaseAnalysis | undefined },
  ): () => void {
    return () => {
      // Find the currently running step, or fall back to the last non-pending step
      const currentStep =
        steps.find((s) => s.status === 'running') ??
        [...steps].reverse().find((s) => s.status !== 'pending');

      router.emit('event:project.setupProgress', {
        projectId,
        currentStep: currentStep?.id ?? steps[0].id,
        steps: steps.map((s) => ({
          id: s.id,
          label: s.label,
          status: s.status,
          error: s.error,
        })),
        analysis: analysisRef.current,
      });
    };
  }

  return {
    async runForExisting(projectId) {
      const projectPath = projectService.getProjectPath(projectId);
      if (!projectPath) {
        serviceLogger.error(`[SetupPipeline] Cannot find path for project ${projectId}`);
        return;
      }

      const projectName = basename(projectPath);
      const analysisRef: { current: CodebaseAnalysis | undefined } = {
        current: undefined,
      };

      const steps = buildExistingSteps(projectId, projectPath, projectName, analysisRef);

      const emitProgress = createEmitter(steps, projectId, analysisRef);

      serviceLogger.info(`[SetupPipeline] Running setup for existing project: ${projectName}`);
      emitProgress(); // Emit initial state so the modal shows all pending steps immediately
      await runSteps(steps, emitProgress);
      serviceLogger.info(`[SetupPipeline] Setup complete for existing project: ${projectName}`);
    },

    async runForNew(input) {
      const { projectId } = input;
      const analysisRef: { current: CodebaseAnalysis | undefined } = {
        current: undefined,
      };

      // Prefix steps for new projects
      const prefixSteps: PipelineStep[] = [
        {
          id: 'create-dir',
          label: 'Creating project directory',
          status: 'pending',
          run() {
            mkdirSync(input.path, { recursive: true });
          },
        },
        {
          id: 'git-init',
          label: 'Initializing git repo',
          status: 'pending',
          async run() {
            await gitService.initRepo(input.path);
          },
        },
        {
          id: 'github-repo',
          label: 'Creating GitHub repository',
          status: 'pending',
          shouldSkip: () => !input.createGitHubRepo,
          async run() {
            const result = await githubRepoCreator.createRepo({
              name: input.name,
              visibility: input.githubVisibility,
              sourcePath: input.path,
              description: input.description,
            });
            if (!result.success) {
              throw new Error(result.error ?? 'Failed to create GitHub repository');
            }
          },
        },
      ];

      // Common existing-project steps
      const existingSteps = buildExistingSteps(projectId, input.path, input.name, analysisRef);

      // Suffix step for initial commit
      const suffixSteps: PipelineStep[] = [
        {
          id: 'initial-commit',
          label: 'Pushing initial commit',
          status: 'pending',
          async run() {
            await gitService.initialCommit(input.path, 'Initial project setup by ADC');
          },
        },
      ];

      const allSteps = [...prefixSteps, ...existingSteps, ...suffixSteps];
      const emitProgress = createEmitter(allSteps, projectId, analysisRef);

      serviceLogger.info(`[SetupPipeline] Running setup for new project: ${input.name}`);
      emitProgress(); // Emit initial state so the modal shows all pending steps immediately
      await runSteps(allSteps, emitProgress);
      serviceLogger.info(`[SetupPipeline] Setup complete for new project: ${input.name}`);
    },
  };
}

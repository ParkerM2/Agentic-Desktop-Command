/**
 * PipelineDiagram — Full horizontal pipeline showing a task's journey through 7 workflow steps.
 * Assembles PipelineStepNode and PipelineConnector components based on task status.
 */

import type { ComponentType } from 'react';

import {
  Brain,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck,
  Play,
  Search,
} from 'lucide-react';

import type { TaskStatus } from '@shared/types';

import { PipelineConnector } from './PipelineConnector';
import { PipelineStepNode } from './PipelineStepNode';

import type { StepState } from './PipelineStepNode';

interface PipelineStep {
  icon: ComponentType<{ className?: string }>;
  key: string;
  label: string;
}

const PIPELINE_STEPS: readonly PipelineStep[] = [
  { icon: ClipboardList, key: 'backlog', label: 'Backlog' },
  { icon: Brain, key: 'planning', label: 'Planning' },
  { icon: FileCheck, key: 'plan_ready', label: 'Plan Ready' },
  { icon: Clock, key: 'queued', label: 'Queued' },
  { icon: Play, key: 'running', label: 'Running' },
  { icon: Search, key: 'review', label: 'Review' },
  { icon: CheckCircle2, key: 'done', label: 'Done' },
] as const;

/**
 * Maps a TaskStatus to the corresponding index in PIPELINE_STEPS.
 * Special cases: 'paused' maps to 'running', 'error' returns -1 (handled separately).
 */
function getStatusIndex(taskStatus: string): number {
  if (taskStatus === 'paused') {
    return PIPELINE_STEPS.findIndex((step) => step.key === 'running');
  }
  if (taskStatus === 'error') {
    return -1;
  }
  return PIPELINE_STEPS.findIndex((step) => step.key === taskStatus);
}

/**
 * Computes each step's visual state based on the current task status.
 */
function computeStepStates(taskStatus: string): StepState[] {
  const isError = taskStatus === 'error';
  const currentIndex = isError
    ? PIPELINE_STEPS.length - 1
    : getStatusIndex(taskStatus);

  return PIPELINE_STEPS.map((_step, index) => {
    if (index < currentIndex) {
      return 'completed';
    }
    if (index === currentIndex) {
      return isError ? 'error' : 'active';
    }
    return 'future';
  });
}

/**
 * Computes the connector state between two adjacent nodes.
 */
function getConnectorState(
  leftState: StepState,
  rightState: StepState,
): 'completed' | 'active' | 'future' {
  if (leftState === 'completed' && rightState === 'completed') {
    return 'completed';
  }
  if (leftState === 'completed' && (rightState === 'active' || rightState === 'error')) {
    return 'active';
  }
  return 'future';
}

interface PipelineDiagramProps {
  onStepClick: (step: string) => void;
  selectedStep: string | null;
  taskStatus: TaskStatus;
}

export function PipelineDiagram({
  onStepClick,
  selectedStep,
  taskStatus,
}: PipelineDiagramProps) {
  const stepStates = computeStepStates(taskStatus);

  return (
    <div className="flex items-start gap-0">
      {PIPELINE_STEPS.map((step, index) => (
        <div key={step.key} className="contents">
          <PipelineStepNode
            icon={step.icon}
            isSelected={selectedStep === step.key}
            label={step.label}
            state={stepStates[index]}
            onClick={() => onStepClick(step.key)}
          />
          {index < PIPELINE_STEPS.length - 1 ? (
            <PipelineConnector
              state={getConnectorState(stepStates[index], stepStates[index + 1])}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

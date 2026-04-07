/**
 * PhaseSection — A single workflow phase (brainstorming/planning/implementation)
 *
 * Shows strategy selector, prompt textarea, and a generate button that sends
 * the prompt to the assistant widget.
 */

import { Sparkles } from 'lucide-react';

import type { PluginArtifact, WorkflowPhase } from '@shared/ipc/workflow-templates/schemas';

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Text,
  Textarea,
} from '@ui';

interface PhaseSectionProps {
  phase: WorkflowPhase;
  artifacts: PluginArtifact[];
  onUpdate: (updates: Partial<WorkflowPhase>) => void;
  onGenerate: (prompt: string) => void;
  isGenerating: boolean;
}

export function PhaseSection({
  phase,
  artifacts,
  onUpdate,
  onGenerate,
  isGenerating,
}: PhaseSectionProps) {
  return (
    <div className="space-y-3">
      <Separator />
      <Text className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {phase.name}
      </Text>

      <div className="space-y-1.5">
        <Label htmlFor={`strategy-${phase.name}`}>Strategy</Label>
        <Select
          value={phase.strategy}
          onValueChange={(value) => onUpdate({ strategy: value })}
        >
          <SelectTrigger id={`strategy-${phase.name}`}>
            <SelectValue placeholder="Select strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skip">Skip</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
            {artifacts.map((artifact) => (
              <SelectItem
                key={`${artifact.type}:${artifact.name}`}
                value={`${artifact.type}:${artifact.name}`}
              >
                {artifact.type}:{artifact.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`prompt-${phase.name}`}>Prompt</Label>
        <Textarea
          id={`prompt-${phase.name}`}
          placeholder={`Prompt for ${phase.name} phase...`}
          resize="none"
          rows={4}
          value={phase.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
        />
      </div>

      <Button
        disabled={isGenerating || phase.prompt.trim().length === 0}
        size="sm"
        variant="outline"
        onClick={() => onGenerate(phase.prompt)}
      >
        <Sparkles className="mr-1.5 h-4 w-4" />
        Generate
      </Button>
    </div>
  );
}

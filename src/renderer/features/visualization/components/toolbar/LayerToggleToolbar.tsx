/**
 * LayerToggleToolbar — controls for codebase/agent layer visibility,
 * feature selection, and data refresh.
 */

import { RefreshCw } from 'lucide-react';

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui';

interface LayerToggleToolbarProps {
  showCodebaseLayer: boolean;
  showAgentLayer: boolean;
  onToggleCodebase: () => void;
  onToggleAgent: () => void;
  features: string[];
  selectedFeature: string | null;
  onSelectFeature: (feature: string) => void;
  onRefresh: () => void;
}

export function LayerToggleToolbar({
  showCodebaseLayer,
  showAgentLayer,
  onToggleCodebase,
  onToggleAgent,
  features,
  selectedFeature,
  onSelectFeature,
  onRefresh,
}: LayerToggleToolbarProps) {
  const firstFeature = features.at(0);
  const currentFeature = selectedFeature ?? firstFeature ?? '';
  const showFeatureSelector = showAgentLayer && features.length > 0;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background/90 p-2 shadow-md backdrop-blur-sm">
      {/* Layer toggles */}
      <Button
        aria-pressed={showCodebaseLayer}
        size="sm"
        variant={showCodebaseLayer ? 'primary' : 'outline'}
        onClick={onToggleCodebase}
      >
        Codebase
      </Button>
      <Button
        aria-pressed={showAgentLayer}
        size="sm"
        variant={showAgentLayer ? 'primary' : 'outline'}
        onClick={onToggleAgent}
      >
        Agents
      </Button>

      {/* Feature selector — only shown when agent layer is visible */}
      {showFeatureSelector ? (
        <Select value={currentFeature} onValueChange={onSelectFeature}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Select feature" />
          </SelectTrigger>
          <SelectContent>
            {features.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {/* Refresh */}
      <Button
        aria-label="Refresh visualization data"
        size="icon"
        variant="ghost"
        onClick={onRefresh}
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}

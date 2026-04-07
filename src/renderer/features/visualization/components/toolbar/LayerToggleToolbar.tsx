/**
 * LayerToggleToolbar — controls for codebase/agent layer visibility,
 * feature selection, layout direction, search, zoom, and edge labels.
 */

import { Maximize, Minus, Plus, RefreshCw, Search, Tag } from 'lucide-react';

import {
  Button,
  Input,
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
  layoutDirection: 'TB' | 'LR';
  onSetLayoutDirection: (dir: 'TB' | 'LR') => void;
  searchFilter: string;
  onSetSearchFilter: (s: string) => void;
  showEdgeLabels: boolean;
  onToggleEdgeLabels: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
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
  layoutDirection,
  onSetLayoutDirection,
  searchFilter,
  onSetSearchFilter,
  showEdgeLabels,
  onToggleEdgeLabels,
  onZoomIn,
  onZoomOut,
  onFitView,
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

      {/* Separator */}
      <div className="mx-1 h-6 w-px bg-border" />

      {/* Layout direction toggle */}
      <div className="flex rounded-md border border-border">
        <Button
          aria-label="Top to bottom layout"
          aria-pressed={layoutDirection === 'TB'}
          className="rounded-r-none border-0"
          size="sm"
          variant={layoutDirection === 'TB' ? 'primary' : 'ghost'}
          onClick={() => { onSetLayoutDirection('TB'); }}
        >
          TB
        </Button>
        <Button
          aria-label="Left to right layout"
          aria-pressed={layoutDirection === 'LR'}
          className="rounded-l-none border-0"
          size="sm"
          variant={layoutDirection === 'LR' ? 'primary' : 'ghost'}
          onClick={() => { onSetLayoutDirection('LR'); }}
        >
          LR
        </Button>
      </div>

      {/* Separator */}
      <div className="mx-1 h-6 w-px bg-border" />

      {/* Search filter */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Filter nodes by label"
          className="h-8 w-36 pl-7 text-xs"
          placeholder="Filter nodes..."
          value={searchFilter}
          onChange={(e) => { onSetSearchFilter(e.target.value); }}
        />
      </div>

      {/* Separator */}
      <div className="mx-1 h-6 w-px bg-border" />

      {/* Zoom controls */}
      <Button
        aria-label="Zoom in"
        size="icon"
        variant="ghost"
        onClick={onZoomIn}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        aria-label="Zoom out"
        size="icon"
        variant="ghost"
        onClick={onZoomOut}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        aria-label="Fit view"
        size="icon"
        variant="ghost"
        onClick={onFitView}
      >
        <Maximize className="h-4 w-4" />
      </Button>

      {/* Edge label toggle */}
      <Button
        aria-label={showEdgeLabels ? 'Hide edge labels' : 'Show edge labels'}
        aria-pressed={showEdgeLabels}
        size="icon"
        variant={showEdgeLabels ? 'primary' : 'ghost'}
        onClick={onToggleEdgeLabels}
      >
        <Tag className="h-4 w-4" />
      </Button>

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

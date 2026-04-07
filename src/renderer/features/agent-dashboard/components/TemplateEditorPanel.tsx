/**
 * TemplateEditorPanel — Create / edit a workflow template
 *
 * Schema-driven form covering all WorkflowTemplate sections:
 * identity, branching, team, QA, permissions, guardian.
 * Opens in a Dialog driven by store state.
 */

import { useEffect, useState } from 'react';

import type { WorkflowTemplate } from '@shared/ipc/workflow-templates/schemas';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
  Switch,
  Textarea,
} from '@ui';

import { useAgentDefinitions } from '../api/useWorkflowEngine';
import { useCreateTemplate, useUpdateTemplate, useWorkflowTemplate } from '../api/useWorkflowTemplates';
import { useAgentDashboardStore } from '../store';

// ─── Default form values ─────────────────────────────────────

type TemplateFormValues = Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltin'>;

const DEFAULTS: TemplateFormValues = {
  name: '',
  description: '',
  mode: 'standard',
  branching: {
    featurePrefix: 'feature',
    workPrefix: 'work',
    useWorktrees: true,
  },
  team: {
    maxConcurrentAgents: 3,
    spawnQaPerTask: true,
    enableGuardian: true,
    roles: [],
  },
  qa: {
    runLint: true,
    runTypecheck: true,
    runBuild: false,
    runTests: false,
    maxRounds: 2,
  },
  permissions: {
    allowPush: false,
    allowCreatePr: false,
    allowDeleteBranch: false,
    allowShellExec: false,
  },
  guardian: {
    blockingRules: [],
    warningRules: [],
    maxFileSizeLines: 300,
  },
};

// ─── Component ───────────────────────────────────────────────

export function TemplateEditorPanel() {
  const isEditorOpen = useAgentDashboardStore((s) => s.isEditorOpen);
  const editingTemplateId = useAgentDashboardStore((s) => s.editingTemplateId);
  const closeEditor = useAgentDashboardStore((s) => s.closeEditor);

  const isNew = editingTemplateId === null;
  const { data: existing, isLoading } = useWorkflowTemplate(editingTemplateId);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  const [values, setValues] = useState<TemplateFormValues>(DEFAULTS);

  // Populate form when existing template loads
  useEffect(() => {
    if (existing !== undefined) {
      setValues({
        name: existing.name,
        description: existing.description,
        mode: existing.mode,
        branching: { ...existing.branching },
        team: { ...existing.team, roles: [...existing.team.roles] },
        qa: { ...existing.qa },
        permissions: { ...existing.permissions },
        guardian: {
          ...existing.guardian,
          blockingRules: [...existing.guardian.blockingRules],
          warningRules: [...existing.guardian.warningRules],
        },
      });
    } else if (isNew) {
      setValues(DEFAULTS);
    }
  }, [existing, isNew]);

  function handleClose() {
    closeEditor();
    setValues(DEFAULTS);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isNew) {
      createTemplate.mutate(values, { onSuccess: () => handleClose() });
    } else {
      updateTemplate.mutate(
        { id: editingTemplateId, updates: values },
        { onSuccess: () => handleClose() },
      );
    }
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  function renderContent() {
    if (!isNew && isLoading) {
      return (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="sm" />
        </div>
      );
    }

    return (
      <form id="template-editor-form" className="space-y-6" onSubmit={handleSubmit}>
        <IdentitySection values={values} onChange={setValues} />
        <Separator />
        <BranchingSection values={values} onChange={setValues} />
        <Separator />
        <TeamSection values={values} onChange={setValues} />
        <Separator />
        <QaSection values={values} onChange={setValues} />
        <Separator />
        <PermissionsSection values={values} onChange={setValues} />
        <Separator />
        <GuardianSection values={values} onChange={setValues} />
      </form>
    );
  }

  return (
    <Dialog
      open={isEditorOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>{isNew ? 'New Template' : 'Edit Template'}</DialogTitle>
        </DialogHeader>
        <Separator />
        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 py-4">{renderContent()}</div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="shrink-0 px-6 py-4">
          <Button type="button" variant="outline" disabled={isPending} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="template-editor-form" disabled={isPending}>
            {isPending ? <Spinner size="sm" className="mr-2" /> : null}
            {isNew ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Section helpers ─────────────────────────────────────────

interface SectionProps {
  values: TemplateFormValues;
  onChange: (values: TemplateFormValues) => void;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-sm font-semibold text-foreground">{children}</h3>;
}

function FieldRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-4 ${className ?? ''}`}>{children}</div>;
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      <Label className="cursor-pointer font-normal">{label}</Label>
    </div>
  );
}

// ─── Identity ────────────────────────────────────────────────

function IdentitySection({ values, onChange }: SectionProps) {
  return (
    <div>
      <SectionHeading>Identity</SectionHeading>
      <div className="space-y-4">
        <FieldGroup label="Name">
          <Input
            placeholder="My workflow template"
            required
            value={values.name}
            onChange={(e) => onChange({ ...values, name: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Description">
          <Textarea
            placeholder="Describe what this template is for"
            rows={2}
            value={values.description}
            onChange={(e) => onChange({ ...values, description: e.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="Mode">
          <Select
            value={values.mode}
            onValueChange={(v) =>
              onChange({ ...values, mode: v as WorkflowTemplate['mode'] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="fast-prototype">Fast Prototype</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="pr-review">PR Review</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>
      </div>
    </div>
  );
}

// ─── Branching ───────────────────────────────────────────────

function BranchingSection({ values, onChange }: SectionProps) {
  const { branching } = values;

  function update(patch: Partial<typeof branching>) {
    onChange({ ...values, branching: { ...branching, ...patch } });
  }

  return (
    <div>
      <SectionHeading>Branching</SectionHeading>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Use worktrees</Label>
          <Switch
            checked={branching.useWorktrees}
            onCheckedChange={(v) => update({ useWorktrees: v })}
          />
        </div>
        <FieldRow>
          <FieldGroup label="Feature prefix">
            <Input
              placeholder="feature"
              value={branching.featurePrefix}
              onChange={(e) => update({ featurePrefix: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Work prefix">
            <Input
              placeholder="work"
              value={branching.workPrefix}
              onChange={(e) => update({ workPrefix: e.target.value })}
            />
          </FieldGroup>
        </FieldRow>
      </div>
    </div>
  );
}

// ─── Team ────────────────────────────────────────────────────

function TeamSection({ values, onChange }: SectionProps) {
  const { team } = values;
  const { data: agentDefs, isLoading: isLoadingDefs } = useAgentDefinitions();

  function update(patch: Partial<typeof team>) {
    onChange({ ...values, team: { ...team, ...patch } });
  }

  function toggleRole(slug: string, checked: boolean) {
    const current = team.roles;
    const next = checked ? [...current, slug] : current.filter((r) => r !== slug);
    update({ roles: next });
  }

  const selectedRoles = team.roles;

  return (
    <div>
      <SectionHeading>Team</SectionHeading>
      <div className="space-y-4">
        <FieldGroup label="Max concurrent agents">
          <Input
            type="number"
            min={1}
            max={20}
            value={team.maxConcurrentAgents}
            onChange={(e) => update({ maxConcurrentAgents: Number(e.target.value) })}
          />
        </FieldGroup>
        <div className="space-y-2">
          <CheckboxField
            label="Spawn QA agent per task"
            checked={team.spawnQaPerTask}
            onCheckedChange={(v) => update({ spawnQaPerTask: v })}
          />
          <CheckboxField
            label="Enable guardian agent"
            checked={team.enableGuardian}
            onCheckedChange={(v) => update({ enableGuardian: v })}
          />
        </div>
        <FieldGroup label="Agent roles (leave empty to allow all)">
          {isLoadingDefs ? (
            <div className="flex items-center gap-2 py-1">
              <Spinner size="sm" />
              <Label className="text-muted-foreground font-normal">Loading roles…</Label>
            </div>
          ) : (
            <div className="rounded-md border p-3">
              <div className="grid grid-cols-2 gap-1.5">
                {(agentDefs ?? []).map((def) => (
                  <div key={def.slug} className="flex items-center gap-2" title={def.description}>
                    <Checkbox
                      id={`role-${def.slug}`}
                      checked={selectedRoles.includes(def.slug)}
                      onCheckedChange={(v) => toggleRole(def.slug, v === true)}
                    />
                    <Label
                      htmlFor={`role-${def.slug}`}
                      className="cursor-pointer font-normal text-xs"
                    >
                      {def.slug}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedRoles.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {selectedRoles.length} role{selectedRoles.length === 1 ? '' : 's'} selected
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">All roles eligible</p>
              )}
            </div>
          )}
        </FieldGroup>
      </div>
    </div>
  );
}

// ─── QA ──────────────────────────────────────────────────────

function QaSection({ values, onChange }: SectionProps) {
  const { qa } = values;

  function update(patch: Partial<typeof qa>) {
    onChange({ ...values, qa: { ...qa, ...patch } });
  }

  return (
    <div>
      <SectionHeading>QA Policy</SectionHeading>
      <div className="space-y-4">
        <FieldGroup label="Max QA rounds per task">
          <Input
            type="number"
            min={1}
            max={10}
            value={qa.maxRounds}
            onChange={(e) => update({ maxRounds: Number(e.target.value) })}
          />
        </FieldGroup>
        <div className="space-y-2">
          <CheckboxField
            label="Run lint"
            checked={qa.runLint}
            onCheckedChange={(v) => update({ runLint: v })}
          />
          <CheckboxField
            label="Run typecheck"
            checked={qa.runTypecheck}
            onCheckedChange={(v) => update({ runTypecheck: v })}
          />
          <CheckboxField
            label="Run build"
            checked={qa.runBuild}
            onCheckedChange={(v) => update({ runBuild: v })}
          />
          <CheckboxField
            label="Run tests"
            checked={qa.runTests}
            onCheckedChange={(v) => update({ runTests: v })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Permissions ─────────────────────────────────────────────

function PermissionsSection({ values, onChange }: SectionProps) {
  const { permissions } = values;

  function update(patch: Partial<typeof permissions>) {
    onChange({ ...values, permissions: { ...permissions, ...patch } });
  }

  return (
    <div>
      <SectionHeading>Permissions</SectionHeading>
      <div className="space-y-2">
        <CheckboxField
          label="Allow push to remote"
          checked={permissions.allowPush}
          onCheckedChange={(v) => update({ allowPush: v })}
        />
        <CheckboxField
          label="Allow create PR"
          checked={permissions.allowCreatePr}
          onCheckedChange={(v) => update({ allowCreatePr: v })}
        />
        <CheckboxField
          label="Allow delete branch"
          checked={permissions.allowDeleteBranch}
          onCheckedChange={(v) => update({ allowDeleteBranch: v })}
        />
        <CheckboxField
          label="Allow shell exec"
          checked={permissions.allowShellExec}
          onCheckedChange={(v) => update({ allowShellExec: v })}
        />
      </div>
    </div>
  );
}

// ─── Guardian ────────────────────────────────────────────────

function GuardianSection({ values, onChange }: SectionProps) {
  const { guardian } = values;

  function update(patch: Partial<typeof guardian>) {
    onChange({ ...values, guardian: { ...guardian, ...patch } });
  }

  return (
    <div>
      <SectionHeading>Guardian</SectionHeading>
      <div className="space-y-4">
        <FieldGroup label="Max file size (lines)">
          <Input
            type="number"
            min={1}
            value={guardian.maxFileSizeLines}
            onChange={(e) => update({ maxFileSizeLines: Number(e.target.value) })}
          />
        </FieldGroup>
        <FieldGroup label="Blocking rules (one per line)">
          <Textarea
            placeholder="No raw HTML elements&#10;No hardcoded colors"
            rows={3}
            value={guardian.blockingRules.join('\n')}
            onChange={(e) =>
              update({
                blockingRules: e.target.value
                  .split('\n')
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0),
              })
            }
          />
        </FieldGroup>
        <FieldGroup label="Warning rules (one per line)">
          <Textarea
            placeholder="Component over 300 lines"
            rows={3}
            value={guardian.warningRules.join('\n')}
            onChange={(e) =>
              update({
                warningRules: e.target.value
                  .split('\n')
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0),
              })
            }
          />
        </FieldGroup>
      </div>
    </div>
  );
}

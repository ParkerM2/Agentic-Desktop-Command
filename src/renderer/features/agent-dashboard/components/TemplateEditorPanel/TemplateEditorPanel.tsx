/**
 * TemplateEditorPanel — Create / edit a workflow template
 *
 * Schema-driven form covering all WorkflowTemplate sections:
 * identity, branching, team, QA, permissions, guardian.
 * Opens in a Dialog driven by store state.
 */

import type { WorkflowTemplate } from '@shared/ipc/workflow-templates/schemas';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Heading,
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

import { useTemplateEditorPanel } from './useTemplateEditorPanel';

import type { useAgentDefinitions } from '../../api/useWorkflowEngine';


// ─── Types ─────────────────────────────────────────────────

type TemplateFormValues = Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltin'>;

// ─── Component ───────────────────────────────────────────────

export function TemplateEditorPanel() {
  const {
    isEditorOpen,
    isNew,
    isLoading,
    values,
    setValues,
    isPending,
    agentDefs,
    isLoadingDefs,
    handleClose,
    handleSubmit,
  } = useTemplateEditorPanel();

  function renderContent() {
    if (!isNew && isLoading) {
      return (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="sm" />
        </div>
      );
    }

    return (
      <form className="space-y-6" id="template-editor-form" onSubmit={handleSubmit}>
        <IdentitySection values={values} onChange={setValues} />
        <Separator />
        <BranchingSection values={values} onChange={setValues} />
        <Separator />
        <TeamSection agentDefs={agentDefs} isLoadingDefs={isLoadingDefs} values={values} onChange={setValues} />
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
          <Button disabled={isPending} type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={isPending} form="template-editor-form" type="submit">
            {isPending ? <Spinner className="mr-2" size="sm" /> : null}
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
  return <Heading as="h3" className="mb-3 text-sm">{children}</Heading>;
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
            required
            placeholder="My workflow template"
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

interface TeamSectionProps extends SectionProps {
  agentDefs: ReturnType<typeof useAgentDefinitions>['data'];
  isLoadingDefs: boolean;
}

function TeamSection({ values, onChange, agentDefs, isLoadingDefs }: TeamSectionProps) {
  const { team } = values;

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
            max={20}
            min={1}
            type="number"
            value={team.maxConcurrentAgents}
            onChange={(e) => update({ maxConcurrentAgents: Number(e.target.value) })}
          />
        </FieldGroup>
        <div className="space-y-2">
          <CheckboxField
            checked={team.spawnQaPerTask}
            label="Spawn QA agent per task"
            onCheckedChange={(v) => update({ spawnQaPerTask: v })}
          />
          <CheckboxField
            checked={team.enableGuardian}
            label="Enable guardian agent"
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
                      checked={selectedRoles.includes(def.slug)}
                      id={`role-${def.slug}`}
                      onCheckedChange={(v) => toggleRole(def.slug, v === true)}
                    />
                    <Label
                      className="cursor-pointer font-normal text-xs"
                      htmlFor={`role-${def.slug}`}
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
            max={10}
            min={1}
            type="number"
            value={qa.maxRounds}
            onChange={(e) => update({ maxRounds: Number(e.target.value) })}
          />
        </FieldGroup>
        <div className="space-y-2">
          <CheckboxField
            checked={qa.runLint}
            label="Run lint"
            onCheckedChange={(v) => update({ runLint: v })}
          />
          <CheckboxField
            checked={qa.runTypecheck}
            label="Run typecheck"
            onCheckedChange={(v) => update({ runTypecheck: v })}
          />
          <CheckboxField
            checked={qa.runBuild}
            label="Run build"
            onCheckedChange={(v) => update({ runBuild: v })}
          />
          <CheckboxField
            checked={qa.runTests}
            label="Run tests"
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
          checked={permissions.allowPush}
          label="Allow push to remote"
          onCheckedChange={(v) => update({ allowPush: v })}
        />
        <CheckboxField
          checked={permissions.allowCreatePr}
          label="Allow create PR"
          onCheckedChange={(v) => update({ allowCreatePr: v })}
        />
        <CheckboxField
          checked={permissions.allowDeleteBranch}
          label="Allow delete branch"
          onCheckedChange={(v) => update({ allowDeleteBranch: v })}
        />
        <CheckboxField
          checked={permissions.allowShellExec}
          label="Allow shell exec"
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
            min={1}
            type="number"
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

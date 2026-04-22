/**
 * BodyComposition — Body composition breakdown and measurement logging
 */

import { Pencil, Plus, Scale, Trash2 } from 'lucide-react';

import type { BodyMeasurement } from '@shared/types';

import { RelativeTime } from '@renderer/shared/components/RelativeTime';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  EmptyState,
  Heading,
  Input,
  Label,
  Text,
} from '@ui';

import { MeasurementEditDialog } from '../MeasurementEditDialog';

import { useBodyComposition, useMeasurementHistoryRow } from './useBodyComposition';

// ── Component ────────────────────────────────────────────────

export function BodyComposition() {
  const {
    displayMeasurements,
    latest,
    isFiltered,
    showForm,
    setShowForm,
    weight,
    setWeight,
    bodyFat,
    setBodyFat,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    handleSubmit,
    handleClearFilter,
  } = useBodyComposition();

  return (
    <div className="space-y-4">
      {/* Date-range filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="flex-1">
          <Label className="mb-1" htmlFor="measure-date-from">
            From
          </Label>
          <Input
            id="measure-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Label className="mb-1" htmlFor="measure-date-to">
            To
          </Label>
          <Input
            id="measure-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {isFiltered ? (
          <Button size="sm" type="button" variant="ghost" onClick={handleClearFilter}>
            Clear
          </Button>
        ) : null}
      </div>

      {/* Latest measurements */}
      {latest === null ? (
        <EmptyState
          icon={Scale}
          size="sm"
          title=""
          description={
            isFiltered ? 'No measurements in this date range' : 'No measurements recorded yet'
          }
        />
      ) : (
        <Card>
          <CardContent className="p-4">
            <Heading
              as="h4"
              className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase"
            >
              Latest Measurements
            </Heading>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {latest.weight === undefined ? null : (
                <div>
                  <span className="text-muted-foreground text-xs">Weight</span>
                  <Text className="text-lg font-bold">{String(latest.weight)} kg</Text>
                </div>
              )}
              {latest.bodyFat === undefined ? null : (
                <div>
                  <span className="text-muted-foreground text-xs">Body Fat</span>
                  <Text className="text-lg font-bold">{String(latest.bodyFat)}%</Text>
                </div>
              )}
              {latest.muscleMass === undefined ? null : (
                <div>
                  <span className="text-muted-foreground text-xs">Muscle Mass</span>
                  <Text className="text-lg font-bold">{String(latest.muscleMass)} kg</Text>
                </div>
              )}
              {latest.boneMass === undefined ? null : (
                <div>
                  <span className="text-muted-foreground text-xs">Bone Mass</span>
                  <Text className="text-lg font-bold">{String(latest.boneMass)} kg</Text>
                </div>
              )}
              {latest.waterPercentage === undefined ? null : (
                <div>
                  <span className="text-muted-foreground text-xs">Water</span>
                  <Text className="text-lg font-bold">{String(latest.waterPercentage)}%</Text>
                </div>
              )}
              {latest.visceralFat === undefined ? null : (
                <div>
                  <span className="text-muted-foreground text-xs">Visceral Fat</span>
                  <Text className="text-lg font-bold">{String(latest.visceralFat)}</Text>
                </div>
              )}
            </div>
            <Text className="mt-2" size="sm" variant="muted">
              {latest.date} &middot; {latest.source}
            </Text>
          </CardContent>
        </Card>
      )}

      {/* Add measurement */}
      {showForm ? (
        <Card>
          <CardContent className="p-4">
            <Heading as="h4" className="text-foreground mb-3 text-sm font-medium">
              Log Measurement
            </Heading>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="mb-1" htmlFor="measure-weight">
                  Weight (kg)
                </Label>
                <Input
                  id="measure-weight"
                  placeholder="75.5"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label className="mb-1" htmlFor="measure-bodyfat">
                  Body Fat (%)
                </Label>
                <Input
                  id="measure-bodyfat"
                  placeholder="18.5"
                  type="number"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1"
                disabled={weight === '' && bodyFat === ''}
                type="button"
                onClick={handleSubmit}
              >
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          className="text-primary"
          type="button"
          variant="ghost"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" />
          Log Measurement
        </Button>
      )}

      {/* History */}
      {displayMeasurements.length > 1 ? (
        <Card>
          <Heading
            as="h4"
            className="text-muted-foreground border-border border-b px-4 py-2 text-xs font-medium tracking-wider uppercase"
          >
            History
          </Heading>
          <div className="divide-border divide-y">
            {displayMeasurements.slice(0, 10).map((m) => (
              <MeasurementHistoryRow key={m.id} measurement={m} />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

// ── MeasurementHistoryRow ────────────────────────────────────

interface MeasurementHistoryRowProps {
  measurement: BodyMeasurement;
}

function MeasurementHistoryRow({ measurement: m }: MeasurementHistoryRowProps) {
  const {
    editOpen,
    setEditOpen,
    deleteOpen,
    setDeleteOpen,
    handleDeleteConfirm,
  } = useMeasurementHistoryRow(m.id);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex-1">
          <span className="text-foreground text-sm">{m.date}</span>
          <div className="mt-0.5 flex flex-wrap gap-3">
            {m.weight === undefined ? null : (
              <span className="text-muted-foreground text-xs">{String(m.weight)} kg</span>
            )}
            {m.bodyFat === undefined ? null : (
              <span className="text-muted-foreground text-xs">{String(m.bodyFat)}% fat</span>
            )}
            {m.muscleMass === undefined ? null : (
              <span className="text-muted-foreground text-xs">
                {String(m.muscleMass)} kg muscle
              </span>
            )}
            {m.boneMass === undefined ? null : (
              <span className="text-muted-foreground text-xs">{String(m.boneMass)} kg bone</span>
            )}
            {m.waterPercentage === undefined ? null : (
              <span className="text-muted-foreground text-xs">
                {String(m.waterPercentage)}% water
              </span>
            )}
            {m.visceralFat === undefined ? null : (
              <span className="text-muted-foreground text-xs">
                visceral {String(m.visceralFat)}
              </span>
            )}
            <span className="text-muted-foreground text-xs capitalize">{m.source}</span>
          </div>
          <RelativeTime value={m.createdAt} />
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Edit measurement"
            className="text-muted-foreground hover:text-foreground"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Delete measurement"
            className="text-muted-foreground hover:text-destructive"
            size="icon"
            type="button"
            variant="ghost"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MeasurementEditDialog measurement={m} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete measurement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the measurement from {m.date}. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

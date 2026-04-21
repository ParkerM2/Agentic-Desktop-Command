/**
 * MeasurementEditDialog — Edit an existing body measurement
 */

import type { BodyMeasurement } from '@shared/types';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@ui';

import { useMeasurementEditDialog } from './useMeasurementEditDialog';

// ── Props ────────────────────────────────────────────────────

interface MeasurementEditDialogProps {
  measurement: BodyMeasurement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ────────────────────────────────────────────────

export function MeasurementEditDialog({
  measurement,
  open,
  onOpenChange,
}: MeasurementEditDialogProps) {
  const {
    date,
    setDate,
    weight,
    setWeight,
    bodyFat,
    setBodyFat,
    muscleMass,
    setMuscleMass,
    boneMass,
    setBoneMass,
    waterPercentage,
    setWaterPercentage,
    visceralFat,
    setVisceralFat,
    isSaveDisabled,
    handleSave,
  } = useMeasurementEditDialog({ measurement, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Measurement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date */}
          <div>
            <Label
              className="text-muted-foreground mb-1 block text-xs font-medium"
              htmlFor="edit-measure-date"
            >
              Date
            </Label>
            <Input
              id="edit-measure-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Weight + Body Fat */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-measure-weight"
              >
                Weight (kg)
              </Label>
              <Input
                id="edit-measure-weight"
                placeholder="75.5"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-measure-bodyfat"
              >
                Body Fat (%)
              </Label>
              <Input
                id="edit-measure-bodyfat"
                placeholder="18.5"
                type="number"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
              />
            </div>
          </div>

          {/* Muscle Mass + Bone Mass */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-measure-muscle"
              >
                Muscle Mass (kg)
              </Label>
              <Input
                id="edit-measure-muscle"
                placeholder="35.0"
                type="number"
                value={muscleMass}
                onChange={(e) => setMuscleMass(e.target.value)}
              />
            </div>
            <div>
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-measure-bone"
              >
                Bone Mass (kg)
              </Label>
              <Input
                id="edit-measure-bone"
                placeholder="3.2"
                type="number"
                value={boneMass}
                onChange={(e) => setBoneMass(e.target.value)}
              />
            </div>
          </div>

          {/* Water + Visceral Fat */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-measure-water"
              >
                Water (%)
              </Label>
              <Input
                id="edit-measure-water"
                placeholder="55.0"
                type="number"
                value={waterPercentage}
                onChange={(e) => setWaterPercentage(e.target.value)}
              />
            </div>
            <div>
              <Label
                className="text-muted-foreground mb-1 block text-xs font-medium"
                htmlFor="edit-measure-visceral"
              >
                Visceral Fat
              </Label>
              <Input
                id="edit-measure-visceral"
                placeholder="8"
                type="number"
                value={visceralFat}
                onChange={(e) => setVisceralFat(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isSaveDisabled} type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

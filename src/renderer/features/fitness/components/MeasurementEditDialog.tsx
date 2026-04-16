/**
 * MeasurementEditDialog — Edit an existing body measurement
 */

import { useState } from 'react';

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

import { useUpdateMeasurement } from '../api/useFitness';

// ── Component ────────────────────────────────────────────────

interface MeasurementEditDialogProps {
  measurement: BodyMeasurement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MeasurementEditDialog({
  measurement,
  open,
  onOpenChange,
}: MeasurementEditDialogProps) {
  const updateMeasurement = useUpdateMeasurement();

  const [date, setDate] = useState(measurement.date);
  const [weight, setWeight] = useState(measurement.weight === undefined ? '' : String(measurement.weight));
  const [bodyFat, setBodyFat] = useState(measurement.bodyFat === undefined ? '' : String(measurement.bodyFat));
  const [muscleMass, setMuscleMass] = useState(measurement.muscleMass === undefined ? '' : String(measurement.muscleMass));
  const [boneMass, setBoneMass] = useState(measurement.boneMass === undefined ? '' : String(measurement.boneMass));
  const [waterPercentage, setWaterPercentage] = useState(measurement.waterPercentage === undefined ? '' : String(measurement.waterPercentage));
  const [visceralFat, setVisceralFat] = useState(measurement.visceralFat === undefined ? '' : String(measurement.visceralFat));

  const hasAnyValue =
    weight !== '' ||
    bodyFat !== '' ||
    muscleMass !== '' ||
    boneMass !== '' ||
    waterPercentage !== '' ||
    visceralFat !== '';

  function handleSave() {
    if (!hasAnyValue) return;

    updateMeasurement.mutate(
      {
        id: measurement.id,
        date,
        weight: weight === '' ? undefined : Number(weight),
        bodyFat: bodyFat === '' ? undefined : Number(bodyFat),
        muscleMass: muscleMass === '' ? undefined : Number(muscleMass),
        boneMass: boneMass === '' ? undefined : Number(boneMass),
        waterPercentage: waterPercentage === '' ? undefined : Number(waterPercentage),
        visceralFat: visceralFat === '' ? undefined : Number(visceralFat),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

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
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!hasAnyValue || updateMeasurement.isPending}
            type="button"
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

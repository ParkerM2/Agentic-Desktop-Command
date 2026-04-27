import { useState } from 'react';

import type { BodyMeasurement } from '@shared/types';

import { useUpdateMeasurement } from '../../api/useFitness';
import { useEditDialog } from '../../hooks/useEditDialog';

interface UseMeasurementEditDialogOptions {
  measurement: BodyMeasurement;
  onOpenChange: (open: boolean) => void;
}

export function useMeasurementEditDialog({
  measurement,
  onOpenChange,
}: UseMeasurementEditDialogOptions) {
  const updateMeasurement = useUpdateMeasurement();

  const [date, setDate] = useState(measurement.date);
  const [weight, setWeight] = useState(
    measurement.weight === undefined ? '' : String(measurement.weight),
  );
  const [bodyFat, setBodyFat] = useState(
    measurement.bodyFat === undefined ? '' : String(measurement.bodyFat),
  );
  const [muscleMass, setMuscleMass] = useState(
    measurement.muscleMass === undefined ? '' : String(measurement.muscleMass),
  );
  const [boneMass, setBoneMass] = useState(
    measurement.boneMass === undefined ? '' : String(measurement.boneMass),
  );
  const [waterPercentage, setWaterPercentage] = useState(
    measurement.waterPercentage === undefined ? '' : String(measurement.waterPercentage),
  );
  const [visceralFat, setVisceralFat] = useState(
    measurement.visceralFat === undefined ? '' : String(measurement.visceralFat),
  );

  const { isSaveDisabled, handleSave } = useEditDialog({
    mutation: updateMeasurement,
    buildInput: () => {
      const hasAnyValue =
        weight !== '' ||
        bodyFat !== '' ||
        muscleMass !== '' ||
        boneMass !== '' ||
        waterPercentage !== '' ||
        visceralFat !== '';
      if (!hasAnyValue) return null;
      return {
        id: measurement.id,
        date,
        weight: weight === '' ? undefined : Number(weight),
        bodyFat: bodyFat === '' ? undefined : Number(bodyFat),
        muscleMass: muscleMass === '' ? undefined : Number(muscleMass),
        boneMass: boneMass === '' ? undefined : Number(boneMass),
        waterPercentage: waterPercentage === '' ? undefined : Number(waterPercentage),
        visceralFat: visceralFat === '' ? undefined : Number(visceralFat),
      };
    },
    onClose: () => onOpenChange(false),
  });

  return {
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
  };
}

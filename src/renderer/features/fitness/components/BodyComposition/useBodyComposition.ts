import { useCallback, useState } from 'react';

import type { BodyMeasurement } from '@shared/types';

import { useToday } from '@renderer/shared/hooks/useToday';

import { useDeleteMeasurement, useLogMeasurement, useMeasurements } from '../../api/useFitness';

export function useBodyComposition() {
  const { data: measurements } = useMeasurements(30);
  const logMeasurement = useLogMeasurement();
  const today = useToday();

  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const allMeasurements: BodyMeasurement[] = measurements ?? [];

  const displayMeasurements = allMeasurements.filter((m) => {
    if (dateFrom !== '' && m.date < dateFrom) return false;
    if (dateTo !== '' && m.date > dateTo) return false;
    return true;
  });

  const latest = displayMeasurements.length > 0 ? displayMeasurements[0] : null;
  const isFiltered = dateFrom !== '' || dateTo !== '';

  function handleSubmit(): void {
    const weightNum = weight === '' ? undefined : Number(weight);
    const bodyFatNum = bodyFat === '' ? undefined : Number(bodyFat);

    if (weightNum === undefined && bodyFatNum === undefined) return;

    logMeasurement.mutate(
      {
        date: today,
        weight: weightNum,
        bodyFat: bodyFatNum,
        source: 'manual',
      },
      {
        onSuccess: () => {
          setWeight('');
          setBodyFat('');
          setShowForm(false);
        },
      },
    );
  }

  function handleClearFilter(): void {
    setDateFrom('');
    setDateTo('');
  }

  return {
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
  };
}

export interface MeasurementHistoryRowState {
  editOpen: boolean;
  setEditOpen: (open: boolean) => void;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  handleDeleteConfirm: () => void;
}

export function useMeasurementHistoryRow(measurementId: string): MeasurementHistoryRowState {
  const deleteMeasurement = useDeleteMeasurement();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDeleteConfirm = useCallback(() => {
    deleteMeasurement.mutate(measurementId);
  }, [deleteMeasurement, measurementId]);

  return {
    editOpen,
    setEditOpen,
    deleteOpen,
    setDeleteOpen,
    handleDeleteConfirm,
  };
}

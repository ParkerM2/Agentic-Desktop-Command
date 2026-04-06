import { create } from 'zustand';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Scaffold placeholder
interface MyWorkState {}

export const useMyWorkStore = create<MyWorkState>()(() => ({}));

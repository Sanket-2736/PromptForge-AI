import { create } from "zustand";
import { PlaybookStep } from "@/lib/gemini";

interface PlaybookState {
  playbookId: string;
  steps: PlaybookStep[];
  doneSteps: number;
  totalSteps: number;
  init: (id: string, steps: PlaybookStep[], done: number, total: number) => void;
  setStepCompleted: (stepId: string, completed: boolean) => void;
  revertStep: (stepId: string, completed: boolean) => void;
  syncCounts: (done: number) => void;
}

export const usePlaybookStore = create<PlaybookState>((set) => ({
  playbookId: "",
  steps: [],
  doneSteps: 0,
  totalSteps: 0,

  init: (id, steps, done, total) =>
    set({ playbookId: id, steps, doneSteps: done, totalSteps: total }),

  setStepCompleted: (stepId, completed) =>
    set((s) => {
      const steps = s.steps.map((st) =>
        st.id === stepId ? { ...st, completed } : st
      );
      const doneSteps = steps.filter((st) => st.completed).length;
      return { steps, doneSteps };
    }),

  revertStep: (stepId, completed) =>
    set((s) => {
      const steps = s.steps.map((st) =>
        st.id === stepId ? { ...st, completed } : st
      );
      const doneSteps = steps.filter((st) => st.completed).length;
      return { steps, doneSteps };
    }),

  syncCounts: (done) => set({ doneSteps: done }),
}));

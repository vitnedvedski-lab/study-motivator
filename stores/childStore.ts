/**
 * Zustand store для управления детьми (без persist для MVP)
 */
import { create } from 'zustand';
import { Child } from '../types';

interface ChildState {
  children: Child[];
  selectedChildId: string | null;
  isLoading: boolean;
  selectedChild: () => Child | null;
  setChildren: (children: Child[]) => void;
  addChild: (child: Child) => void;
  updateChild: (id: string, updates: Partial<Child>) => void;
  removeChild: (id: string) => void;
  selectChild: (id: string) => void;
  setLoading: (value: boolean) => void;
  updatePoints: (childId: string, pointsDelta: number) => void;
  updateSavings: (childId: string, amount: number) => void;
  updateStreak: (childId: string, streak: number) => void;
  updateLevel: (childId: string, level: number) => void;
}

const uniqueChildren = (children: Child[]) => {
  const byId = new Map<string, Child>();
  children.forEach((child) => {
    byId.set(child.id, child);
  });
  return Array.from(byId.values());
};

export const useChildStore = create<ChildState>((set, get) => ({
  children: [],
  selectedChildId: null,
  isLoading: false,

  selectedChild: () => {
    const { children, selectedChildId } = get();
    return children.find((c) => c.id === selectedChildId) ?? children[0] ?? null;
  },

  setChildren: (children) => set({ children: uniqueChildren(children) }),

  addChild: (child) =>
    set((state) => {
      const newChildren = uniqueChildren([...state.children, child]);
      return {
        children: newChildren,
        selectedChildId: child.id,
      };
    }),

  updateChild: (id, updates) =>
    set((state) => ({
      children: state.children.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    })),

  removeChild: (id) =>
    set((state) => {
      const newChildren = state.children.filter((c) => c.id !== id);
      return {
        children: newChildren,
        selectedChildId:
          state.selectedChildId === id
            ? newChildren[0]?.id ?? null
            : state.selectedChildId,
      };
    }),

  selectChild: (id) => set({ selectedChildId: id }),
  setLoading: (value) => set({ isLoading: value }),

  updatePoints: (childId, pointsDelta) =>
    set((state) => ({
      children: state.children.map((c) =>
        c.id === childId
          ? {
              ...c,
              totalPoints: Math.max(0, c.totalPoints + Math.max(pointsDelta, 0)),
              availablePoints: pointsDelta < 0 ? Math.max(0, c.availablePoints + pointsDelta) : c.availablePoints,
              updatedAt: Date.now(),
            }
          : c
      ),
    })),

  updateSavings: (childId, amount) =>
    set((state) => ({
      children: state.children.map((c) =>
        c.id === childId
          ? {
              ...c,
              savingsPoints: Math.max(0, c.savingsPoints + amount),
              availablePoints: Math.max(0, c.availablePoints - amount),
              updatedAt: Date.now(),
            }
          : c
      ),
    })),

  updateStreak: (childId, streak) =>
    set((state) => ({
      children: state.children.map((c) =>
        c.id === childId
          ? {
              ...c,
              currentStreak: streak,
              longestStreak: Math.max(c.longestStreak, streak),
              updatedAt: Date.now(),
            }
          : c
      ),
    })),

  updateLevel: (childId, level) =>
    set((state) => ({
      children: state.children.map((c) =>
        c.id === childId ? { ...c, currentLevel: level, updatedAt: Date.now() } : c
      ),
    })),
}));

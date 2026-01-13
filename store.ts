import { create } from 'zustand';
import { GamePhase } from './types';
import * as THREE from 'three';

export interface WordSettings {
  bonus: string;
  penalty: string;
  taboo: string;
}

interface GameState {
  phase: GamePhase;
  score: number;
  highScore: number;
  shakeIntensity: number;
  wordSettings: WordSettings;
  collectedItems: number;
  lastStrike: { id: number; position: THREE.Vector3; timestamp: number }; // Event bus for hits
  glassCracks: number;
  
  setPhase: (phase: GamePhase) => void;
  addScore: (amount: number) => void;
  resetGame: () => void;
  triggerShake: (intensity: number) => void;
  setWordSettings: (settings: WordSettings) => void;
  collectItem: () => void;
  triggerStrike: (position: THREE.Vector3) => void;
  incrementCracks: () => void;
  resetCracks: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: GamePhase.MENU,
  score: 0,
  highScore: 0,
  shakeIntensity: 0,
  collectedItems: 0,
  wordSettings: {
    bonus: '甜粽子',
    penalty: '咸粽子',
    taboo: '蟑螂'
  },
  lastStrike: { id: 0, position: new THREE.Vector3(), timestamp: 0 },
  glassCracks: 0,

  setPhase: (phase) => set({ phase }),
  addScore: (amount) => set((state) => ({ score: state.score + amount })),
  resetGame: () => set((state) => ({ 
    phase: GamePhase.SETUP,
    score: 0,
    collectedItems: 0,
    glassCracks: 0,
    highScore: Math.max(state.score, state.highScore) 
  })),
  triggerShake: (intensity) => {
    set({ shakeIntensity: intensity });
    setTimeout(() => set({ shakeIntensity: 0 }), 200);
  },
  setWordSettings: (settings) => set({ wordSettings: settings }),
  collectItem: () => set((state) => ({ collectedItems: state.collectedItems + 1 })),
  triggerStrike: (position) => set((state) => ({
      lastStrike: { id: state.lastStrike.id + 1, position, timestamp: Date.now() }
  })),
  incrementCracks: () => set((state) => ({ glassCracks: state.glassCracks + 1 })),
  resetCracks: () => set({ glassCracks: 0 })
}));
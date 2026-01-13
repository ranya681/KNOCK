import React, { Suspense } from 'react';
import { GameScene } from './components/GameScene';
import { PhaseGlass } from './components/PhaseGlass';
import { UI } from './components/UI';
import { useGameStore } from './store';
import { GamePhase } from './types';

const App: React.FC = () => {
  const phase = useGameStore(state => state.phase);
  const isGameActive = phase === GamePhase.GLASS || phase === GamePhase.CONVEYOR;

  return (
    <div className={`relative w-full h-full bg-[#FFD8EC] overflow-hidden ${isGameActive ? 'cursor-hidden' : ''}`}>
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </div>

      {/* Phase 1 Overlay */}
      {phase === GamePhase.GLASS && <PhaseGlass />}

      {/* Global UI Layer */}
      <UI />
    </div>
  );
};

export default App;
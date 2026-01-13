import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { GAME_CONFIG } from '../constants';
import { GamePhase } from '../types';
import { playSound } from '../utils/audio';

export const PhaseGlass: React.FC = () => {
  const { setPhase, glassCracks, triggerShake } = useGameStore();
  const [timeLeft, setTimeLeft] = useState(5);
  
  // Timer for fail/force progress if time runs out
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // If time runs out, break glass automatically
          playSound('break');
          triggerShake(1.0);
          setTimeout(() => {
             setPhase(GamePhase.CONVEYOR);
          }, 200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // If broken (controlled by 3D click), hide HUD
  if (glassCracks >= GAME_CONFIG.GLASS_CLICKS_TO_BREAK) {
      return null;
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center select-none touch-none pointer-events-none">
        {/* Text and Timer only - Visuals are now in 3D scene */}
      <div className="absolute top-24 text-4xl font-bold text-pink-500 animate-bounce text-center drop-shadow-md">
        TAP FAST!<br/>
        <span className="text-2xl text-white">Get Points!</span>
      </div>
      
      <div className="absolute bottom-20 text-6xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]">
        {timeLeft}
      </div>
    </div>
  );
};
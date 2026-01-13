import React, { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useGameStore } from '../store';
import { GAME_CONFIG, COLORS } from '../constants';
import { EntityType, GamePhase, BoxState } from '../types';
import { Explosion } from './Particles';
import * as THREE from 'three';
import { playSound } from '../utils/audio';

// Reuse SmartGameEntity wrapper logic but updated for imports
import { GameEntity } from './GameEntity';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      boxGeometry: any;
      lineSegments: any;
      edgesGeometry: any;
      lineBasicMaterial: any;
      cylinderGeometry: any;
      dodecahedronGeometry: any;
      meshBasicMaterial: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        group: any;
        mesh: any;
        planeGeometry: any;
        meshStandardMaterial: any;
        boxGeometry: any;
        lineSegments: any;
        edgesGeometry: any;
        lineBasicMaterial: any;
        cylinderGeometry: any;
        dodecahedronGeometry: any;
        meshBasicMaterial: any;
      }
    }
  }
}

interface SpawnedItem {
  id: string;
  type: EntityType;
  initialZ: number;
  textLabel?: string;
}

interface ExplosionEvent {
  id: string;
  position: [number, number, number];
  color: string;
  count: number;
}

export const PhaseConveyor: React.FC = () => {
  const { setPhase, addScore, triggerShake, wordSettings, collectItem } = useGameStore();
  
  const [items, setItems] = useState<SpawnedItem[]>([]);
  const [explosions, setExplosions] = useState<ExplosionEvent[]>([]);
  const [missStreak, setMissStreak] = useState(0);
  
  const speedRef = useRef(GAME_CONFIG.INITIAL_SPEED);
  const timeSinceSpawnRef = useRef(0);
  const missStreakRef = useRef(0);
  
  // Track ice spawns to limit to 3 per 20s roughly
  const iceCountRef = useRef(0);
  const gameTimeRef = useRef(0);
  const lastIceWindowResetRef = useRef(0);

  useFrame((state, delta) => {
    gameTimeRef.current += delta;

    // Reset ice count every 20 seconds to allow new spawns throughout the game
    if (gameTimeRef.current - lastIceWindowResetRef.current >= 20) {
        iceCountRef.current = 0;
        lastIceWindowResetRef.current = gameTimeRef.current;
    }

    // 1. Increase Speed
    if (speedRef.current < GAME_CONFIG.MAX_SPEED) {
      speedRef.current += GAME_CONFIG.SPEED_INCREMENT * delta;
    }

    // 2. Spawning Logic
    timeSinceSpawnRef.current += delta;
    // Increased numerator from 3.5 to 4.5 to increase gap distance (Lower frequency)
    const spawnInterval = 4.5 / speedRef.current; 

    if (timeSinceSpawnRef.current > spawnInterval) {
      
      let type = EntityType.COIN;
      let label = wordSettings.bonus;
      const rand = Math.random();

      // Spawn Logic Distribution
      // Ice: 8% chance, max 3 per 20s window (resets cyclically)
      if (rand > 0.92 && iceCountRef.current < 3) {
          type = EntityType.ICE;
          label = "宝物"; // Treasure
          iceCountRef.current++;
      } else if (rand > 0.75) {
          // Taboo/Bomb (Approx 20% chance)
          type = EntityType.BOMB;
          label = wordSettings.taboo;
      } else if (rand > 0.50) {
          // Penalty/Heart (25% chance)
          type = EntityType.HEART;
          label = wordSettings.penalty;
      }
      // Else Coin (Approx 50% chance)

      const newItem: SpawnedItem = {
        id: Math.random().toString(36).substr(2, 9),
        type: type,
        initialZ: GAME_CONFIG.SPAWN_Z,
        textLabel: label
      };
      
      setItems(prev => [...prev, newItem]);
      timeSinceSpawnRef.current = 0;
    }
  });

  const onEntityEvent = (id: string, event: string, z: number, type: EntityType) => {
    if (event === 'shake') {
        triggerShake(0.3);
        missStreakRef.current = 0;
        setMissStreak(0);
    } else if (event === 'break') {
        // Box broke (revealed) OR Ice broke
        triggerShake(0.5); 
        setExplosions(prev => [...prev, { id: Math.random().toString(), position: [0, 0, z], color: COLORS.BOX, count: 15 }]);
        missStreakRef.current = 0;
        setMissStreak(0);
    } else if (event === 'collect') { // Tapped the revealed item
        
        if (type === EntityType.ICE) {
            // Collected buff
            collectItem();
            triggerShake(0.4);
            setExplosions(prev => [...prev, { id: Math.random().toString(), position: [0, 0, z], color: "#A5F3FC", count: 25 }]);
        } else if (type === EntityType.COIN) {
            addScore(100);
            triggerShake(0.2);
            setExplosions(prev => [...prev, { id: Math.random().toString(), position: [0, 0, z], color: COLORS.COIN_GOLD, count: 15 }]);
        } else if (type === EntityType.HEART) {
            // Heart break / Penalty: -50 Points
            addScore(-50);
            triggerShake(0.8);
            playSound('break'); // heartbreak sound
            setExplosions(prev => [...prev, { id: Math.random().toString(), position: [0, 0, z], color: COLORS.HEART_RED, count: 20 }]);
        } else if (type === EntityType.BOMB) {
            // Game Over: Instant Death
            setExplosions(prev => [...prev, { id: Math.random().toString(), position: [0, 0, z], color: COLORS.BOMB_RED, count: 30 }]);
            setPhase(GamePhase.GAMEOVER);
            return;
        }

        setItems(prev => prev.filter(i => i.id !== id));
        missStreakRef.current = 0;
        setMissStreak(0);

    } else if (event === 'miss') {
        setItems(prev => prev.filter(i => i.id !== id));
        incrementMissStreak();
    }
  };

  const incrementMissStreak = () => {
      missStreakRef.current += 1;
      setMissStreak(missStreakRef.current);
      if (missStreakRef.current >= 5) {
          setPhase(GamePhase.GAMEOVER);
      }
  };

  return (
    <group>
      {/* Conveyor Belt Floor - Extended for new Camera */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[GAME_CONFIG.LANE_WIDTH + 2, 80]} />
        <meshStandardMaterial color={COLORS.BLUE} />
      </mesh>

      <MovingStripes speed={speedRef} />

      {/* Render Items using a Wrapper to capture events with Z position */}
      {items.map(item => (
          <EntityWrapper 
            key={item.id}
            item={item}
            speedRef={speedRef}
            onEvent={onEntityEvent}
          />
      ))}

      {/* Streak Warning */}
      {missStreak > 2 && (
         <Text position={[0, 8, -5]} fontSize={1} color="#FF6B6B" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="white">
             {`警告: 漏掉 ${missStreak}/5 !`}
         </Text>
      )}

      {/* Particles */}
      {explosions.map(ex => (
        <Explosion 
            key={ex.id} 
            position={ex.position} 
            color={ex.color} 
            count={ex.count}
            onComplete={() => setExplosions(prev => prev.filter(e => e.id !== ex.id))}
        />
      ))}
    </group>
  );
};

// Moving Stripes
const MovingStripes: React.FC<{ speed: React.MutableRefObject<number> }> = ({ speed }) => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state, delta) => {
        if (ref.current) {
            (ref.current.material as THREE.MeshStandardMaterial).map!.offset.y -= delta * speed.current * 0.1;
        }
    });
    const texture = new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABZJREFUeNpi2r9//38gYGAEESAAgwADAAgcAvvmsVTOAAAAAElFTkSuQmCC');
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 10);
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.49, 0]}>
            <planeGeometry args={[3, 80]} />
            <meshStandardMaterial map={texture} transparent opacity={0.3} color={COLORS.MINT} />
        </mesh>
    )
}

// Wrapper to handle frame updates and event passing
const EntityWrapper: React.FC<{
    item: SpawnedItem,
    speedRef: React.MutableRefObject<number>,
    onEvent: (id: string, event: string, z: number, type: EntityType) => void
}> = ({ item, speedRef, onEvent }) => {
    const zPosRef = useRef(item.initialZ);
    
    // We render the actual GameEntity here but intercept callbacks
    // to inject the current Z position which we track in this wrapper's useFrame
    
    useFrame((state, delta) => {
        zPosRef.current += speedRef.current * delta;
        if (zPosRef.current > GAME_CONFIG.DESPAWN_Z) {
            onEvent(item.id, 'miss', zPosRef.current, item.type);
        }
    });

    return (
        <GameEntity
            id={item.id}
            type={item.type}
            positionZ={item.initialZ} // GameEntity handles its own movement from initial
            speed={speedRef.current}
            textLabel={item.textLabel}
            onInteraction={(id, action) => {
                // Pass the action directly as it matches the types expected
                onEvent(id, action, zPosRef.current, item.type); 
            }}
            onDie={(id) => {
                // This would be the 'miss' event from the entity itself if it tracks it
                onEvent(id, 'miss', zPosRef.current, item.type);
            }}
        />
    );
};
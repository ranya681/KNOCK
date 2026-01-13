import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxState, EntityType } from '../types';
import { COLORS, GAME_CONFIG } from '../constants';
import { useGameStore } from '../store';
import * as THREE from 'three';
import { Text, Extrude } from '@react-three/drei';
import { playSound } from '../utils/audio';

const heartShape = new THREE.Shape();
const x = 0, y = 0;
heartShape.moveTo(x + 0.25, y + 0.25);
heartShape.bezierCurveTo(x + 0.25, y + 0.25, x + 0.20, y, x, y);
heartShape.bezierCurveTo(x - 0.30, y, x - 0.30, y + 0.35, x - 0.30, y + 0.35);
heartShape.bezierCurveTo(x - 0.30, y + 0.55, x - 0.10, y + 0.77, x + 0.25, y + 0.95);
heartShape.bezierCurveTo(x + 0.60, y + 0.77, x + 0.80, y + 0.55, x + 0.80, y + 0.35);
heartShape.bezierCurveTo(x + 0.80, y + 0.35, x + 0.80, y, x + 0.50, y);
heartShape.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);

const heartExtrudeSettings = { depth: 0.2, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.05, bevelThickness: 0.05 };

interface GameEntityProps {
  id: string;
  type: EntityType; 
  positionZ: number;
  speed: number;
  textLabel?: string;
  onInteraction: (id: string, action: 'shake' | 'break' | 'collect') => void;
  onDie: (id: string) => void;
}

export const GameEntity: React.FC<GameEntityProps> = ({ 
  id, type, positionZ: initialZ, speed, textLabel, onInteraction, onDie
}) => {
  const { lastStrike } = useGameStore(); 
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const heartRef = useRef<THREE.Group>(null);
  
  const [boxState, setBoxState] = useState<BoxState>(BoxState.INTACT);
  const [isRevealed, setIsRevealed] = useState(false); 
  const [isIceBroken, setIsIceBroken] = useState(false);
  const [scale, setScale] = useState(1);
  const [flash, setFlash] = useState(0);
  
  const lastProcessedStrikeId = useRef(0);
  
  const tapHistory = useRef<number[]>([]);
  const sustainTimer = useRef(0); 
  const [iceProgress, setIceProgress] = useState(0);
  
  const zPosRef = useRef(initialZ);
  
  const boxColor = useMemo(() => {
    switch(boxState) {
      case BoxState.CRACKED_1: return COLORS.BOX_CRACKED_1;
      case BoxState.CRACKED_2: return COLORS.BOX_CRACKED_2;
      default: return COLORS.BOX;
    }
  }, [boxState]);

  useEffect(() => {
      if (lastStrike.id > lastProcessedStrikeId.current && groupRef.current) {
          lastProcessedStrikeId.current = lastStrike.id;
          
          const myPos = groupRef.current.position;
          const dist = myPos.distanceTo(lastStrike.position);
          
          // Updated radius for larger box
          if (dist < 1.5) {
              processHit();
          }
      }
  }, [lastStrike]);

  const processHit = () => {
    setScale(1.15); // Slightly less aggressive scale pop as box is big
    setFlash(0.5);
    
    if (!isRevealed) {
        if (boxState < BoxState.CRACKED_2) {
            setBoxState(prev => prev + 1);
            playSound('knock');
            onInteraction(id, 'shake'); 
        } else {
            setIsRevealed(true);
            playSound('break');
            onInteraction(id, 'break'); 
            setScale(1.3); 
        }
        return;
    }

    if (type === EntityType.ICE && !isIceBroken) {
        tapHistory.current.push(Date.now());
        playSound('glass');
        onInteraction(id, 'shake');
        return;
    }

    if (type === EntityType.ICE) playSound('coin');
    else if (type === EntityType.COIN) playSound('coin');
    else if (type === EntityType.HEART) playSound('glass');
    else if (type === EntityType.BOMB) playSound('bomb');
    
    onInteraction(id, 'collect');
  };

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    zPosRef.current += speed * delta;
    groupRef.current.position.z = zPosRef.current;

    if (zPosRef.current > GAME_CONFIG.DESPAWN_Z) {
        onDie(id);
    }

    if (isRevealed && meshRef.current) {
      if (type !== EntityType.BOMB) {
          meshRef.current.rotation.y += delta * 2;
      }
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 6) * 0.1;
    }
    
    if (isRevealed && type === EntityType.HEART && heartRef.current) {
         const heartbeat = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.15;
         heartRef.current.scale.setScalar(1.2 * heartbeat);
    }
    
    if (isRevealed && type === EntityType.BOMB && meshRef.current) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
        meshRef.current.scale.setScalar(pulse);
    }

    if (type === EntityType.ICE && isRevealed && !isIceBroken) {
        const now = Date.now();
        tapHistory.current = tapHistory.current.filter(t => now - t < 1000);
        const cps = tapHistory.current.length;

        if (cps >= 5) {
            sustainTimer.current = Math.min(0.8, sustainTimer.current + delta);
            if (meshRef.current) meshRef.current.position.x = (Math.random() - 0.5) * 0.15;
        } else {
            sustainTimer.current = Math.max(0, sustainTimer.current - delta * 2.0);
            if (meshRef.current) meshRef.current.position.x = 0;
        }

        const progress = sustainTimer.current / 0.8;
        setIceProgress(progress);

        if (progress >= 1.0) {
            setIsIceBroken(true);
            playSound('break');
            onInteraction(id, 'break');
            if (meshRef.current) meshRef.current.position.x = 0;
        }
    }

    if (scale > 1) {
      setScale(s => Math.max(1, s - delta * 15));
      if (meshRef.current && type !== EntityType.HEART) meshRef.current.scale.setScalar(scale);
    }
    if (flash > 0) setFlash(f => Math.max(0, f - delta * 15));
  });

  const RenderText = () => (
      textLabel ? (
        <Text position={[0, 2.0, 0]} fontSize={0.8} color="#5D4E60" anchorX="center" anchorY="middle" outlineWidth={0.06} outlineColor="white">
            {textLabel}
        </Text>
      ) : null
  );

  const showBox = !isRevealed;
  const showIce = isRevealed && type === EntityType.ICE && !isIceBroken;
  const showItem = isRevealed && (type !== EntityType.ICE || isIceBroken);

  // Scaled Up Box (1.5 -> 1.8)
  const boxSize = 1.8;

  return (
    <group ref={groupRef} position={[0, 0, initialZ]}>
      {showBox && (
        <mesh ref={meshRef} position={[0, 0.6, 0]}>
          <boxGeometry args={[boxSize, boxSize, boxSize]} />
          <meshStandardMaterial color={boxColor} emissive="white" emissiveIntensity={flash} />
          {boxState >= BoxState.CRACKED_1 && (
             <lineSegments position={[0,0,boxSize/2 + 0.01]} scale={0.7}>
                <edgesGeometry args={[new THREE.BoxGeometry(boxSize,boxSize,0.1)]} />
                <lineBasicMaterial color="#E6C68F" />
             </lineSegments>
          )}
          {boxState >= BoxState.CRACKED_2 && (
             <lineSegments position={[0,0,boxSize/2 + 0.01]} scale={0.9} rotation={[0,0,0.5]}>
                <edgesGeometry args={[new THREE.BoxGeometry(boxSize*0.9,boxSize*0.9,0.1)]} />
                <lineBasicMaterial color="#E6C68F" />
             </lineSegments>
          )}
          <Text position={[0, 0, boxSize/2 + 0.1]} fontSize={1.2} color={COLORS.TEXT_DARK}>?</Text>
        </mesh>
      )}

      {showIce && (
          <mesh ref={meshRef} position={[0, 0.6, 0]}>
             <boxGeometry args={[1.9, 1.9, 1.9]} />
             <meshStandardMaterial color="#A5F3FC" transparent opacity={0.9 - (iceProgress * 0.5)} roughness={0.1} emissive="#E0F2FE" emissiveIntensity={flash + (iceProgress * 0.5)} />
             <lineSegments scale={1.05}>
                 <edgesGeometry args={[new THREE.DodecahedronGeometry(0.9)]} />
                 <lineBasicMaterial color="white" transparent opacity={0.8} />
             </lineSegments>
             <Text position={[0, 0, 1.0]} fontSize={1.0} color="white">❄️</Text>
          </mesh>
      )}

      {showItem && (
        <mesh ref={meshRef} position={[0, 0.5, 0]}>
          <RenderText />
          {(() => {
             // Items scaled up slightly to match box
             if (type === EntityType.ICE) {
                 return (
                     <group scale={1.2}>
                        <mesh position={[0, -0.2, 0]}>
                           <boxGeometry args={[1.0, 0.6, 0.8]} />
                           <meshStandardMaterial color="#8B4513" />
                        </mesh>
                        <mesh position={[0, 0.1, 0]} rotation={[0, Math.PI/2, 0]}>
                           <cylinderGeometry args={[0.4, 0.4, 1.0, 16, 1, false, 0, Math.PI]} />
                           <meshStandardMaterial color="#A0522D" />
                        </mesh>
                        <mesh position={[0, 0.0, 0.4]} rotation={[0, 0, 0]}>
                           <boxGeometry args={[0.2, 0.3, 0.1]} />
                           <meshStandardMaterial color="gold" />
                        </mesh>
                     </group>
                 )
             }
             if (type === EntityType.COIN) {
                 return (
                    <group scale={1.2}>
                        <cylinderGeometry args={[1.0, 1.0, 0.3, 32]} rotation={[Math.PI/2, 0, 0]} />
                        <meshStandardMaterial color={COLORS.COIN_GOLD} metalness={0.9} roughness={0.1} emissive="white" emissiveIntensity={flash} />
                        <Text position={[0, 0.3, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={1.2} color="#B8860B">¥</Text>
                    </group>
                 );
             }
             if (type === EntityType.HEART) {
                 return (
                    <group ref={heartRef} rotation={[Math.PI, 0, 0]} position={[-0.25, 1.2, 0]} scale={1.4}>
                        <Extrude args={[heartShape, heartExtrudeSettings]}>
                             <meshStandardMaterial color={COLORS.HEART_RED} emissive="#FF88AA" emissiveIntensity={0.6} />
                        </Extrude>
                        <Text position={[0.25, 0.5, 0.3]} rotation={[Math.PI, 0, 0]} fontSize={0.6} color="white">💔</Text>
                    </group>
                 );
             }
             if (type === EntityType.BOMB) {
                 return (
                    <group scale={1.3}>
                        <mesh>
                            <dodecahedronGeometry args={[0.7, 1]} />
                            <meshStandardMaterial color="#111" metalness={0.5} roughness={0.6} />
                        </mesh>
                        {Array.from({length: 8}).map((_, i) => (
                             <mesh key={i} rotation={[Math.random()*Math.PI, Math.random()*Math.PI, 0]}>
                                 <coneGeometry args={[0.1, 1.6, 8]} />
                                 <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={1} />
                             </mesh>
                        ))}
                        <Text position={[0, 0, 0.8]} fontSize={0.8} color="red">Danger</Text>
                    </group>
                 );
             }
          })()}
        </mesh>
      )}
    </group>
  );
};
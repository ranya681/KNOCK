import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, Text } from '@react-three/drei';
import { useGameStore } from '../store';
import { COLORS, GAME_CONFIG } from '../constants';
import { GamePhase } from '../types';
import { PhaseConveyor } from './PhaseConveyor';
import { Hammer } from './Hammer';
import { playSound } from '../utils/audio';
import * as THREE from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      color: any;
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      mesh: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      meshPhysicalMaterial: any;
      fog: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        color: any;
        ambientLight: any;
        directionalLight: any;
        pointLight: any;
        mesh: any;
        planeGeometry: any;
        meshStandardMaterial: any;
        meshPhysicalMaterial: any;
        fog: any;
      }
    }
  }
}

const CameraController = () => {
    const { shakeIntensity } = useGameStore();
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    
    // Updated Camera: Higher Y (12 -> 14), steeper angle
    // Looking at Z -5 to see more of the path ahead
    const originalPos = useRef(new THREE.Vector3(0, 14, 12));
    const lookAtTarget = new THREE.Vector3(0, 0, -5);

    useFrame(() => {
        if (cameraRef.current && shakeIntensity > 0) {
            const shakeX = (Math.random() - 0.5) * shakeIntensity;
            const shakeY = (Math.random() - 0.5) * shakeIntensity;
            cameraRef.current.position.set(
                originalPos.current.x + shakeX,
                originalPos.current.y + shakeY,
                originalPos.current.z
            );
            cameraRef.current.lookAt(lookAtTarget);
        } else if (cameraRef.current) {
            cameraRef.current.position.copy(originalPos.current);
            cameraRef.current.lookAt(lookAtTarget);
        }
    });

    return (
        <PerspectiveCamera
            ref={cameraRef}
            makeDefault
            position={[0, 14, 12]}
            fov={40} // Reduced FOV slightly for better top-down perspective without distortion
            near={0.1}
            far={100}
        />
    );
};

// New 3D Glass Overlay Component
const GlassOverlay = () => {
    const { glassCracks, incrementCracks, addScore, triggerShake, setPhase } = useGameStore();
    const { viewport, camera } = useThree();
    
    const handleGlassClick = (e: any) => {
        e.stopPropagation();
        incrementCracks();
        addScore(100);
        playSound('glass');
        triggerShake(0.1);
        
        if (glassCracks + 1 >= GAME_CONFIG.GLASS_CLICKS_TO_BREAK) {
             playSound('break');
             triggerShake(1.0);
             setTimeout(() => {
                 setPhase(GamePhase.CONVEYOR);
             }, 200);
        }
    };

    const opacity = Math.max(0, 1 - (glassCracks / GAME_CONFIG.GLASS_CLICKS_TO_BREAK));
    
    if (glassCracks >= GAME_CONFIG.GLASS_CLICKS_TO_BREAK && opacity <= 0) return null;

    return (
        <group position={[0, 6, 0]} rotation={[-Math.PI/2, 0, 0]} onPointerDown={handleGlassClick}>
             {/* The Glass */}
             <mesh>
                 <planeGeometry args={[30, 40]} />
                 <meshPhysicalMaterial 
                    color="white"
                    transmission={0.9} // Glass-like
                    opacity={1}
                    transparent
                    roughness={0.2}
                    thickness={0.5}
                    clearcoat={1}
                 />
             </mesh>
             
             {/* Frosting / Opacity layer that fades */}
             <mesh position={[0, 0, 0.01]}>
                 <planeGeometry args={[30, 40]} />
                 <meshStandardMaterial 
                    color="#E0F2FE"
                    transparent
                    opacity={0.6 * opacity} 
                    roughness={0.8}
                 />
             </mesh>

             {/* Cracks */}
             {glassCracks > 0 && (
                 <group position={[0, 0, 0.02]}>
                     {Array.from({ length: Math.min(glassCracks, 10) }).map((_, i) => (
                         <mesh key={i} position={[(Math.random()-0.5)*10, (Math.random()-0.5)*15, 0]} rotation={[0, 0, Math.random() * Math.PI]}>
                             <planeGeometry args={[0.2, 4]} />
                             <meshBasicMaterial color="white" transparent opacity={0.8} />
                         </mesh>
                     ))}
                     {Array.from({ length: Math.min(glassCracks, 10) }).map((_, i) => (
                         <mesh key={`c2-${i}`} position={[(Math.random()-0.5)*10, (Math.random()-0.5)*15, 0]} rotation={[0, 0, Math.random() * Math.PI]}>
                             <circleGeometry args={[0.5, 6]} />
                             <meshBasicMaterial color="white" transparent opacity={0.6} wireframe />
                         </mesh>
                     ))}
                 </group>
             )}
        </group>
    )
}

export const GameScene: React.FC = () => {
  const { phase } = useGameStore();

  return (
    <Canvas shadows dpr={[1, 2]}>
      <color attach="background" args={[COLORS.PINK]} />
      {/* Fog matched to background to hide spawn area */}
      <fog attach="fog" args={[COLORS.PINK, 20, 50]} />
      
      <CameraController />
      
      {/* Lights */}
      <ambientLight intensity={1.1} />
      <directionalLight 
        position={[10, 20, 5]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
      <pointLight position={[-10, 5, -5]} color={COLORS.MINT} intensity={0.5} />

      {/* Game Content */}
      {phase === GamePhase.CONVEYOR && <PhaseConveyor />}
      
      {/* The Glass Phase Visuals (Now 3D!) */}
      {phase === GamePhase.GLASS && <GlassOverlay />}

      {/* Custom Cursor - Rendered last, physically closest to camera logic handled in Hammer */}
      <Hammer />

      {/* Background/Floor for Menu/Setup */}
      {(phase === GamePhase.MENU || phase === GamePhase.SETUP) && (
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0,-2,0]}>
             <planeGeometry args={[100, 100]} />
             <meshStandardMaterial color={COLORS.BLUE} />
          </mesh>
      )}

      {/* Environment for reflections */}
      <Environment preset="city" />
    </Canvas>
  );
};
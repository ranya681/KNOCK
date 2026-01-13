import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { GamePhase } from '../types';
import { playSound } from '../utils/audio';

export const Hammer: React.FC = () => {
  const { phase, triggerStrike } = useGameStore();
  const { camera } = useThree();
  
  const groupRef = useRef<THREE.Group>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const strikeFaceRef = useRef<THREE.Mesh>(null);

  // Animation State
  const animTime = useRef(100); 
  const targetPos = new THREE.Vector3();

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
        // Play Sound IMMEDIATELY on every click
        playSound('knock');

        // Reset Animation
        animTime.current = 0;

        // Calculate Strike logic
        if (strikeFaceRef.current) {
            const headWorldPos = new THREE.Vector3();
            strikeFaceRef.current.getWorldPosition(headWorldPos);

            const direction = headWorldPos.clone().sub(camera.position).normalize();

            // Intersect with Logic Plane (Y = 0.5)
            const logicY = 0.5;
            if (Math.abs(direction.y) > 0.001) {
                const t = (logicY - camera.position.y) / direction.y;
                const strikePoint = camera.position.clone().add(direction.multiplyScalar(t));
                triggerStrike(strikePoint);
            }
        }
    };
    
    // Use true capture to ensure we get the event before 3D scene might stop propagation
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [camera, triggerStrike]);

  useFrame((state, delta) => {
    if (!groupRef.current || !pivotRef.current) return;

    // 1. Position: FIXED DISTANCE from Camera
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const spriteDistance = 10; 
    
    targetPos.copy(state.camera.position).add(state.raycaster.ray.direction.multiplyScalar(spriteDistance));
    groupRef.current.position.copy(targetPos);
    
    // 2. Rotation: LOOK AT CAMERA (Strict 2D Sprite Effect)
    groupRef.current.lookAt(state.camera.position);

    // 3. Animation: "Bow" 30 degrees (Knock)
    animTime.current += delta * 25; 
    const t = Math.min(animTime.current, 1.0);
    
    // Base Orientation: Handle Bottom-Right, Red Face Bottom-Left
    const baseRotZ = Math.PI / 4; // 45 degrees

    // "Bow head to the left/low by 30 degrees"
    // 30 degrees = PI / 6
    // We rotate CCW (+) to swing the red face (Left side) downwards/inwards.
    const maxSwing = Math.PI / 6;
    
    let currentSwing = 0;
    if (t < 0.2) {
        // Strike Phase (Fast)
        const p = t / 0.2;
        // Ease In Cubic for punchy feel
        currentSwing = THREE.MathUtils.lerp(0, maxSwing, p * p * p); 
    } else {
        // Recovery Phase (Elastic)
        const p = (t - 0.2) / 0.8;
        // Elastic bounce back
        const elastic = 1 - Math.pow(1 - p, 4); 
        currentSwing = THREE.MathUtils.lerp(maxSwing, 0, elastic);
    }

    // Apply strict Z rotation. No X/Y rotation to keep 2D look.
    pivotRef.current.rotation.set(0, 0, baseRotZ + currentSwing);
  });

  const isVisible = phase === GamePhase.GLASS || phase === GamePhase.CONVEYOR;

  return (
    <group ref={groupRef} visible={isVisible} renderOrder={9999}>
      <group ref={pivotRef} scale={0.5}> 
        
        {/* Geometry Container - Pivot is at (0,0,0) which is the Mouse position */}
        
        {/* 1. Handle (Yellow) */}
        <mesh position={[0, -0.6, 0]} raycast={null}>
            <cylinderGeometry args={[0.09, 0.11, 1.2, 16]} />
            <meshStandardMaterial color="#F8FFD0" roughness={0.5} />
            <mesh position={[0, -0.6, 0]}>
                <sphereGeometry args={[0.11]} />
                <meshStandardMaterial color="#F8FFD0" />
            </mesh>
        </mesh>
        
        {/* 2. Neck (Brown) */}
        <mesh position={[0, 0.1, 0]} raycast={null}>
             <cylinderGeometry args={[0.1, 0.1, 0.3, 16]} />
             <meshStandardMaterial color="#8B5A2B" roughness={0.8} />
        </mesh>

        {/* 3. Head Group (Blue) */}
        <group position={[0, 0.35, 0]}>
            
            {/* Main Blue Cylinder - Laid flat along X axis */}
            <mesh rotation={[0, 0, Math.PI/2]} raycast={null}>
                <cylinderGeometry args={[0.45, 0.45, 0.8, 32]} />
                <meshStandardMaterial color="#4A90E2" metalness={0.2} roughness={0.2} />
            </mesh>
            
            {/* RED FACE (Striking End) -> Negative X direction */}
            <mesh ref={strikeFaceRef} position={[-0.41, 0, 0]} rotation={[0, 0, Math.PI/2]} raycast={null}>
                <cylinderGeometry args={[0.42, 0.45, 0.05, 32]} />
                <meshStandardMaterial color="#FF6B6B" emissive="#FF0000" emissiveIntensity={0.2} />
            </mesh>
            
            {/* White Ring Detail on Red Side */}
             <mesh position={[-0.42, 0, 0]} rotation={[0, 0, Math.PI/2]} raycast={null}>
                 <ringGeometry args={[0.2, 0.35, 32]} />
                 <meshBasicMaterial color="white" transparent opacity={0.4} />
            </mesh>

            {/* GREEN FACE (Safe End) -> Positive X direction */}
            <mesh position={[0.41, 0, 0]} rotation={[0, 0, Math.PI/2]} raycast={null}>
                <cylinderGeometry args={[0.45, 0.42, 0.05, 32]} />
                <meshStandardMaterial color="#CDFFE7" />
            </mesh>
            
            {/* REMOVED: Green Ring Detail as requested (Marker lines) */}

        </group>

      </group>
    </group>
  );
};
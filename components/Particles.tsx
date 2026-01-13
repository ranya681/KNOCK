import React, { useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
    }
  }
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        instancedMesh: any;
        boxGeometry: any;
        meshStandardMaterial: any;
      }
    }
  }
}

interface ParticlesProps {
  position: [number, number, number];
  count?: number;
  color?: string;
  onComplete?: () => void;
}

// A one-shot particle explosion
export const Explosion: React.FC<ParticlesProps> = ({ position, count = 10, color = 'white', onComplete }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = new THREE.Object3D();
  const particles = useRef<{ velocity: THREE.Vector3; life: number }[]>([]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    const tempParticles = [];
    for (let i = 0; i < count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(Math.random() * 0.2 + 0.1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, new THREE.Color(color));
      
      tempParticles.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        life: 1.0
      });
    }
    particles.current = tempParticles;
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count, color]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    let active = false;
    
    particles.current.forEach((particle, i) => {
      if (particle.life > 0) {
        active = true;
        particle.life -= delta * 2; // Fade speed
        
        // Read current matrix
        meshRef.current!.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        
        // Update position
        dummy.position.addScaledVector(particle.velocity, delta);
        dummy.scale.multiplyScalar(0.9); // Shrink
        
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      } else {
        // Hide
        meshRef.current!.setMatrixAt(i, new THREE.Matrix4().makeScale(0,0,0));
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    
    if (!active && onComplete) {
      onComplete();
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} toneMapped={false} transparent opacity={0.8} />
    </instancedMesh>
  );
};
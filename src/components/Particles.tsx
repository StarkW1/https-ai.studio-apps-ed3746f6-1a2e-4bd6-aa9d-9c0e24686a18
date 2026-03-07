import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Particles({ 
  count = 30000, 
  targetPositions,
  targetColors,
  scaleRef,
  rotationRef
}: { 
  count?: number, 
  targetPositions: Float32Array | null,
  targetColors: Float32Array | null,
  scaleRef: React.MutableRefObject<number>,
  rotationRef: React.MutableRefObject<[number, number]>
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  
  // Initial state
  const initialPositions = useMemo(() => new Float32Array(count * 3), [count]);
  const initialColors = useMemo(() => new Float32Array(count * 3).fill(1), [count]);

  useFrame((state, delta) => {
    if (!pointsRef.current || !geometryRef.current || !targetPositions || !targetColors) return;
    
    const positions = geometryRef.current.attributes.position.array as Float32Array;
    const colors = geometryRef.current.attributes.color.array as Float32Array;
    let needsUpdatePos = false;
    let needsUpdateCol = false;
    
    const dt = Math.min(delta, 0.1);
    const lerpFactor = 1.0 - Math.pow(0.001, dt);
    
    for (let i = 0; i < count * 3; i++) {
      // Position lerp
      const diffP = targetPositions[i] - positions[i];
      if (Math.abs(diffP) > 0.001) {
        positions[i] += diffP * lerpFactor;
        needsUpdatePos = true;
      }

      // Color lerp
      const diffC = targetColors[i] - colors[i];
      if (Math.abs(diffC) > 0.005) {
        colors[i] += diffC * lerpFactor;
        needsUpdateCol = true;
      }
    }
    
    if (needsUpdatePos) geometryRef.current.attributes.position.needsUpdate = true;
    if (needsUpdateCol) geometryRef.current.attributes.color.needsUpdate = true;
    
    // Auto rotation + manual rotation
    rotationRef.current[1] += dt * 0.1; // Auto rotate slowly on Y axis
    pointsRef.current.rotation.x += (rotationRef.current[0] - pointsRef.current.rotation.x) * 0.1;
    pointsRef.current.rotation.y += (rotationRef.current[1] - pointsRef.current.rotation.y) * 0.1;
    
    const targetScale = scaleRef.current;
    pointsRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), dt * 5);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={initialPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={initialColors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

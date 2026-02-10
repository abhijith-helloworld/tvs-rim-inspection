"use client";

import { useLoader, useFrame } from "@react-three/fiber";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";
import { useRef } from "react";

interface WheelSTLProps {
  color: string;
  scale?: number;
}

export default function WheelSTL({
  color,
  scale = 0.015, // 🔍 zoom (bigger scale)
}: WheelSTLProps) {
  const geometry = useLoader(
    STLLoader,
    "/models/Untitled.stl"
  ) as THREE.BufferGeometry;

  geometry.center();

  const meshRef = useRef<THREE.Mesh>(null!);

  // 🔄 Auto rotate
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      scale={scale}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        metalness={0.6}
        roughness={0.3}
      />
    </mesh>
  );
}

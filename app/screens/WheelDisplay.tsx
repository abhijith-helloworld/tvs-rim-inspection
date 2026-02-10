"use client";

import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import WheelSTL from "./WheelSTL";

interface WheelDisplayProps {
  selectedSize: number;
  selectedColor: string;
  isAnimating: boolean;
}

export const WheelDisplay: React.FC<WheelDisplayProps> = ({
  selectedSize,
  selectedColor,
  isAnimating,
}) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setRotation((prev) => prev + 0.02);
    }, 16);

    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <div className="bg-dark-card rounded-2xl p-6 h-[420px]">
      <h3 className="text-xl font-semibold mb-4">Inspection View</h3>

      <Canvas
        camera={{ position: [0, 0, 5], fov: 15 }}
        shadows
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />

        {/* STL Model */}
        <WheelSTL
          color={selectedColor}
          scale={selectedSize * 0.002}
        //   rotationY={rotation}
        />

        <OrbitControls enableZoom enableRotate />
      </Canvas>
    </div>
  );
};

"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import type React from "react";

interface ShaderBackgroundProps {
  children: React.ReactNode;
}

export default function ShaderBackground({ children }: ShaderBackgroundProps) {
  return (
    <div
      className="fixed inset-0 w-full h-full bg-red-950 overflow-hidden"
      style={{
        width: "100vw",
        height: "100vh",
        left: 0,
        top: 0,
        margin: 0,
        padding: 0,
      }}
    >
      <svg className="absolute inset-0 w-0 h-0">
        <defs>
          <filter
            id="glass-effect"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.02
                      0 1 0 0 0.02
                      0 0 1 0 0.05
                      0 0 0 0.9 0"
              result="tint"
            />
          </filter>
          <filter
            id="gooey-filter"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
        </defs>
      </svg>

      <MeshGradient
        className="absolute w-full h-full"
        style={{
          left: "-10px",
          top: "-10px",
          width: "calc(100% + 20px)",
          height: "calc(100% + 20px)",
        }}
        colors={["#1a0f0f", "#dc2626", "#fbbf24", "#7f1d1d", "#0a0505"]}
        speed={0.3}
      />
      <MeshGradient
        className="absolute w-full h-full opacity-70"
        style={{
          left: "-10px",
          top: "-10px",
          width: "calc(100% + 20px)",
          height: "calc(100% + 20px)",
        }}
        colors={["#0a0505", "#f59e0b", "#dc2626", "#1a0f0f"]}
        speed={0.2}
      />

      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}

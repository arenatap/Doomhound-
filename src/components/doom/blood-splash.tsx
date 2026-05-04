"use client";

import React, { useCallback, useRef } from "react";

interface BloodSplashProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function BloodSplash({ children, className, onClick }: BloodSplashProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const container = containerRef.current;
      if (!container) return;

      const dropletCount = 14;
      for (let i = 0; i < dropletCount; i++) {
        const droplet = document.createElement("div");
        const angle = (Math.PI * 2 * i) / dropletCount + (Math.random() - 0.5) * 0.8;
        const distance = 25 + Math.random() * 50;
        const size = 4 + Math.random() * 8;
        const isLarge = Math.random() > 0.65;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance + 15; // gravity bias

        droplet.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${isLarge ? size * 1.5 : size}px;
          height: ${isLarge ? size * 1.5 : size}px;
          border-radius: ${Math.random() > 0.5 ? "50%" : "40% 60% 50% 50%"};
          background: ${Math.random() > 0.5 ? "#dc2626" : "#8b0000"};
          pointer-events: none;
          z-index: 9999;
          transform: translate(-50%, -50%) scale(0);
          opacity: 1;
        `;

        container.appendChild(droplet);

        // Animate using Web Animations API for better browser support
        const animation = droplet.animate(
          [
            {
              transform: "translate(-50%, -50%) scale(0)",
              opacity: 1,
            },
            {
              transform: `translate(calc(-50% + ${endX * 0.6}px), calc(-50% + ${endY * 0.4}px)) scale(1)`,
              opacity: 0.9,
              offset: 0.4,
            },
            {
              transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.2)`,
              opacity: 0,
            },
          ],
          {
            duration: 600,
            easing: "ease-out",
            fill: "forwards",
          }
        );

        animation.onfinish = () => {
          if (container.contains(droplet)) {
            container.removeChild(droplet);
          }
        };
      }

      onClick?.(e);
    },
    [onClick]
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className || ""}`}
      onClick={handleClick}
      style={{ position: "relative" }}
    >
      {children}
    </div>
  );
}

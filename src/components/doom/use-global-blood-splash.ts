"use client";

import { useCallback, useRef } from "react";

export function useGlobalBloodSplash() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Check if clicked element is a button or inside a button or an anchor
    const isInteractive =
      target.tagName === "BUTTON" ||
      target.tagName === "A" ||
      target.closest("button") ||
      target.closest("a") ||
      target.closest("[role='button']");

    if (!isInteractive) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dropletCount = 12;
    for (let i = 0; i < dropletCount; i++) {
      const droplet = document.createElement("div");
      const angle = (Math.PI * 2 * i) / dropletCount + (Math.random() - 0.5) * 0.8;
      const distance = 20 + Math.random() * 45;
      const size = 3 + Math.random() * 7;
      const isLarge = Math.random() > 0.7;
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance + 12;

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

      const animation = droplet.animate(
        [
          {
            transform: "translate(-50%, -50%) scale(0)",
            opacity: 1,
          },
          {
            transform: `translate(calc(-50% + ${endX * 0.6}px), calc(-50% + ${endY * 0.4}px)) scale(1)`,
            opacity: 0.85,
            offset: 0.4,
          },
          {
            transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0.2)`,
            opacity: 0,
          },
        ],
        {
          duration: 550,
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
  }, []);

  return { containerRef, handleClick };
}

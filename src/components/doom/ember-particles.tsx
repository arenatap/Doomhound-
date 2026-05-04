"use client";

import { useEffect, useState } from "react";

interface Ember {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  left: string;
}

export function EmberParticles() {
  const [embers, setEmbers] = useState<Ember[]>([]);

  useEffect(() => {
    const newEmbers = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 5,
      left: `${Math.random() * 100}%`,
    }));
    setEmbers(newEmbers);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {embers.map((ember) => (
        <div
          key={ember.id}
          className="absolute rounded-full ember-particle"
          style={{
            left: ember.left,
            bottom: "-10px",
            width: `${ember.size}px`,
            height: `${ember.size}px`,
            background: Math.random() > 0.5 ? "#dc2626" : "#f97316",
            animationDuration: `${ember.duration}s`,
            animationDelay: `${ember.delay}s`,
            boxShadow: `0 0 ${ember.size * 2}px ${ember.size}px rgba(220, 38, 38, 0.3)`,
          }}
        />
      ))}
    </div>
  );
}

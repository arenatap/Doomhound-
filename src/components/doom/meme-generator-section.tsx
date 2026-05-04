"use client";

import { useCallback, useRef, useState } from "react";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

const templates = [
  { src: "/images/doomhound-meme1.png", label: "Throne" },
  { src: "/images/doomhound-meme2.png", label: "Rug Pull" },
  { src: "/images/doomhound-meme3.png", label: "Lambo" },
  { src: "/images/doomhound-meme4.png", label: "Scientist" },
];

export function MemeGeneratorSection() {
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [generated, setGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateMeme = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = templates[selectedTemplate].src;

    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Text settings
      const fontSize = Math.max(30, img.width / 12);
      ctx.font = `bold ${fontSize}px Impact, sans-serif`;
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = fontSize / 10;
      ctx.textAlign = "center";

      // Draw top text
      if (topText) {
        const y = fontSize + 10;
        ctx.strokeText(topText.toUpperCase(), canvas.width / 2, y);
        ctx.fillText(topText.toUpperCase(), canvas.width / 2, y);
      }

      // Draw bottom text
      if (bottomText) {
        const y = canvas.height - 15;
        ctx.strokeText(bottomText.toUpperCase(), canvas.width / 2, y);
        ctx.fillText(bottomText.toUpperCase(), canvas.width / 2, y);
      }

      setGenerated(true);
    };
  }, [selectedTemplate, topText, bottomText]);

  const downloadMeme = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "doomhound-meme.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <section
      id="meme-generator"
      className="relative py-20 md:py-32 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />

      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <ScrollReveal>
          <h2 className="font-creepster text-5xl md:text-7xl text-red-500 animate-glow-red text-center mb-16">
            FORGE YOUR MEME
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 md:p-8">
            {/* Template selector */}
            <div className="mb-6">
              <label className="text-sm uppercase tracking-wider text-gray-500 mb-3 block">
                Choose Template
              </label>
              <div className="grid grid-cols-4 gap-3">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedTemplate(i);
                      setGenerated(false);
                    }}
                    className={`rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      selectedTemplate === i
                        ? "border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                        : "border-[#2a2a2a] hover:border-red-900/50"
                    }`}
                  >
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={t.src}
                        alt={t.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center py-1 bg-[#0a0a0a]">
                      {t.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Text inputs */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm uppercase tracking-wider text-gray-500 mb-2 block">
                  Top Text
                </label>
                <input
                  type="text"
                  value={topText}
                  onChange={(e) => {
                    setTopText(e.target.value);
                    setGenerated(false);
                  }}
                  placeholder="WHEN YOU BUY THE DIP..."
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all"
                />
              </div>
              <div>
                <label className="text-sm uppercase tracking-wider text-gray-500 mb-2 block">
                  Bottom Text
                </label>
                <input
                  type="text"
                  value={bottomText}
                  onChange={(e) => {
                    setBottomText(e.target.value);
                    setGenerated(false);
                  }}
                  placeholder="BUT THE DIP KEEPS DIPPING"
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all"
                />
              </div>
            </div>

            {/* Generate button */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <BloodSplash className="flex-1">
                <button
                  onClick={generateMeme}
                  className="w-full px-6 py-4 text-lg font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300"
                >
                  GENERATE MEME 🔥
                </button>
              </BloodSplash>
              {generated && (
                <BloodSplash>
                  <button
                    onClick={downloadMeme}
                    className="w-full sm:w-auto px-6 py-4 text-lg font-bold bg-transparent border-2 border-red-600 hover:border-red-500 text-red-400 rounded-lg hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all duration-300"
                  >
                    DOWNLOAD ⬇️
                  </button>
                </BloodSplash>
              )}
            </div>

            {/* Preview area */}
            <div className="relative">
              <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-center min-h-[300px]">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[500px] rounded-lg"
                  style={{ display: generated ? "block" : "none" }}
                />
                {!generated && (
                  <div className="text-center">
                    <p className="text-gray-600 text-lg">
                      🔥 Your meme will appear here 🔥
                    </p>
                    <p className="text-gray-700 text-sm mt-2">
                      Select a template, add text, and generate!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

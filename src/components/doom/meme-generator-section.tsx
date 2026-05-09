"use client";

import { useCallback, useRef, useState } from "react";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

const templates = [
  { src: "/images/doomhound-meme1.png", label: "Doomhound" },
  { src: "/images/doomhound-meme2.png", label: "Rug Pull" },
  { src: "/images/doomhound-meme3.png", label: "Lambo" },
  { src: "/images/doomhound-meme4.png", label: "Scientist" },
  { src: "/images/doomhound-meme5.png", label: "Mascot" },
  { src: "/images/doomhound-meme6.png", label: "Inferno" },
  { src: "/images/doomhound-meme7.png", label: "Hell Hound" },
  { src: "/images/doomhound-meme8.png", label: "Pack Alpha" },
  { src: "/images/doomhound-meme9.png", label: "Burn It" },
  { src: "/images/doomhound-meme10.png", label: "Demon Dog" },
  { src: "/images/doomhound-meme11.png", label: "Moon Hound" },
  { src: "/images/doomhound-meme12.png", label: "Fear It" },
  { src: "/images/doomhound-meme13.png", label: "Unleashed" },
  { src: "/images/doomhound-meme14.png", label: "Degen" },
];

export function MemeGeneratorSection() {
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [generated, setGenerated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Wrap text into lines that fit within maxWidth at a given font size.
   * Each line is measured against the actual rendered width.
   */
  const wrapText = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }, []);

  /**
   * Find the largest font size that fits the text within the available area.
   * This recalculates line height for each font size to ensure accuracy.
   * 
   * Constraints:
   * - Text must fit within maxWidth (horizontal)
   * - Total text block must fit within maxAvailableHeight (vertical)
   * - Maximum of maxLines lines allowed
   */
  const findFittingFontSize = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number,
    maxAvailableHeight: number,
    startSize: number
  ): number => {
    let size = startSize;
    while (size > 12) {
      ctx.font = `bold ${size}px Impact, sans-serif`;
      const lineHeight = size * 1.2;
      const lines = wrapText(ctx, text, maxWidth);
      const totalHeight = lines.length * lineHeight;
      if (lines.length <= maxLines && totalHeight <= maxAvailableHeight) {
        return size;
      }
      size -= 2;
    }
    return 12;
  }, [wrapText]);

  const generateMeme = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = templates[selectedTemplate].src;

    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw the image at its natural size
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // === ADAPTIVE TEXT SYSTEM ===
      // All measurements are proportional to the image dimensions,
      // so text adapts to any aspect ratio (square, wide, portrait, etc.)

      const w = img.width;
      const h = img.height;
      const minDim = Math.min(w, h); // Use the smaller dimension for baseline sizing

      // Padding: 5% of the smaller dimension — works for any aspect ratio
      const padding = minDim * 0.05;

      // Max text width: image width minus padding on both sides
      const maxWidth = w - padding * 2;

      // Starting font size: based on smaller dimension so text isn't oversized
      // on wide images or undersized on portrait images
      const startFontSize = Math.max(24, minDim / 10);

      // Max available height for each text block (top or bottom):
      // 30% of image height — gives enough room for the image to breathe
      const maxAvailableHeight = h * 0.30;

      // Max lines per text block
      const maxLines = 4;

      /**
       * Draw a block of meme text (top or bottom).
       * - Auto-fits font size to the available area
       * - White fill with black outline for readability on any background
       * - Proper line height and centering
       */
      const drawMemeText = (text: string, isTop: boolean) => {
        if (!text.trim()) return;

        const upperText = text.toUpperCase();

        // Find the optimal font size for this text and this image
        const fontSize = findFittingFontSize(
          ctx, upperText, maxWidth, maxLines, maxAvailableHeight, startFontSize
        );
        const lineHeight = fontSize * 1.2;

        ctx.font = `bold ${fontSize}px Impact, sans-serif`;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = Math.max(2, fontSize / 10);
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const lines = wrapText(ctx, upperText, maxWidth);
        const totalBlockHeight = lines.length * lineHeight;

        // Vertical positioning:
        // - Top text: starts at padding from the top
        // - Bottom text: aligned so the bottom of the last line is at padding from bottom
        let y: number;
        if (isTop) {
          y = padding;
        } else {
          y = h - padding - totalBlockHeight;
        }

        // Draw each line with outline + fill for meme-style text
        for (const line of lines) {
          // Multiple outline passes for better readability
          ctx.strokeText(line, w / 2, y);
          ctx.fillText(line, w / 2, y);
          y += lineHeight;
        }
      };

      // Draw top and bottom text
      drawMemeText(topText, true);
      drawMemeText(bottomText, false);

      setGenerated(true);
    };
  }, [selectedTemplate, topText, bottomText, wrapText, findFittingFontSize]);

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
      className="relative py-20 sm:py-28 md:py-36 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-flame" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 md:px-16">
        <ScrollReveal>
          <h2 className="font-creepster text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-red-500 animate-glow-red text-center mb-12 sm:mb-16 md:mb-20">
            FORGE YOUR MEME
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 sm:p-8 md:p-10">
            {/* Template selector */}
            <div className="mb-6 sm:mb-8">
              <label className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500 mb-3 sm:mb-4 block">
                Choose Template
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
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
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 text-center py-1 bg-[#0a0a0a]">
                      {t.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Text inputs */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 mb-6 sm:mb-8">
              <div>
                <label className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500 mb-2 block">
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
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm md:text-base uppercase tracking-wider text-gray-500 mb-2 block">
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
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 sm:py-3.5 text-sm sm:text-base md:text-lg text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all"
                />
              </div>
            </div>

            {/* Generate button */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
              <BloodSplash className="flex-1">
                <button
                  onClick={generateMeme}
                  className="w-full px-6 py-3.5 sm:py-4 md:py-5 text-base sm:text-lg md:text-xl font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all duration-300"
                >
                  GENERATE MEME
                </button>
              </BloodSplash>
              {generated && (
                <BloodSplash>
                  <button
                    onClick={downloadMeme}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-4 md:py-5 text-base sm:text-lg md:text-xl font-bold bg-transparent border-2 border-red-600 hover:border-red-500 text-red-400 rounded-xl hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all duration-300"
                  >
                    DOWNLOAD
                  </button>
                </BloodSplash>
              )}
            </div>

            {/* Preview area */}
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[200px] sm:min-h-[300px] md:min-h-[400px]">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[300px] sm:max-h-[400px] md:max-h-[500px] rounded-lg"
                style={{ display: generated ? "block" : "none" }}
              />
              {!generated && (
                <div className="text-center">
                  <p className="text-gray-600 text-sm sm:text-lg md:text-xl">
                    Your meme will appear here
                  </p>
                  <p className="text-gray-700 text-xs sm:text-sm md:text-base mt-2">
                    Select a template, add text, and generate!
                  </p>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

"use client";

export function Footer() {
  return (
    <footer className="relative bg-[#0a0a0a] border-t border-[#2a2a2a] py-12">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="mb-6">
          <img
            src="/images/doomhound-logo.png"
            alt="$DOOMHOUND"
            className="w-12 h-12 mx-auto mb-4 opacity-60"
          />
          <p className="font-creepster text-xl text-red-500">
            $DOOMHOUND © 2025 — The Devil&apos;s Good Boy
          </p>
        </div>
        <p className="text-gray-600 text-sm max-w-lg mx-auto">
          Not financial advice. $DOOMHOUND is a meme token. DYOR. The Doomhound
          is not responsible for your bags.
        </p>
      </div>
    </footer>
  );
}

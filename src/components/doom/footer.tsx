"use client";

export function Footer() {
  return (
    <footer className="relative bg-[#0a0a0a] border-t border-[#2a2a2a] py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
        <div className="mb-4 sm:mb-6">
          <img
            src="/images/doomhound-logo.png"
            alt="$DOOMHOUND"
            className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-60 rounded-full"
          />
          <p className="font-creepster text-lg sm:text-xl text-red-500">
            $DOOMHOUND © 2025 — The Devil&apos;s Good Boy
          </p>
        </div>
        <p className="text-gray-600 text-xs sm:text-sm max-w-md mx-auto">
          Not financial advice. $DOOMHOUND is a meme token. DYOR. The Doomhound is not responsible for your bags.
        </p>
      </div>
    </footer>
  );
}

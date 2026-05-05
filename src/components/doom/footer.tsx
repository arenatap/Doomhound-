"use client";

export function Footer() {
  return (
    <footer className="relative bg-[#0a0a0a] border-t border-[#2a2a2a] py-10 sm:py-12 md:py-16">
      <div className="max-w-4xl mx-auto px-6 sm:px-10 md:px-16 text-center">
        <div className="mb-5 sm:mb-6 md:mb-8">
          <img
            src="/images/doomhound-logo.png"
            alt="$DOOMHOUND"
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 mx-auto mb-3 sm:mb-4 opacity-60 rounded-full"
          />
          <p className="font-creepster text-lg sm:text-xl md:text-2xl text-red-500">
            $DOOMHOUND © 2026 — The Devil&apos;s Good Boy
          </p>
        </div>
        <p className="text-gray-600 text-xs sm:text-sm md:text-base max-w-lg mx-auto">
          Not financial advice. $DOOMHOUND is a meme token. DYOR. The Doomhound is not responsible for your bags.
        </p>
      </div>
    </footer>
  );
}

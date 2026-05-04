"use client";

import { Twitter, MessageCircle, Swords } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";
import { BloodSplash } from "./blood-splash";

const socials = [
  {
    icon: Twitter,
    label: "Twitter / X",
    handle: "@DoomhoundAVAX",
    href: "#",
    color: "text-blue-400",
    hoverBorder: "hover:border-blue-500/50",
    hoverShadow: "hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]",
  },
  {
    icon: MessageCircle,
    label: "Telegram",
    handle: "t.me/DoomhoundAVAX",
    href: "#",
    color: "text-sky-400",
    hoverBorder: "hover:border-sky-500/50",
    hoverShadow: "hover:shadow-[0_0_25px_rgba(14,165,233,0.3)]",
  },
  {
    icon: Swords,
    label: "The Arena",
    handle: "arena.avax",
    href: "#",
    color: "text-red-400",
    hoverBorder: "hover:border-red-500/50",
    hoverShadow: "hover:shadow-[0_0_25px_rgba(220,38,38,0.3)]",
  },
];

export function CommunitySection() {
  return (
    <section
      id="community"
      className="relative py-20 md:py-32 bg-[#0a0a0a] overflow-hidden"
    >
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <ScrollReveal>
          <h2 className="font-creepster text-5xl md:text-7xl text-red-500 animate-glow-red text-center mb-16">
            JOIN THE PACK
          </h2>
        </ScrollReveal>

        <div className="grid sm:grid-cols-3 gap-6">
          {socials.map((social, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <BloodSplash>
                <a
                  href={social.href}
                  className={`block bg-[#1a1a1a] border border-[#2a2a2a] ${social.hoverBorder} rounded-xl p-8 text-center transition-all duration-300 animate-red-glow-pulse group ${social.hoverShadow}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon
                    className={`w-12 h-12 mx-auto mb-4 ${social.color} group-hover:scale-110 transition-transform duration-300`}
                  />
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-red-400 transition-colors">
                    {social.label}
                  </h3>
                  <p className="text-gray-500 text-sm">{social.handle}</p>
                </a>
              </BloodSplash>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

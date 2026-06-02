import React, { useState } from 'react';
import { Sparkles, Heart, ShieldAlert, BadgeCheck, CheckCircle2 } from 'lucide-react';

export default function CleanHomeCleaning({ isHolo }: { isHolo: boolean }) {
  const [selectedService, setSelectedService] = useState('Deep Home Detox');

  const services = [
    { name: "Deep Home Detox", desc: "Intense deep cleaning targeting deep allergens & hard water grime" },
    { name: "Standard Maid Care", desc: "Consistent pet-safe bi-weekly dusting, sweeping & maintenance" },
    { name: "Eco Move Out", desc: "Comprehensive tenant handover sanitizing with zero strong fumes" },
    { name: "Post-Build Recovery", desc: "Critical silica dust filtration & post-construction detail cleanup" }
  ];

  return (
    <div className="w-full h-full bg-[#050b0c] text-cyan-200 font-sans flex flex-col justify-between p-6 relative">
      {/* Dynamic bubbles background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d403_1px,transparent_1px),linear-gradient(to_bottom,#06b6d403_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-cyan-950 pb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center text-black font-mono font-bold shadow-[0_0_15px_rgba(6,182,212,0.35)]">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <h1 className="font-sans text-left text-[14px] font-black tracking-widest text-[#e0f7fa]">
              CLEAN HOME POWER WASHING
            </h1>
            <span className="text-[7.5px] font-mono tracking-widest text-cyan-400 uppercase block text-left">
              FAMILY SERVICES CLEANING // NON-TOXIC SANITIZATION
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-900/30 px-2.5 py-0.5 rounded flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-cyan-500 shrink-0" /> PET &amp; ECO SAFE
          </span>
        </div>
      </div>

      {/* Main Grid Frame */}
      <div className="grid grid-cols-12 gap-5 my-3 flex-grow items-stretch z-10">
        
        {/* Left Side: Services Program Layout */}
        <div className="col-span-7 bg-[#091518] border border-cyan-950 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-black">
                [ WELLNESS CORE SERVICE MENU ]
              </span>
              <span className="text-[8px] font-mono text-stone-500">Non-toxic botanicals</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {services.map((svc) => (
                <button
                  key={svc.name}
                  onClick={() => setSelectedService(svc.name)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all flex flex-col justify-between h-[64px] group cursor-pointer ${
                    selectedService === svc.name
                      ? 'bg-cyan-950/30 border-cyan-500 shadow-md'
                      : 'bg-stone-950/40 border-stone-900 hover:border-cyan-950'
                  }`}
                >
                  <span className={`text-[10px] font-extrabold block truncate leading-none ${selectedService === svc.name ? 'text-cyan-400' : 'text-stone-300'}`}>
                    {svc.name}
                  </span>
                  <span className="text-[9px] text-stone-500 line-clamp-2 leading-relaxed block mt-1.5">
                    {svc.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#051113] border border-cyan-950/80 p-2.5 rounded-lg flex justify-between items-center text-left">
            <div>
              <span className="text-[8px] font-mono text-cyan-500 block uppercase font-bold">ALLERGEN MITIGATION PROTOCOL</span>
              <span className="text-[12px] font-bold text-white">Active Eco-Shine Defense</span>
            </div>
            <span className="text-[9px] font-mono text-stone-400 border border-cyan-900/30 px-2 py-1 rounded bg-[#091518]">
              ALLERGEN FREE
            </span>
          </div>
        </div>

        {/* Right Side: Family Safety & Trust */}
        <div className="col-span-5 bg-[#091518] border border-cyan-950 p-4 rounded-xl flex flex-col justify-between text-left">
          <div>
            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-black block">
              [ THE TRUST GUARANTEE ]
            </span>
            <h4 className="text-white text-[13px] font-bold mt-1.5 leading-tight">Breathe Safer Air At Home</h4>
            
            <div className="space-y-2 mt-3.5">
              {[
                "100% Biodegradable Botanical Soaps",
                "HEPA Micro-Allergen Vacuuming",
                "Advanced Pet Hair Extraction",
                "Bespoke Deep Garage Cleans"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-stone-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[9px] font-mono text-stone-500 leading-normal border-t border-cyan-950 pt-2.5">
            🍃 PROMOTING OPTIMAL WELLNESS &amp; SYSTEMATIC FAMILY HYGIENE
          </p>
        </div>

      </div>

      {/* Footer bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 border-t border-cyan-950/40 pt-4 mt-1">
        <span>BIODEGRADABLE &amp; PET SAFE</span>
        <span className="text-[9px] text-[#e0f7fa]">🍃 FAMILY SERVICES CLEANING</span>
        <span>PEACE OF MIND GUARANTEE</span>
      </div>
    </div>
  );
}

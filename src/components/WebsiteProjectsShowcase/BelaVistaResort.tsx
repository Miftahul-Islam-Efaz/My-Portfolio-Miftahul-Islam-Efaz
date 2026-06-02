import React, { useState } from 'react';
import { Compass, Sunset, Waves, Map, Flame, Image, Play, Volume2 } from 'lucide-react';

export default function BelaVistaResort({ isHolo }: { isHolo: boolean }) {
  const [activeTab, setActiveTab] = useState('cottages');

  const facilities = {
    cottages: {
      title: "Rustic Beach Cottages",
      desc: "Minimalist wooden architecture matching the organic contours of Saint Martin's coastlines. Unobstructed tides and ocean breeze.",
      tag: "SAINT MARTIN LIVING"
    },
    dining: {
      title: "Open-Fire Beach Culinary",
      desc: "An elemental dining experience curated precisely on the sand. Locally gathered wood fires roasting fresh-bought fishermen catches.",
      tag: "BAY OF BENGAL BIOPHILE"
    },
    immersion: {
      title: "Vlog: Cinematic Sunset Look",
      desc: "A fluid guest-curated vlog diary capturing the morning sea haze, silent local boats, and glowing red west beach sunset horizons.",
      tag: "AVIJATRIK DOCUMENTARY"
    }
  };

  return (
    <div className="w-full h-full bg-[#0d0a08] text-amber-100 font-sans flex flex-col justify-between p-6 relative">
      {/* Background Radial Amber Flare */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-amber-950/40 pb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-amber-600 rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(217,119,6,0.35)]">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-sans text-left text-[13px] font-black tracking-[0.22em] text-[#faedd7]">
              BELA VISTA PREMIUM RESORT
            </h1>
            <span className="text-[7.5px] font-mono tracking-widest text-amber-500 uppercase block text-left">
              SLOW LIVING // ORGANIC CHRONOLOGY
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[9px] font-mono text-amber-400 bg-amber-950/30 border border-amber-900/30 px-2.5 py-0.5 rounded flex items-center gap-1">
            <Sunset className="w-3.5 h-3.5 text-amber-500" /> BAY OF BENGAL
          </span>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="grid grid-cols-12 gap-5 my-3 flex-grow items-stretch z-10">
        
        {/* Left Aspect: Interactive Features Slider */}
        <div className="col-span-7 bg-[#14100c] border border-amber-950/60 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-left">
            <div className="flex gap-1.5 mb-3">
              {(Object.keys(facilities) as Array<keyof typeof facilities>).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-3 py-1 text-[9px] font-mono uppercase tracking-widest border rounded transition-all cursor-pointer ${
                    activeTab === key
                      ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                      : 'border-stone-900 text-stone-500 hover:border-amber-950'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <span className="text-[8px] font-mono text-amber-500 tracking-[0.2em] block uppercase font-bold">
              [ {facilities[activeTab as keyof typeof facilities].tag} ]
            </span>
            <h3 className="text-[#faeffc] text-[15px] font-extrabold mt-1 leading-tight">
              {facilities[activeTab as keyof typeof facilities].title}
            </h3>
            <p className="text-stone-400 text-[11px] leading-relaxed mt-2.5">
              {facilities[activeTab as keyof typeof facilities].desc}
            </p>
          </div>

          <div className="bg-[#0b0806] border border-amber-950 p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-amber-500/10 rounded flex items-center justify-center">
                <Play className="w-3 h-3 text-amber-500" />
              </div>
              <span className="text-[9px] font-mono text-stone-400">Cinematic Guest Vlog Diary</span>
            </div>
            <span className="text-[8px] font-mono text-amber-500 tracking-widest font-black">PLAY IMMERSION</span>
          </div>
        </div>

        {/* Right Aspect: Atmosphere Details */}
        <div className="col-span-5 bg-[#14100c] border border-amber-950/60 p-4 rounded-xl flex flex-col justify-between text-left">
          <div>
            <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest font-black block">
              [ ECO COSY RETREAT ]
            </span>
            <h4 className="text-white text-[13px] font-black mt-1.5">Sunset Beach Sanctuaries</h4>
            
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-2.5 text-xs text-stone-400">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Beachside Open Cooking</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-400">
                <Sunset className="w-3.5 h-3.5 text-amber-500" />
                <span>Saint Martin Island West Coast</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-stone-400">
                <Waves className="w-3.5 h-3.5 text-amber-500" />
                <span>Minimalist Organic Cottages</span>
              </div>
            </div>
          </div>

          <div className="text-[9.5px] font-mono text-stone-500 border-t border-amber-950/40 pt-2.5">
            🐚 SAINT MARTIN, BAY OF BENGAL // DETOX WORKFLOWS
          </div>
        </div>

      </div>

      {/* Footer bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 border-t border-amber-950/40 pt-4 mt-1">
        <span>WEST BEACH COSTA DEL SOL</span>
        <span className="text-[9px] text-[#faedd7]">🌊 SLOW LIVING ECO LUXURY</span>
        <span>AVIJATRIK DOCUMENTARY HUD</span>
      </div>
    </div>
  );
}

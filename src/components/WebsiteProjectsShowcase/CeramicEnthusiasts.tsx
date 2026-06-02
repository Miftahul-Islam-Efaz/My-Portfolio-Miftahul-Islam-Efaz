import React, { useState } from 'react';
import { Shield, Sparkles, MapPin, Gauge, Cpu, Check } from 'lucide-react';

export default function CeramicEnthusiasts({ isHolo }: { isHolo: boolean }) {
  const [coatingLevel, setCoatingLevel] = useState('gold');

  const coatings = {
    gold: {
      title: "Liquid Nano Ceramic PPF",
      durability: "9-Year Hydrophobic Barrier",
      protection: "Scratch & chemical immune",
      pricing: "$1,200 avg"
    },
    platinum: {
      title: "Full-Body 10H Ceramic Coating",
      durability: "Lifetime Ceramic Fusion",
      protection: "Gloss booster & self-cleaning",
      pricing: "$1,850 avg"
    }
  };

  return (
    <div className="w-full h-full bg-[#0a0c10] text-[#cbd5e1] font-sans flex flex-col justify-between p-6 relative">
      {/* High Octane Carbon Speed Overlay */}
      <div className="absolute inset-0 bg-[#0e1115] bg-[radial-gradient(#3b82f615_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-blue-950/40 pb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-sans text-left text-[14px] font-black tracking-widest text-white">
              CERAMIC ENTHUSIASTS
            </h1>
            <span className="text-[7.5px] font-mono tracking-widest text-blue-400 uppercase block text-left">
              VETERAN OWNED // ONE CAR AT A TIME FOCUS
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[9px] font-mono text-blue-400 bg-blue-950/40 border border-blue-900/30 px-2.5 py-0.5 rounded flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" /> 10+ YRS MASTER
          </span>
        </div>
      </div>

      {/* Main Grid Frame */}
      <div className="grid grid-cols-12 gap-5 my-3 flex-grow items-stretch z-10">
        
        {/* Left Side: Interactive Nano Selectors */}
        <div className="col-span-7 bg-[#0f1319] border border-blue-950 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-left">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest font-black">
                [ SHIELD FORMULATION Selector ]
              </span>
              <span className="text-[8px] font-mono text-stone-500">Premium automotive defense</span>
            </div>

            <div className="flex gap-2 mb-3">
              {(Object.keys(coatings) as Array<keyof typeof coatings>).map((key) => (
                <button
                  key={key}
                  onClick={() => setCoatingLevel(key)}
                  className={`flex-1 p-2.5 rounded border text-left flex flex-col justify-between h-[68px] transition-all cursor-pointer ${
                    coatingLevel === key
                      ? 'bg-blue-950/20 border-blue-500 shadow-md'
                      : 'bg-stone-950/40 border-stone-900 hover:border-blue-950'
                  }`}
                >
                  <span className={`text-[10px] font-mono block ${coatingLevel === key ? 'text-blue-400 font-extrabold' : 'text-stone-500'}`}>
                    {key.toUpperCase()} TREATMENT
                  </span>
                  <span className="text-[11px] text-white font-extrabold block leading-tight truncate">
                    {coatings[key].title}
                  </span>
                  <span className="text-[9px] text-stone-400 font-mono mt-0.5">{coatings[key].durability}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#0a0c10] border border-blue-950/80 p-2.5 rounded-lg flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-[8px] font-mono text-stone-500 block uppercase font-bold">SHIELD SPECIFIED</span>
                <span className="text-[11px] font-black text-white">{coatings[coatingLevel as keyof typeof coatings].protection}</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-black tracking-tight shrink-0 pl-2">
              {coatings[coatingLevel as keyof typeof coatings].pricing}
            </span>
          </div>
        </div>

        {/* Right Side: Core Services Detail Column */}
        <div className="col-span-5 bg-[#0f1319] border border-blue-950 p-4 rounded-xl flex flex-col justify-between text-left">
          <div>
            <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest font-black block">
              [ THE ONE-CAR FOCUS ]
            </span>
            <h4 className="text-white text-[13px] font-bold mt-1.5">No Assembly-Line Detailing</h4>
            
            <div className="space-y-2 mt-3.5">
              {[
                "Liquid Paint Protection Film (PPF)",
                "Multi-Stage Machine Correction",
                "Alloy Wheel & Glass Nano Barriers"
              ].map((service, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-stone-400">
                  <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{service}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9px] font-mono text-stone-500 pt-2 border-t border-blue-950">
            📍 Houston, Pearland, Pasadena, Friendswood, League City TX
          </div>
        </div>

      </div>

      {/* Footer bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 border-t border-blue-950/40 pt-4 mt-1">
        <span>VETERAN OWNED &amp; OPERATED</span>
        <span className="text-[9px] text-[#cbd5e1]">🏁 HOUSTON AUTO DETAILING RESCUE</span>
        <span>(281) 626-9384</span>
      </div>
    </div>
  );
}

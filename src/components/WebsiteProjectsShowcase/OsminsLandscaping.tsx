import React, { useState } from 'react';
import { MapPin, Phone, CheckCircle2, ChevronRight, Leaf, Waves } from 'lucide-react';

export default function OsminsLandscaping({ isHolo }: { isHolo: boolean }) {
  const [selectedGrass, setSelectedGrass] = useState('Zeon Zoysia');

  const sodPricing = [
    { name: "Zeon Zoysia", price: "$385", desc: "Ultra-premium fine-bladed warm season turf" },
    { name: "Emerald Zoysia", price: "$330", desc: "Dense, dark-green supreme shade tolerance" },
    { name: "Tall Fescue", price: "$310", desc: "Deep-root cool season evergreen turf" },
    { name: "Tifway Bermuda 419", price: "$200", desc: "Rugged high-traffic golf-grade performance" }
  ];

  return (
    <div className="w-full h-full bg-[#080d09] text-stone-200 font-sans flex flex-col justify-between p-6 relative">
      {/* Dynamic Grid Background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98103_1px,transparent_1px),linear-gradient(to_bottom,#10b98103_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-emerald-950/40 pb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <Leaf className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-sans text-left text-[14px] font-black tracking-widest text-[#f0f5f1]">
              OSMIN'S LANDSCAPING
            </h1>
            <span className="text-[8px] font-mono tracking-widest text-emerald-400 uppercase block text-left">
              FATHER-SON PREMIUM GREENSCAPES
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded flex items-center gap-1.5">
            <MapPin className="w-3 h-3 animate-bounce" /> MARIETTA, GA
          </span>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-12 gap-5 my-3 flex-grow items-stretch z-10">
        
        {/* Left Interactive Panel: Premium Turf Pricing */}
        <div className="col-span-7 bg-[#0b140e] border border-emerald-950/80 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest font-black">
                [ Dynamic Sod Pricing ]
              </span>
              <span className="text-[9px] font-mono text-stone-500">Price per pallet</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {sodPricing.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setSelectedGrass(item.name)}
                  className={`p-2.5 rounded-lg border text-left text-xs transition-all flex flex-col justify-between h-[64px] group cursor-pointer ${
                    selectedGrass === item.name
                      ? 'bg-emerald-950/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : 'bg-stone-950/60 border-stone-900 hover:border-emerald-900'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-extrabold text-stone-200 text-[11px] truncate group-hover:text-emerald-300">
                      {item.name}
                    </span>
                    <span className="font-mono text-emerald-400 font-bold ml-1">{item.price}</span>
                  </div>
                  <span className="text-[9px] text-stone-500 truncate mt-1 w-full text-left line-clamp-1 block">
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#050906] p-2.5 rounded-lg border border-emerald-950 flex justify-between items-center">
            <div className="text-left">
              <span className="text-[8px] font-mono text-emerald-500 uppercase block font-semibold">SELECTED VARIETY APPROVED</span>
              <span className="text-[12px] font-black text-white">{selectedGrass}</span>
            </div>
            <a href="tel:7708756647" className="bg-emerald-600 hover:bg-emerald-500 text-black font-mono font-black text-[10px] px-3.5 py-1.5 rounded-md flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> CALL NOW
            </a>
          </div>
        </div>

        {/* Right Panel: Experience & Core Specialities */}
        <div className="col-span-5 bg-[#0b140e] border border-emerald-950/80 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-left">
            <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest font-black block">
              [ 20+ YRS MASTER SERVICE ]
            </span>
            <h3 className="text-white text-[15px] font-bold mt-1.5 leading-tight">Elite Landscape Cleanup &amp; Hardscaping</h3>
            
            <div className="flex flex-col gap-2 mt-3.5">
              {[
                "Zeon & Zoysia Sod Installers",
                "Retaining Walls & Paver Patios",
                "Advanced Irrigation & Sprinklers",
                "Safety Tree Removal & Cleanup"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-stone-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] font-mono text-stone-500 border-t border-emerald-950 pt-2.5 text-left leading-normal">
            📍 Servicing a <strong className="text-emerald-400 font-black">60-Mile Radius</strong> including Metro Atlanta, Kennesaw, and Alpharetta.
          </div>
        </div>

      </div>

      {/* Footer bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 border-t border-emerald-950/40 pt-4 mt-1">
        <span>EST. 2006 // LICENSED &amp; FULLY INSURED</span>
        <span className="text-[9px] text-[#f0f5f1]">📞 (770) 875-6647</span>
        <span>ATLANTA OUTPOST</span>
      </div>
    </div>
  );
}

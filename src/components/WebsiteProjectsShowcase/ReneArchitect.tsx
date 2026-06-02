import React, { useState } from 'react';
import { Layers, Cuboid as Cube, Leaf, Map, Grid, ArrowRight } from 'lucide-react';

export default function ReneArchitect({ isHolo }: { isHolo: boolean }) {
  const [activeStage, setActiveStage] = useState(0);

  const workflowStages = [
    { title: "Stage 01: Concept", focus: "Biophilic architectural sketch & site topography matching", duration: "Weeks 1-4" },
    { title: "Stage 02: Design", focus: "Sustainable physical 3D simulations & carbon light indexes", duration: "Weeks 5-12" },
    { title: "Stage 03: Build", focus: "Unified architectural oversight & high-precision engineering", duration: "Months 4-14" }
  ];

  const featuredWorks = [
    { name: "Emerald Silence", desc: "Passive cooling sanctuary", site: "Chittagong Hills" },
    { name: "Sunlit Solitude", desc: "Brutalist residential concrete study", site: "OR Nizam Rd" },
    { name: "Earth and Light", desc: "Biophilic bamboo workspace pavilion", site: "Anwara Coastal" }
  ];

  return (
    <div className="w-full h-full bg-[#0a0c0a] text-[#daeed5] font-sans flex flex-col justify-between p-6 relative">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#84cc1602_1px,transparent_1px),linear-gradient(to_bottom,#84cc1602_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#0d210c] pb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-lime-600 rounded flex items-center justify-center text-black font-mono font-black shadow-[0_0_12px_rgba(132,204,22,0.25)]">
            R
          </div>
          <div>
            <h1 className="font-sans text-left text-[14px] font-bold tracking-[0.25em] text-[#f2faf0]">
              RENE ARCHITECT STUDIO
            </h1>
            <span className="text-[7.5px] font-mono tracking-widest text-lime-500 uppercase block text-left">
              BIOPHILIC STRUCTURAL INTEGRITY // EST. 2010
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[9px] font-mono text-lime-400 bg-lime-950/20 border border-lime-900/30 px-2.5 py-0.5 rounded flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-lime-500" /> 300+ PROJECTS
          </span>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="grid grid-cols-12 gap-5 my-3 flex-grow items-stretch z-10">
        
        {/* Left Side: 3-Stage Process Workflow */}
        <div className="col-span-7 bg-[#0f120e] border border-[#162115] p-4 rounded-xl flex flex-col justify-between text-left">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-mono text-lime-500 uppercase tracking-widest font-black">
                [ UNIFIED PROCESS FLOW ]
              </span>
              <span className="text-[8px] font-mono text-stone-500">Click stages below</span>
            </div>

            <div className="flex flex-col gap-1.5 mb-3.5">
              {workflowStages.map((stage, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStage(idx)}
                  className={`w-full p-2.5 rounded border text-left flex justify-between items-center transition-all cursor-pointer ${
                    activeStage === idx
                      ? 'bg-lime-950/15 border-lime-500/80 shadow-md'
                      : 'bg-stone-950/40 border-stone-900 hover:border-lime-950'
                  }`}
                >
                  <div>
                    <span className={`text-[10px] font-mono block ${activeStage === idx ? 'text-lime-400 font-extrabold' : 'text-stone-500'}`}>
                      {stage.title}
                    </span>
                    <span className="text-[11px] text-stone-300 font-medium block mt-0.5 line-clamp-1">{stage.focus}</span>
                  </div>
                  <span className="text-[8px] font-mono text-stone-500 shrink-0 ml-2">{stage.duration}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[10px] font-mono text-lime-500/80 italic leading-snug">
            &ldquo;We synthesize structural concrete with active daylight prisms to honor natural biomes.&rdquo; &ndash; Kazi Fahim Nasir
          </p>
        </div>

        {/* Right Side: Featured Works Column */}
        <div className="col-span-5 bg-[#0f120e] border border-[#162115] p-4 rounded-xl flex flex-col justify-between text-left">
          <div>
            <span className="text-[9px] font-mono text-lime-500 uppercase tracking-widest font-black block">
              [ CHOSEN OUTLINES ]
            </span>
            
            <div className="mt-2.5 space-y-2.5">
              {featuredWorks.map((work, idx) => (
                <div key={idx} className="border-l border-lime-800/20 pl-3 py-0.5">
                  <h4 className="text-white text-[12px] font-black leading-tight">{work.name}</h4>
                  <p className="text-stone-400 text-[10px] truncate mt-0.5">{work.desc}</p>
                  <span className="text-[8px] font-mono text-stone-500 mt-1 block uppercase font-bold">{work.site}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9px] font-mono text-stone-500 border-t border-[#162115] pt-2">
            📍 OR NIZAM RD, CHATTOGRAM, BD
          </div>
        </div>

      </div>

      {/* Footer bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 border-t border-[#0d210c] pt-4 mt-1">
        <span>KAZI FAHIM NASIR // DESIGN DIRECT</span>
        <span className="text-[9px] text-[#daeed5]">🌿 BIOPHILIC WORKSPACES</span>
        <span>RENE INC CONSTRUCTIONS</span>
      </div>
    </div>
  );
}

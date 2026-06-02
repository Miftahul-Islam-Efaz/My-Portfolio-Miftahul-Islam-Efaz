import React, { useState } from 'react';
import { Cpu, Zap, Activity, ShieldCheck, HelpCircle, Code, Target, Sparkles, Network } from 'lucide-react';

export default function PencilLink({ isHolo }: { isHolo: boolean }) {
  const [activeVector, setActiveVector] = useState(0);

  const vectors = [
    { name: "AI & Automations", desc: "Build automated workflows (n8n, make.com) triggering multi-agent loops to eliminate task labor.", tag: "COGNITIVE SPEED" },
    { name: "Software / SaaS", desc: "Full-stack tailored Node, React & Next.js systems engineered to scale from MVP to mass acquisition.", tag: "ENTERPRISE READY" },
    { name: "Web Architectures", desc: "Uncompromising lookbooks, spatial layouts, and custom web portals styled to absolute master standards.", tag: "BRAND SUPREMACY" },
    { name: "Lead Generation", desc: "Outbound pipelines, inbound scraping traps, and content funnels built to generate active sales.", tag: "GROWTH MULTIPLIER" }
  ];

  return (
    <div className="w-full h-full bg-[#07050a] text-purple-200 font-sans flex flex-col justify-between p-6 relative">
      {/* Cybernetic code grid backdrop */}
      <div className="absolute inset-0 bg-[#0a0710] bg-[radial-gradient(#a855f712_1px,transparent_1px)] bg-[size:18px_18px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center border-b border-purple-950 pb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(168,85,247,0.45)]">
            <Network className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-sans text-left text-[14px] font-black tracking-widest text-[#f5f0fa]">
              PENCIL LINK TECH
            </h1>
            <span className="text-[7.5px] font-mono tracking-widest text-purple-400 uppercase block text-left">
              YOUR OUTSOURCED TECHNOLOGY &amp; ACCELERATION CORE
            </span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[9px] font-mono text-purple-400 bg-purple-950/40 border border-purple-900/30 px-2.5 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
            <Zap className="w-3.5 h-3.5 text-purple-500 fill-purple-500" /> BUNDLED TEAM
          </span>
        </div>
      </div>

      {/* Main Grid Frame */}
      <div className="grid grid-cols-12 gap-5 my-3 flex-grow items-stretch z-10">
        
        {/* Left Side: Growth Engine Vectors */}
        <div className="col-span-7 bg-[#0f0b18] border border-purple-950 p-4 rounded-xl flex flex-col justify-between text-left">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-black">
                [ FIVE VERTICAL VECTOR DRIVERS ]
              </span>
              <span className="text-[8px] font-mono text-stone-500">Integrated growth hacking</span>
            </div>

            <div className="space-y-1.5">
              {vectors.map((vec, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveVector(idx)}
                  className={`w-full p-2.5 rounded-lg border text-left flex justify-between items-start transition-all cursor-pointer ${
                    activeVector === idx
                      ? 'bg-purple-950/20 border-purple-500 shadow-md'
                      : 'bg-stone-950/40 border-stone-900 hover:border-purple-950'
                  }`}
                >
                  <div className="pr-3">
                    <span className={`text-[10px] font-mono block ${activeVector === idx ? 'text-purple-400 font-extrabold' : 'text-stone-500'}`}>
                      DRIVER 0{idx + 1} // {vectors[idx].tag}
                    </span>
                    <span className="text-[12.5px] text-white font-extrabold block leading-tight mt-0.5">
                      {vec.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 max-w-[150px] leading-snug line-clamp-2">
                    {vec.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Who It's For & Metrics */}
        <div className="col-span-5 bg-[#0f0b18] border border-purple-950 p-4 rounded-xl flex flex-col justify-between text-left">
          <div>
            <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-black block">
              [ THE TARGET FIT ]
            </span>
            <h4 className="text-white text-[13px] font-bold mt-1.5 leading-tight">Eliminating Multi-agency Clutter</h4>
            
            <div className="space-y-2.5 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-purple-950/40 rounded flex items-center justify-center text-purple-400 text-[10px] font-mono font-bold">01</div>
                <div className="text-stone-300 text-xs">Startups &amp; SaaS Operators</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-purple-950/40 rounded flex items-center justify-center text-purple-400 text-[10px] font-mono font-bold">02</div>
                <div className="text-stone-300 text-xs">Agencies seeking Automations</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-purple-950/40 rounded flex items-center justify-center text-purple-400 text-[10px] font-mono font-bold">03</div>
                <div className="text-stone-300 text-xs">Founders wanting Unified Tech+Growth</div>
              </div>
            </div>
          </div>

          <div className="text-[9.5px] font-mono text-stone-500 border-t border-purple-950 pt-2.5">
            🔮 COMPILING SOFTWARE, AI WORKFLOWS &amp; OUTBOUND SCALERS
          </div>
        </div>

      </div>

      {/* Footer bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 border-t border-purple-950/40 pt-4 mt-1">
        <span>INTEGRATED SaaS OUTSOURCE UNIT</span>
        <span className="text-[9px] text-[#f5f0fa]">⚡ pencilLink.tech</span>
        <span>GROWTH METRICS HUB</span>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';

export default function PredatorDashboard({ isHolo }: { isHolo: boolean }) {
  const [cpu, setCpu] = useState(42);
  const [tasks, setTasks] = useState(1482);
  const [logs, setLogs] = useState<string[]>([
    "SYS: n8n workflow cluster synchronized [10.0.0.4]",
    "AI: Input request deep tokenization complete",
    "API: Webhook acknowledged by Outpost Bangladesh Server"
  ]);

  useEffect(() => {
    if (isHolo) return;
    const interval = setInterval(() => {
      setCpu(Math.floor(35 + Math.random() * 25));
      setTasks(prev => prev + 1);
      
      const events = [
        "API: Outpost Dhaka received payload from stripe v3.",
        "SYS: Automation rule triggered - executing python parser.",
        "SEC: Firewall proxy cleared webhook token.",
        "DATABASE: Synced PostgreSQL persistent record.",
        "CRM: Pushed lead details to HubSpot pipeline successfully.",
        "NOTIFICATION: Sent WhatsApp confirmation to client."
      ];
      const nextLog = events[Math.floor(Math.random() * events.length)];
      setLogs(prev => [nextLog, prev[0], prev[1]].slice(0, 3));
    }, 1200);
    return () => clearInterval(interval);
  }, [isHolo]);

  return (
    <div className="w-full h-full bg-[#050303] text-red-500 font-mono flex flex-col justify-between p-6">
      {/* Dynamic Grid Background overlay for tech feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444405_1px,transparent_1px),linear-gradient(to_bottom,#ef444405_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Bar */}
      <div className="flex justify-between items-center border-b border-red-950/50 pb-4 z-10">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse border border-red-400" />
          <span className="text-[14px] font-black tracking-widest text-[#f5f5f5]">
            PREDATOR.OS // WORKFLOW_ENGINE
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-red-700 font-semibold tracking-wider bg-red-950/20 px-3 py-1 rounded border border-red-900/30">
          <span>PORT: ACTIVE (3000)</span>
          <span>&bull;</span>
          <span>OUTPOST: BANGLADESH</span>
        </div>
      </div>

      {/* Canvas workspace - 3 interconnected nodes */}
      <div className="relative flex-grow my-4 grid grid-cols-12 gap-5 items-center z-10">
        
        {/* Left node (Webhook Hook) */}
        <div className="col-span-4 bg-[#0d0707] border border-red-900/40 rounded-lg p-4 flex flex-col gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-red-600 uppercase tracking-widest font-black">[ Trigger webhook ]</span>
            <span className="w-2.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <h3 className="text-white text-[15px] font-bold tracking-tight">Incoming Lead</h3>
          <p className="text-[11px] text-stone-500 leading-normal text-left">
            Intercepts secure API data payloads instantly across all client agency tunnels.
          </p>
        </div>

        {/* Center node (Gemini deep categorization) */}
        <div className="col-span-4 bg-[#140a0a] border border-red-600/40 rounded-lg p-4 flex flex-col gap-2 shadow-[0_15px_30px_rgba(239,68,68,0.15)] relative">
          <div className="absolute -top-3 left-4 bg-red-600 text-black font-black text-[9px] px-2 py-0.5 rounded tracking-widest">
            AI PROCESSING LAYER
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-red-400 uppercase tracking-widest font-black">GEMINI FLASH 2.5</span>
            <Cpu className="w-4 h-4 text-red-400 animate-spin" />
          </div>
          <h3 className="text-white text-[15px] font-bold tracking-tight">Parser Engine</h3>
          <p className="text-[11px] text-stone-300 leading-normal text-left">
            Summarizes client intentions, categories, and schedules with premium accuracy.
          </p>
        </div>

        {/* Right node (Database Sync + CRM Sync) */}
        <div className="col-span-4 bg-[#0d0707] border border-red-900/40 rounded-lg p-4 flex flex-col gap-2 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-red-600 uppercase tracking-widest font-black">[ Endpoint action ]</span>
            <span className="w-2 h-2 bg-red-600 rounded-full" />
          </div>
          <h3 className="text-white text-[15px] font-bold tracking-tight">CRM &amp; Team Notify</h3>
          <p className="text-[11px] text-stone-500 leading-normal text-left">
            Appends records to PostgreSQL, updates HubSpot, and triggers WhatsApp alerts.
          </p>
        </div>

        {/* SVG connection cables */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <line x1="300" y1="120" x2="340" y2="120" stroke="#f87171" strokeWidth="2" strokeDasharray="5 5" className="animate-[dash_10s_linear_infinite]" />
          <line x1="620" y1="120" x2="660" y2="120" stroke="#f87171" strokeWidth="2" />
        </svg>

      </div>

      {/* Diagnostics Logs & Live Stats */}
      <div className="grid grid-cols-12 gap-5 border-t border-red-950/50 pt-4 z-10 items-center">
        {/* Metric bars */}
        <div className="col-span-5 flex flex-col gap-2">
          <div className="flex justify-between text-[11px] text-red-400">
            <span>PIPELINE CPU WORKLOAD</span>
            <span>{cpu}%</span>
          </div>
          <div className="w-full bg-red-950/30 h-3 rounded overflow-hidden border border-red-900/30">
            <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${cpu}%` }} />
          </div>
        </div>

        {/* Logs */}
        <div className="col-span-5 bg-[#030101] p-3 rounded border border-red-950/60 h-[72px] flex flex-col justify-center gap-1">
          {logs.map((log, i) => (
            <div key={i} className={`text-[10px] text-left truncate ${i === 0 ? 'text-red-400 font-bold' : 'text-red-900'}`}>
              &gt; {log}
            </div>
          ))}
        </div>

        {/* Counters */}
        <div className="col-span-2 text-right bg-red-950/10 border border-red-900/20 p-2 rounded">
          <span className="text-[10px] text-red-600 font-bold tracking-wide block uppercase leading-none">TOTAL RUNS</span>
          <span className="text-[18px] text-white font-black">{tasks}</span>
        </div>
      </div>
    </div>
  );
}

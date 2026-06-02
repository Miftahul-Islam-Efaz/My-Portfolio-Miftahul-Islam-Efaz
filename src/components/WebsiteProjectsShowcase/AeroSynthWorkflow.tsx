import React from 'react';

export default function AeroSynthWorkflow({ isHolo }: { isHolo: boolean }) {
  return (
    <div className="w-full h-full bg-[#05070d] text-slate-300 font-sans flex flex-col justify-between p-8">
      {/* Header Panel */}
      <div className="flex justify-between items-center border-b border-blue-950/40 pb-5 z-10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-600 rounded border border-blue-400 flex items-center justify-center text-[11px] text-white font-black font-mono">B</div>
          <div>
            <span className="font-mono text-[14px] font-extrabold text-white tracking-widest block leading-none">AEROSYNTH CHAT CORE</span>
            <span className="text-[8px] font-mono text-blue-500 uppercase tracking-widest">Multi-Agent Lead Intelligence</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
          <span className="text-[10px] font-mono text-blue-400 bg-blue-950/50 border border-blue-900/30 px-3 py-1 rounded">
            AGENT: ONLINE
          </span>
        </div>
      </div>

      {/* Main Dialogue Panel */}
      <div className="grid grid-cols-12 gap-6 my-4 flex-grow z-10 items-center">
        
        {/* Left Side: Mock Live AI Messaging Interface */}
        <div className="col-span-7 flex flex-col gap-4 self-stretch justify-center">
          <div className="bg-[#090d16] border border-blue-950/55 p-3 rounded-xl flex gap-3 shadow-lg">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-mono shrink-0">U</div>
            <div className="text-left">
              <span className="text-[9px] text-slate-600 block mb-0.5 uppercase tracking-wide">Agency Client Lead</span>
              <p className="text-[12px] text-stone-200 leading-normal">
                "Hello, I need to connect our checkout hub to dynamic webhook categorizers and shoot Slack alerts to team leaders. Can n8n handle this?"
              </p>
            </div>
          </div>

          <div className="bg-[#0b1424] border border-blue-900/40 p-4 rounded-xl flex gap-3 shadow-[0_10px_25px_rgba(59,130,246,0.1)] relative">
            <div className="absolute top-2 right-3 text-[8px] font-mono text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-900/30">
              MAPPED 100%
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-mono shrink-0 font-extrabold">AI</div>
            <div className="text-left">
              <span className="text-[9px] text-blue-400 block mb-0.5 uppercase tracking-widest font-extrabold">EFAZ AI INTEL BOT</span>
              <p className="text-[12px] text-stone-100 leading-normal font-medium text-left">
                "Triggered webhook payload successfully. Spawning Gemini Flash summarizer. Creating custom HubSpot leads cards &amp; dispatching instant Slack triggers. Execution completed in 1.4 seconds."
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Node flow / Success telemetry */}
        <div className="col-span-5 bg-[#030509] border border-blue-950/60 p-4 rounded-xl self-stretch flex flex-col justify-between shadow-xl">
          <div className="border-b border-blue-950/40 pb-3 text-left">
            <span className="text-[9px] font-mono text-blue-500 uppercase tracking-widest font-black">AI Orchestrator Pipeline</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 animate-pulse" />
              <span className="text-white text-[13px] font-black tracking-tight">Active Automation Hub</span>
            </div>
          </div>

          {/* Flow visual tree */}
          <div className="flex flex-col gap-2 my-2 text-[11px] font-mono">
            <div className="flex justify-between bg-blue-950/20 p-2 rounded border border-blue-900/10">
              <span className="text-slate-400">⚡ WEBHOOK PIN</span>
              <span className="text-emerald-400">LINKED</span>
            </div>
            <div className="flex justify-between bg-blue-950/20 p-2 rounded border border-blue-900/10">
              <span className="text-slate-400">🤖 GEMINI COGNITION</span>
              <span className="text-blue-400">PARSED</span>
            </div>
            <div className="flex justify-between bg-blue-950/20 p-2 rounded border border-blue-900/10">
              <span className="text-slate-400">💬 EXCEL / SLACK DISPATCH</span>
              <span className="text-emerald-400">COMPLETE</span>
            </div>
          </div>

          <div className="flex justify-between text-[11px] font-mono text-slate-500 border-t border-blue-950/40 pt-2 text-left uppercase">
            <span>Delay: 74ms</span>
            <span>Success: 100%</span>
          </div>
        </div>

      </div>

      {/* Diagnostics footer */}
      <div className="flex justify-between text-[10px] font-mono text-slate-500 tracking-widest pt-4 border-t border-blue-950/40 text-left uppercase">
        <span>Nodes Live: Active Sync</span>
        <span>Secure TLS 1.3</span>
      </div>
    </div>
  );
}

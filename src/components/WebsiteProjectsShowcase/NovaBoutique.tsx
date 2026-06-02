import React from 'react';

export default function NovaBoutique({ isHolo }: { isHolo: boolean }) {
  const products = [
    { name: "Raw Wool Overcoat", price: "$1,850", image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=350&auto=format&fit=crop" },
    { name: "Avant-Garde Shield", price: "$490", image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=350&auto=format&fit=crop" },
    { name: "Industrial Belt V2", price: "$320", image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=350&auto=format&fit=crop" },
  ];

  return (
    <div className="w-full h-full bg-[#0a0a0a] text-stone-200 font-sans flex flex-col justify-between p-8">
      {/* Luxury Minimalist Header */}
      <div className="flex justify-between items-end border-b border-[#222] pb-5 z-10">
        <div>
          <h1 className="font-serif italic text-[24px] tracking-widest text-[#f5f4f0] font-bold">N O V A</h1>
          <span className="text-[9px] font-mono tracking-[0.6em] text-stone-500 uppercase">HIGH ATELIER STUDIO</span>
        </div>
        <div className="flex gap-6 text-[11px] font-mono uppercase tracking-widest text-stone-300">
          <span className="hover:text-stone-400 cursor-pointer">COLLECTION</span>
          <span className="hover:text-stone-400 cursor-pointer">ARCHIVES</span>
          <span className="text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] tracking-tight">BAG (0)</span>
        </div>
      </div>

      {/* Main Grid: split Lookbook look */}
      <div className="grid grid-cols-12 gap-8 my-5 flex-grow items-center z-10">
        {/* Left Editorial Promo */}
        <div className="col-span-4 flex flex-col gap-3 pr-4 border-r border-[#1a1a1a]">
          <span className="text-amber-500 font-mono text-[10px] tracking-widest font-extrabold">[ PARIS ATELIER ]</span>
          <h2 className="text-[20px] font-serif leading-tight uppercase tracking-tight text-white font-extrabold text-left">TAILORED CHIC SILHOUETTES</h2>
          <p className="text-[12px] text-stone-400 leading-relaxed font-extralight text-left">
            Limited organic textiles structured to perfection. Integrated smoothly with live ecommerce logs.
          </p>
        </div>

        {/* Right Product Grid */}
        <div className="col-span-8 grid grid-cols-3 gap-4">
          {products.map((p, i) => (
            <div key={i} className="group flex flex-col bg-[#111] border border-[#222] p-2 rounded-lg hover:border-stone-700 transition-colors duration-500 cursor-pointer">
              <div className="relative aspect-[3/4] overflow-hidden rounded bg-stone-900 mb-2">
                <img 
                  src={p.image} 
                  alt={p.name}
                  className="w-full h-full object-cover filter grayscale group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[12px] font-bold text-stone-300 tracking-tight text-left truncate">{p.name}</span>
              <span className="text-[11px] font-mono text-amber-500 mt-0.5 text-left">{p.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* bottom luxury bar combined with automated webhook sync bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-stone-500 tracking-wider pt-4 border-t border-[#222]">
        <span>EST. 2026 // PARIS STUDIO</span>
        <span className="text-amber-500/80 bg-amber-950/20 border border-amber-900/30 px-3 py-1 rounded text-[9px]">
          [⚡ AUTOMATION ACTIVE: Synchronizing Stripe payments to CRM instantly]
        </span>
        <span>NOVA LUX &copy; RIGHTS SECURED</span>
      </div>
    </div>
  );
}

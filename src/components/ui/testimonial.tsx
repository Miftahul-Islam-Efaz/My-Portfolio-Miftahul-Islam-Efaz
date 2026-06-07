import { cn } from "../../lib/utils";
import React, { useState } from "react";

export default function TestimonialCards() {
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
                .testimonials-group {
                    font-family: 'Poppins', sans-serif;
                }
            `}</style>
            <div className="flex flex-wrap items-center justify-center gap-6 testimonials-group">
                <div className="max-w-80 bg-[#0F0B0A] text-white rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-xl">
                    <div className="relative -mt-px overflow-hidden rounded-2xl">
                        <img loading="lazy" src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780793320/08dbd16d-d0d6-4cf5-a0df-88bdffc6d1c3_g798k8.png" alt="John Doe" className="h-[270px] w-full rounded-2xl hover:scale-105 transition-transform duration-500 object-cover object-center transform-gpu will-change-transform" referrerPolicy="no-referrer" />
                        <div className="absolute bottom-0 z-10 h-60 w-full bg-gradient-to-t pointer-events-none from-[#0F0B0A] to-transparent"></div>
                    </div>
                    <div className="px-6 pb-6 relative z-20 -mt-8">
                        <p className="font-medium border-b border-white/10 pb-5 text-gray-300">“Radiant made undercutting all of our competitors an absolute breeze.”</p>
                        <p className="mt-4 font-semibold text-white">— John Doe</p>
                        <p className="text-sm font-medium bg-gradient-to-r from-[var(--color-taupe)] via-white to-[var(--color-taupe)] text-transparent bg-clip-text mt-1">Content Marketing</p>
                    </div>
                </div>
                <div className="max-w-80 bg-[#0F0B0A] text-white rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-xl">
                    <div className="relative -mt-px overflow-hidden rounded-2xl">
                        <img loading="lazy" src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780357662/ChatGPT_Image_Jun_2_2026_05_47_33_AM_vdadyi.png" alt="Zeyad" className="h-[270px] w-full rounded-2xl hover:scale-105 transition-transform duration-500 object-cover object-top transform-gpu will-change-transform" referrerPolicy="no-referrer" />
                        <div className="absolute bottom-0 z-10 h-60 w-full bg-gradient-to-t pointer-events-none from-[#0F0B0A] to-transparent"></div>
                    </div>
                    <div className="px-6 pb-6 relative z-20 -mt-8">
                        <p className="font-medium border-b border-white/10 pb-5 text-gray-300">“An exceptional experience. They exceeded expectations with professionalism, great communication, and attention to detail.”</p>
                        <p className="mt-4 font-semibold text-white">— Zeyad</p>
                        <p className="text-sm font-medium bg-gradient-to-r from-[var(--color-taupe)] via-white to-[var(--color-taupe)] text-transparent bg-clip-text mt-1">Medicine Specialist</p>
                    </div>
                </div>
                <div className="max-w-80 bg-[#0F0B0A] text-white rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-xl">
                    <div className="relative -mt-px overflow-hidden rounded-2xl">
                        <img loading="lazy" src="https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780793183/bcb9c565-1c3d-492a-9cb9-57b8da30f06e_ad8e70.png" alt="Raj" className="h-[270px] w-full rounded-2xl hover:scale-105 transition-transform duration-500 object-cover object-center transform-gpu will-change-transform" referrerPolicy="no-referrer" />
                        <div className="absolute bottom-0 z-10 h-60 w-full bg-gradient-to-t pointer-events-none from-[#0F0B0A] to-transparent"></div>
                    </div>
                    <div className="px-6 pb-6 relative z-20 -mt-8">
                        <p className="font-medium border-b border-white/10 pb-5 text-gray-300">“Efaz doesn't just write code; he architects scalable solutions that endure.”</p>
                        <p className="mt-4 font-semibold text-white">— Raj</p>
                        <p className="text-sm font-medium bg-gradient-to-r from-[var(--color-taupe)] via-white to-[var(--color-taupe)] text-transparent bg-clip-text mt-1">E-com</p>
                    </div>
                </div>
            </div>
        </>
    );
}

import { cn } from "../../lib/utils";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  quote: string;
  image_url: string;
  sort_order: number;
}

const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'client-1',
    name: 'John Doe',
    role: 'Content Marketing',
    quote: '“Radiant made undercutting all of our competitors an absolute breeze.”',
    image_url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780793320/08dbd16d-d0d6-4cf5-a0df-88bdffc6d1c3_g798k8.png',
    sort_order: 1
  },
  {
    id: 'client-2',
    name: 'Zeyad',
    role: 'Medicine Specialist',
    quote: '“An exceptional experience. They exceeded expectations with professionalism, great communication, and attention to detail.”',
    image_url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780357662/ChatGPT_Image_Jun_2_2026_05_47_33_AM_vdadyi.png',
    sort_order: 2
  },
  {
    id: 'client-3',
    name: 'Raj',
    role: 'E-com',
    quote: '“Efaz doesn\'t just write code; he architects scalable solutions that endure.”',
    image_url: 'https://res.cloudinary.com/dr2tc3dyk/image/upload/v1780793183/bcb9c565-1c3d-492a-9cb9-57b8da30f06e_ad8e70.png',
    sort_order: 3
  }
];

export default function TestimonialCards() {
    const [testimonials, setTestimonials] = useState<TestimonialItem[]>(DEFAULT_TESTIMONIALS);

    useEffect(() => {
        async function fetchTestimonials() {
            try {
                const { data, error } = await supabase
                    .from('testimonials')
                    .select('*')
                    .order('sort_order', { ascending: true });
                if (data && !error && data.length > 0) {
                    setTestimonials(data);
                }
            } catch (err) {
                console.warn("Failed to load testimonials from Supabase:", err);
            }
        }
        fetchTestimonials();
    }, []);

    return (
        <>
            <style>{`
                .testimonials-group {
                    font-family: 'Poppins', sans-serif;
                }
            `}</style>
            <div className="flex flex-wrap items-center justify-center gap-6 testimonials-group">
                {testimonials.map((item) => (
                    <div key={item.id} className="max-w-80 bg-[#0F0B0A] text-white rounded-2xl border border-[rgba(255,255,255,0.05)] shadow-xl">
                        <div className="relative -mt-px overflow-hidden rounded-2xl">
                            <img loading="lazy" src={item.image_url} alt={item.name} className="h-[270px] w-full rounded-2xl hover:scale-105 transition-transform duration-500 object-cover object-center transform-gpu will-change-transform" referrerPolicy="no-referrer" />
                            <div className="absolute bottom-0 z-10 h-60 w-full bg-gradient-to-t pointer-events-none from-[#0F0B0A] to-transparent"></div>
                        </div>
                        <div className="px-6 pb-6 relative z-20 -mt-8">
                            <p className="font-medium border-b border-white/10 pb-5 text-gray-300">{item.quote}</p>
                            <p className="mt-4 font-semibold text-white">— {item.name}</p>
                            <p className="text-sm font-medium bg-gradient-to-r from-[var(--color-taupe)] via-white to-[var(--color-taupe)] text-transparent bg-clip-text mt-1">{item.role}</p>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

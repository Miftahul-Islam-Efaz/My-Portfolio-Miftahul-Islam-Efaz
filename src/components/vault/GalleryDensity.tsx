'use client';
import { useEffect, useState } from 'react';
import { Grid2X2, Grid3X3 } from 'lucide-react';
export type GalleryDensity = 'default' | 'compact';
export function useGalleryDensity() {
 const [density, setDensity] = useState<GalleryDensity>('default');
 useEffect(() => {try {if(localStorage.getItem('gallery-density') === 'compact')setDensity('compact');}catch{}},[]);
 const change = (next: GalleryDensity) => {setDensity(next);try{localStorage.setItem('gallery-density',next);}catch{}};
 return [density, change] as const;
}
export default function GalleryDensityButton({density,onChange}:{density:GalleryDensity;onChange:(next:GalleryDensity)=>void}) {
 return <button className="vg-density" type="button" aria-label={density==='default'?'Use compact grid':'Use default grid'} aria-pressed={density==='compact'} title={density==='default'?'Smaller images, more in view':'Larger images, more detail'} onClick={()=>onChange(density==='default'?'compact':'default')}>{density==='default'?<Grid2X2 size={18}/>:<Grid3X3 size={18}/>}<span>{density==='default'?'Default':'Compact'}</span></button>;
}

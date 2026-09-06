'use client';
import {useLayoutEffect, type RefObject} from 'react';

/** O(items × columns) only when content/width changes. No grid tracks,
 * scroll listeners, perpetual animation loop, or per-scroll DOM reads. */
export function useNaturalMasonry(ref: RefObject<HTMLDivElement | null>, items: readonly unknown[]) {
 useLayoutEffect(() => {
  const grid=ref.current;if(!grid)return;
  const cards=Array.from(grid.querySelectorAll<HTMLElement>('.vg-card'));
  const heights=new Map<HTMLElement,number>();
  let width=grid.clientWidth, frame=0;
  const layout=()=>{
   frame=0;
   const style=getComputedStyle(grid);
   const columns=Math.max(1,parseInt(style.getPropertyValue('--vg-natural-columns'))||1);
   const gap=parseFloat(style.getPropertyValue('--vg-natural-gap'))||0;
   const cardWidth=(width-gap*(columns-1))/columns;
   const bottoms=Array(columns).fill(0) as number[];
   for(const card of cards){
    const column=bottoms.indexOf(Math.min(...bottoms));
    const left=`${column*(cardWidth+gap)}px`,top=`${Math.round(bottoms[column])}px`;
    if(card.style.left!==left)card.style.left=left;
    if(card.style.top!==top)card.style.top=top;
    bottoms[column]+=heights.get(card)??480;
   }
   const height=`${Math.ceil(Math.max(0,...bottoms))}px`;
   if(grid.style.height!==height)grid.style.height=height;
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(layout)};
  const observer=new ResizeObserver(entries=>{
   let changed=false;
   for(const entry of entries){
    if(entry.target===grid){if(Math.abs(width-entry.contentRect.width)>.5){width=entry.contentRect.width;changed=true;}continue;}
    const card=entry.target.parentElement;if(!card)continue;
    const height=entry.contentRect.height;
    if(Math.abs((heights.get(card)??0)-height)>.5){heights.set(card,height);changed=true;}
   }
   if(changed)schedule();
  });
  // One initial read pass, then one write pass before paint. ResizeObserver
  // supplies subsequent dimensions (image decode, font load, density toggle).
  for(const card of cards){const body=card.querySelector<HTMLElement>('.vg-card__body');if(body){heights.set(card,body.getBoundingClientRect().height);observer.observe(body);}}
  observer.observe(grid);layout();
  const videos=new IntersectionObserver(entries=>{for(const e of entries)if(!e.isIntersecting)(e.target as HTMLVideoElement).pause();},{root:grid.closest('.vault-window__scroller, .wg__scroller')});
  grid.querySelectorAll('video').forEach(video=>videos.observe(video));
  return()=>{observer.disconnect();videos.disconnect();cancelAnimationFrame(frame)};
 },[ref,items]);
}

'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';

export default function GalleryCategoryPicker({ value, options, onChange, label = 'Category', disabled = false }: {
 value: string; options: Array<{id: string; label: string}>; onChange: (value: string) => void; label?: string; disabled?: boolean;
}) {
 const id = useId();
 const trigger = useRef<HTMLButtonElement>(null);
 const menu = useRef<HTMLDivElement>(null);
 const [open, setOpen] = useState(false);
 const [position, setPosition] = useState({left: 12, top: 12, width: 300, maxHeight: 300});
 const [host, setHost] = useState<Element | null>(null);
 const choices = [{id: '__all__', label: 'All categories'}, ...options];
 const selected = Math.max(0, choices.findIndex(option => option.id === value));
 const [cursor, setCursor] = useState(0);
 const close = (restore = false) => { setOpen(false); if (restore) trigger.current?.focus({preventScroll: true}); };
 useEffect(() => { setHost(trigger.current?.closest('.vault-window__panel, .wg') ?? document.body); }, []);
 useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
 useEffect(() => {
  if (!open) return;
  const measure = () => {
   const rect = trigger.current?.getBoundingClientRect(); if (!rect) return;
   const vv = window.visualViewport;
   const width = Math.min(340, (vv?.width ?? innerWidth) - 24);
   const ceiling = (vv?.offsetTop ?? 0) + 12, floor = (vv?.offsetTop ?? 0) + (vv?.height ?? innerHeight) - 12;
   const above = rect.top - ceiling - 10, below = floor - rect.bottom - 10;
   const maxHeight = Math.min(360, Math.max(above, below));
   const height = Math.min(maxHeight, choices.length * 44 + 62);
   setPosition({width, left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)), top: above > below ? Math.max(ceiling, rect.top - height - 10) : rect.bottom + 10, maxHeight});
  };
  measure(); setCursor(selected);
  const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(); };
  const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); close(true); } };
  document.addEventListener('pointerdown', outside);
  window.addEventListener('keydown', escape, true);
  window.addEventListener('resize', measure); window.visualViewport?.addEventListener('resize', measure);
  return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('keydown', escape, true); window.removeEventListener('resize', measure); window.visualViewport?.removeEventListener('resize', measure); };
 }, [open, selected, choices.length]);
 useEffect(() => {
  if (!open) return;
  const button = menu.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[cursor];
  button?.focus({preventScroll: true});
  if (button) { const list = button.parentElement!; if (button.offsetTop < list.scrollTop) list.scrollTop = button.offsetTop; else if (button.offsetTop + button.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = button.offsetTop + button.offsetHeight - list.clientHeight; }
 }, [open, cursor, position]);
 return <>
  <button ref={trigger} type="button" className="vg-picker-trigger" aria-label={label + ': ' + choices[selected].label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled} onClick={() => setOpen(v => !v)} onKeyDown={event => {if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {event.preventDefault();setOpen(true);}}}><span>{choices[selected].label}</span><ChevronDown size={15} aria-hidden="true" /></button>
  {open && host && createPortal(<div className="vault-gallery--natural vg-picker-menu" ref={menu} style={position} data-lenis-prevent onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
   <div className="vg-picker-heading"><span>Filter collection</span><button type="button" aria-label="Close categories" onClick={() => close(true)}><X size={16} /></button></div>
   <div id={id} role="listbox" aria-label={label} className="vg-picker-options" onKeyDown={event => {
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {event.preventDefault();setCursor(i => event.key === 'Home' ? 0 : event.key === 'End' ? choices.length-1 : (i+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length);}
    else if (event.key.length === 1 && event.key !== ' ') {const next = choices.findIndex(o => o.label.toLowerCase().startsWith(event.key.toLowerCase()));if(next >= 0)setCursor(next);}
   }}>
    {choices.map((option, index) => <button key={option.id} type="button" role="option" aria-selected={value===option.id} tabIndex={cursor===index?0:-1} onFocus={() => setCursor(index)} onClick={() => {close(true);onChange(option.id);}}><span>{option.label}</span>{value===option.id && <Check size={16} aria-hidden="true" />}</button>)}
   </div>
  </div>,host)}
 </>;
}

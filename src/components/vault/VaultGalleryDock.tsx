'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown } from 'lucide-react';
import { VAULT_GALLERY_TABS, type VaultGalleryTab } from './vaultGalleryContent';

import '@/styles/vault-dock.css';
import GalleryCategoryPicker from './GalleryCategoryPicker';
import GalleryDensityButton, {type GalleryDensity} from './GalleryDensity';
import '@/styles/gallery-controls.css';

type Props = {
  active: boolean;
  workMode?: boolean;
  density: GalleryDensity;
  onDensity: (density: GalleryDensity) => void;
  tab: VaultGalleryTab;
  category: string;
  query: string;
  categories: Array<{ id: string; label: string }>;
  count: number;
  onTab: (tab: VaultGalleryTab) => void;
  onCategory: (category: string) => void;
  onQuery: (query: string) => void;
};

/** One small composited surface, not a blurred layer over the whole gallery. */
export default function VaultGalleryDock(props: Props) {
  const { active, tab, category, query, categories, count, onTab, onCategory, onQuery, workMode, density, onDensity } = props;
  const [host, setHost] = useState<Element | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const marker = useRef<HTMLSpanElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const dock = useRef<HTMLDivElement>(null);

  useEffect(() => { setHost(marker.current?.closest('.vault-window__panel, .wg') ?? null); }, []);
  useEffect(() => {
    if (!active) setSearchOpen(false);
  }, [active]);
  useEffect(() => {
    if (searchOpen) input.current?.focus({ preventScroll: true });
  }, [searchOpen]);
  // Keep the search above a phone's software keyboard without per-scroll React work.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport || !searchOpen) return;
    const resize = () => dock.current?.style.setProperty('--vg-keyboard', `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`);
    resize(); viewport.addEventListener('resize', resize);
    return () => { viewport.removeEventListener('resize', resize); dock.current?.style.removeProperty('--vg-keyboard'); };
  }, [searchOpen]);

  if (!host) return <span ref={marker} hidden />;
  const closeSearch = () => { setSearchOpen(false); toggle.current?.focus({ preventScroll: true }); };
  return createPortal(
    <div ref={dock} className="vault-gallery--natural vg-dock-host" data-visible={active} inert={!active} aria-hidden={!active}>
      <div className="vg-dock" aria-label="Gallery quick controls" role="region" onKeyDown={event => {
        if (event.key === 'Escape' && searchOpen) { event.stopPropagation(); closeSearch(); }
      }}>
        {searchOpen && <div className="vg-dock__search-panel">
          <label className="vg-search"><Search size={17} aria-hidden="true" /><input ref={input} type="search" value={query} onChange={event => onQuery(event.target.value)} placeholder="Search the collection" aria-label="Search gallery from quick controls" />
            {query && <button type="button" className="vg-search__clear" aria-label="Clear search" onClick={() => { onQuery(''); input.current?.focus(); }}><X size={15} /></button>}
          </label>
          <div className="vg-dock__search-meta"><span role="status">{count} {workMode ? 'projects' : tab === 'visuals' ? 'visuals' : 'tools'}</span><button type="button" onClick={closeSearch}>Done</button></div>
        </div>}
        {workMode ? <span className="vg-dock__work">Work</span> : <div className="vg-tabs" role="group" aria-label="Quick collection type">
          {VAULT_GALLERY_TABS.map(option => <button key={option.id} type="button" aria-pressed={tab === option.id} onClick={() => onTab(option.id)}>{option.label}</button>)}
        </div>}
        <span className="vg-dock__divider" aria-hidden="true" />
        <div className="vg-dock__category"><GalleryCategoryPicker label="Quick category filter" value={category} options={categories} onChange={onCategory} disabled={!active} /></div>
        <GalleryDensityButton density={density} onChange={onDensity} />
        <button ref={toggle} type="button" className="vg-dock__search-toggle" data-active={Boolean(query) || searchOpen} aria-label={searchOpen ? 'Close gallery search' : 'Search gallery'} aria-expanded={searchOpen} onClick={() => setSearchOpen(value => !value)}><Search size={18} aria-hidden="true" /><span>Search</span>{query && <i aria-label="Search is active" />}</button>
      </div>
    </div>, host,
  );
}

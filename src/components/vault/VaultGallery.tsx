'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowUpRight, X } from 'lucide-react';
import { uiSoundHandlers } from '@/lib/uiSounds';
import { driveImage } from '@/lib/driveImage';
import { galleryImage } from '@/lib/galleryImage';
import { galleryOriginal, galleryThumb, VAULT_GALLERY_ITEMS, VAULT_GALLERY_TABS, type VaultGalleryTab } from './vaultGalleryContent';
import VaultItemWindow, { type VaultTile } from './VaultItemWindow';
import '@/styles/vault-natural.css';
import VaultGalleryDock from './VaultGalleryDock';
import {useNaturalMasonry} from './useNaturalMasonry';
import '@/styles/gallery-performance.css';
import GalleryCategoryPicker from './GalleryCategoryPicker';
import GalleryDensityButton, {useGalleryDensity} from './GalleryDensity';
import type {WorkProjectCardData} from '@/components/work/types';
import {getCaseStudy} from '@/components/work/caseStudyData';

const ALL = '__all__';
type VaultFeed = {
  visuals: Array<{ id: string; title: string; caption: string; prompt: string; thumbUrl: string; originalUrl: string; mediaType: 'image' | 'video'; posterUrl: string; category: string | null }>;
  categories: Array<{ id: string; label: string }>;
  tools: Array<{ id: string; title: string; caption: string; imageUrl: string; toolUrl: string | null; note: string; category: string }>;
};

/** Intrinsic media sizes and event-driven masonry. No scroll-time layout or blur. */
export default function VaultGallery({ projects, onProjectSelect }: {projects?: WorkProjectCardData[]; onProjectSelect?: (selection: {id: string; x: number; y: number}) => void} = {}) {
  const workMode = projects !== undefined;
  const [density, setDensity] = useGalleryDensity();
  const [tab, setTab] = useState<VaultGalleryTab>('visuals');
  const [remote, setRemote] = useState<VaultFeed | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [open, setOpen] = useState<VaultTile | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const reposition = useRef(false);
  const [dockVisible, setDockVisible] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (workMode) return;
    const controller = new AbortController();
    fetch('/api/vault', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data && Array.isArray(data.visuals) && Array.isArray(data.tools) && Array.isArray(data.categories)) setRemote(data); })
      .catch(() => { /* Retain the existing offline fallback. */ });
    return () => controller.abort();
  }, [workMode]);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const items = useMemo<VaultTile[]>(() => {
    if (projects) return projects.map(project => ({id: project.id, kind: 'tool', title: project.title, caption: project.siteType || project.category,
      thumb: project.imageUrl, full: project.imageUrl, mediaType: 'image', poster: project.imageUrl,
      prompt: '', category: project.siteType || project.category, note: project.description ?? '', toolUrl: project.linkUrl}));
    if (remote) {
      if (tab === 'tools') return remote.tools.map(tool => ({
        id: tool.id, kind: 'tool', title: tool.title, caption: tool.caption,
        thumb: tool.imageUrl, full: tool.imageUrl, mediaType: 'image', poster: tool.imageUrl,
        prompt: '', category: tool.category, note: tool.note, toolUrl: tool.toolUrl,
      }));
      return remote.visuals.map(visual => ({
        id: visual.id, kind: 'visual', title: visual.title, caption: visual.caption,
        thumb: visual.thumbUrl, full: visual.originalUrl, mediaType: visual.mediaType,
        poster: visual.posterUrl, prompt: visual.prompt, category: visual.category ?? '', note: '', toolUrl: null,
      }));
    }
    return VAULT_GALLERY_ITEMS.filter(item => item.tab === tab).map(item => ({
      id: item.id, kind: tab === 'tools' ? 'tool' : 'visual', title: item.title, caption: item.caption,
      thumb: galleryThumb(item), full: galleryOriginal(item), mediaType: 'image', poster: galleryThumb(item),
      prompt: '', category: '', note: '', toolUrl: null,
    }));
  }, [remote, tab, projects]);

  const categories = useMemo(() => {
    const present = Array.from(new Set(items.map(item => item.category).filter(Boolean)));
    const known = new Set((remote?.categories ?? []).map(entry => entry.id));
    const ordered = (remote?.categories ?? []).filter(entry => present.includes(entry.id));
    const loose = present.filter(value => (workMode || tab === 'tools') && !known.has(value)).sort((a, b) => a.localeCompare(b)).map(value => ({ id: value, label: value }));
    return [...ordered, ...loose];
  }, [items, remote, tab, workMode]);
  const labelFor = useMemo(() => new Map((remote?.categories ?? []).map(entry => [entry.id, entry.label])), [remote]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter(item => (category === ALL || item.category === category) && (!needle || [item.title, item.caption, labelFor.get(item.category) ?? item.category].join(' ').toLowerCase().includes(needle)));
  }, [items, query, category, labelFor]);

  useNaturalMasonry(gridRef, visible);

  // Browser intersection signals only; no scroll handler walks all the cards.
  useEffect(() => {
    const section = sectionRef.current;
    const controls = controlsRef.current;
    const root = section?.closest('.vault-window__scroller, .wg__scroller');
    if (!section || !controls || !root) return;
    let past = false, inside = false;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === controls) past = entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0);
        if (entry.target === section) inside = entry.isIntersecting;
      }
      setDockVisible(past && inside);
    }, { root, threshold: 0 });
    observer.observe(controls); observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Filtering from deep in the gallery must show the new results, not leave
  // the visitor at an old scroll offset below them. The window's Lenis owns it.
  useLayoutEffect(() => {
    if (!reposition.current) return;
    reposition.current = false;
    const root = sectionRef.current?.closest('.vault-window__scroller, .wg__scroller');
    root?.dispatchEvent(new CustomEvent('vault:results', { detail: gridRef.current }));
  }, [visible, density]);
  const fromDock = (update: () => void) => { reposition.current = true; update(); };

  const changeTab = (next: VaultGalleryTab) => {
    setTab(next); setCategory(ALL); setQuery(''); setCopyError('');
  };
  const reset = () => { setCategory(ALL); setQuery(''); };
  const copyPrompt = async (item: VaultTile) => {
    try {
      await navigator.clipboard.writeText(item.prompt);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      setCopied(item.id); setCopyError('');
      copyTimer.current = setTimeout(() => setCopied(null), 1600);
    } catch { setCopyError('Copy unavailable. Open the image to select its prompt.'); }
  };

  return (
    <section ref={sectionRef} className="vault-gallery vault-gallery--natural" {...uiSoundHandlers} data-density={density} aria-label={workMode ? "Work gallery" : "Vault gallery"}>
      {!workMode && <span className="vault-gallery__dawn" aria-hidden="true" />}
      <div className="vg-container">
        <header className="vg-header">
          <div><p className="vg-eyebrow">{workMode ? "SELECTED WORK" : "THE COLLECTION"}</p><h2 className="vg-heading">{workMode ? "Ideas, brought to life." : "A space for discovery."}</h2></div>
          <p className="vg-intro">{workMode ? <>Websites & digital experiences.<br />Explore the projects and their stories.</> : <>Visual experiments & useful tools.<br />Explore, collect, make something new.</>}</p>
        </header>
        <div className="vg-controls" ref={controlsRef}>
          <div className="vg-controls__row">
            {workMode ? <span className="vg-collection-label">All projects</span> : <div className="vg-tabs" role="group" aria-label="Collection type">
              {VAULT_GALLERY_TABS.map(option => <button key={option.id} type="button" aria-pressed={tab === option.id} onClick={() => changeTab(option.id)}>{option.label}</button>)}
            </div>}
            <GalleryDensityButton density={density} onChange={setDensity} />
            <label className="vg-search"><Search size={18} aria-hidden="true" /><input type="search" value={query} placeholder="Search the collection" aria-label="Search by title or category" onChange={event => setQuery(event.target.value)} />{query && <button type="button" className="vg-search__clear" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}</label>
          </div>
          {categories.length > 0 && <div className="vg-categories" role="group" aria-label="Filter by category">
            <button type="button" aria-pressed={category === ALL} onClick={() => setCategory(ALL)}>All</button>
            {categories.map(entry => <button key={entry.id} type="button" aria-pressed={category === entry.id} onClick={() => setCategory(entry.id)}>{entry.label}</button>)}
          </div>}
          {categories.length > 0 && <div className="vg-category-select"><span>Category</span><GalleryCategoryPicker value={category} options={categories} onChange={setCategory} /></div>}
        </div>
        <div className="vg-results" ref={resultsRef}>
          <p role="status" aria-live="polite">{visible.length} {workMode ? 'projects' : tab === 'visuals' ? 'visuals' : 'tools'}{category !== ALL ? ` / ${labelFor.get(category) ?? category}` : ' / All categories'}<span className="vg-sort-label"> · Newest added</span></p>
          {(query || category !== ALL) && <button type="button" onClick={reset}>Clear filters</button>}
        </div>
        {copyError && <p role="status" className="vg-message">{copyError}</p>}
        <div className="vg-grid" ref={gridRef}>
        {visible.length === 0 && <div className="vg-empty"><h3>No matches this time.</h3><p>Try another title or category.</p><button type="button" onClick={reset}>Show everything</button></div>}
          {visible.map(item => <article className="vg-card" key={`${tab}-${item.id}`}><div className="vg-card__body"><div className="vg-card__surface">
            <a className="vg-card__link" href={workMode ? item.toolUrl || driveImage(item.full) : driveImage(item.full)} target={workMode ? "_blank" : undefined} rel={workMode ? "noreferrer" : undefined} aria-label={`Open ${item.title}`} onClick={event => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              if (workMode) {
                if (!getCaseStudy(item.id)) return;
                event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect();
                onProjectSelect?.({id: item.id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2}); return;
              }
              event.preventDefault(); setOpen(item);
            }}>
              <div className="vg-card__media">
                {item.mediaType === 'video' ? <video src={driveImage(item.full)} poster={driveImage(item.poster)} muted loop playsInline preload="metadata" aria-label={item.title}
                  onMouseEnter={event => { if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) void event.currentTarget.play().catch(() => {}); }}
                  onMouseLeave={event => event.currentTarget.pause()}
                  onLoadedMetadata={event => { const v = event.currentTarget; if (v.videoWidth && v.videoHeight) v.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`; }} /> :
                  // Intrinsic ratio, not a portrait crop. Full-res loads only on open.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img {...galleryImage(item.thumb || item.full, density === 'compact')} alt={item.title} referrerPolicy="no-referrer" loading="lazy" decoding="async" draggable={false} onError={event => {
                    const img = event.currentTarget;
                    if (!img.dataset.retried) { img.dataset.retried = 'true'; img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = driveImage(item.thumb || item.full); } else if (img.dataset.retried === 'true' && item.full !== item.thumb) { img.dataset.retried = 'full'; img.src = driveImage(item.full); }
                  }} />}
                {item.mediaType === 'video' && <span className="vg-card__video">Video</span>}
              </div>
              <div className="vg-card__caption"><div><h3>{item.title}</h3>{item.caption && <p>{item.caption}</p>}</div><ArrowUpRight size={18} aria-hidden="true" /></div>
            </a>
            {item.kind === 'visual' && item.prompt && <button type="button" className="vg-copy" onClick={() => void copyPrompt(item)} aria-label={`Copy prompt for ${item.title}`}>{copied === item.id ? 'Copied' : 'Copy prompt'}</button>}
          </div></div></article>)}
        </div>
      </div>
      <VaultGalleryDock workMode={workMode} density={density} onDensity={next => fromDock(() => setDensity(next))} active={dockVisible && !open} tab={tab} category={category} query={query} categories={categories} count={visible.length}
        onTab={next => fromDock(() => changeTab(next))} onCategory={next => fromDock(() => setCategory(next))} onQuery={next => fromDock(() => setQuery(next))} />
      <VaultItemWindow item={open} categoryLabel={open ? labelFor.get(open.category) : undefined} onClose={() => setOpen(null)} />
    </section>
  );
}

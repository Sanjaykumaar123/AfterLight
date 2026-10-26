import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Search } from 'lucide-react';
import {
  CelestialTarget,
  CURATED_TARGETS,
  HERO_FEATURED_IMAGE,
} from '../data/objects';
import { useLenisInstance } from '../lib/lenisContext';

interface HomePageProps {
  onSelectObject: (objectId: string) => void;
  onOpenExplorerWithQuery: (query: string) => Promise<string | null>;
  onNavigateExplore: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectObject,
  onOpenExplorerWithQuery,
  onNavigateExplore,
}) => {
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeObjectId, setActiveObjectId] = useState<string>(
    CURATED_TARGETS[0]?.id ?? 'barnards-star'
  );

  const lenis = useLenisInstance();
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const heroFigureRef = useRef<HTMLElement | null>(null);
  const heroImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!lenis) return;

    const rafId = requestAnimationFrame(() => {
      lenis.resize();
    });

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleScroll = (instance: { progress?: number }) => {
      if (progressBarRef.current) {
        const clamped = Math.max(0, Math.min(1, instance.progress || 0));
        progressBarRef.current.style.transform = `scaleX(${clamped})`;
      }

      if (!prefersReducedMotion && heroFigureRef.current && heroImageRef.current) {
        const rect = heroFigureRef.current.getBoundingClientRect();
        const travel = Math.max(
          0,
          Math.min(1, -rect.top / Math.max(1, rect.height))
        );
        const scale = 1 + travel * 0.035;
        const shiftY = -travel * 10;
        heroImageRef.current.style.transform = `translate3d(0, ${shiftY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      }
    };

    const unsubscribe = lenis.on('scroll', handleScroll);

    return () => {
      cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, [lenis]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-object-id');
          if (id) {
            setActiveObjectId((prev) => (prev === id ? prev : id));
          }
        }
      },
      {
        rootMargin: '-22% 0px -52% 0px',
        threshold: [0.15, 0.4, 0.7],
      }
    );

    const nodes = document.querySelectorAll('[data-object-id]');
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);

  const scrollToTarget = (
    target: string | number,
    offset = -80,
    duration = 1.2
  ) => {
    if (typeof target === 'number') {
      if (lenis) {
        lenis.scrollTo(Math.max(0, target), { duration });
      } else {
        window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      }
      return;
    }

    const el = document.querySelector(target);
    if (!el) return;

    if (lenis) {
      lenis.resize();
      const docY = Math.max(0, window.scrollY + el.getBoundingClientRect().top + offset);
      lenis.scrollTo(docY, { duration });
    } else {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchText.trim();
    if (!trimmed) {
      setSearchError(
        'Enter an object name (e.g. WISE 0855) or J2000 coordinates.'
      );
      return;
    }
    setSearching(true);
    setSearchError(null);
    const err = await onOpenExplorerWithQuery(trimmed);
    setSearching(false);
    if (err) {
      setSearchError(err);
    }
  };

  const quickSearch = async (example: string) => {
    setSearchText(example);
    setSearching(true);
    setSearchError(null);
    const err = await onOpenExplorerWithQuery(example);
    setSearching(false);
    if (err) {
      setSearchError(err);
    }
  };

  return (
    <main className="bg-white relative">
      {/* Subtle Lenis Scroll Progress Hairline below sticky header */}
      <div
        aria-hidden="true"
        className="fixed top-16 left-0 right-0 h-[2px] z-30 pointer-events-none bg-transparent"
      >
        <div
          ref={progressBarRef}
          className="h-full bg-[#0B3D91] origin-left will-change-transform"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* Editorial Hero Section */}
      <section className="border-b border-[#DADCE0]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-10 pb-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#0B3D91]">
                Explore the Changing Universe · NASA Space Apps Challenge 2026
              </p>
              <h1 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight text-[#202124] leading-[1.12] [text-wrap:balance]">
                Exploring the Universe Through Time
              </h1>
              <p className="mt-4 text-base sm:text-lg text-[#4B5563] leading-relaxed max-w-2xl">
                Discover the hidden motion and changing light of our universe through
                NASA&apos;s SPHEREx observations.
              </p>
            </div>

            <nav
              aria-label="Homepage section shortcuts"
              className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#0B3D91] shrink-0"
            >
              <button
                type="button"
                onClick={() => scrollToTarget('#explore-spherex', -64, 1.15)}
                className="inline-flex items-center gap-1.5 hover:text-[#1A73B8] transition-colors whitespace-nowrap"
              >
                <span>Search Coordinates</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <span className="text-[#DADCE0]" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={() => scrollToTarget('#featured-objects', -64, 1.2)}
                className="inline-flex items-center gap-1.5 hover:text-[#1A73B8] transition-colors whitespace-nowrap"
              >
                <span>Featured Objects</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </nav>
          </div>

          {/* Large Featured Astronomical Image */}
          <figure
            ref={heroFigureRef}
            className="mt-8 border border-[#DADCE0] bg-[#090C12]"
          >
            <div className="overflow-hidden bg-[#090C12]">
              <img
                ref={heroImageRef}
                src={HERO_FEATURED_IMAGE.url}
                alt={HERO_FEATURED_IMAGE.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[500px] object-cover block will-change-transform"
              />
            </div>
            <figcaption className="bg-[#F5F6F7] border-t border-[#DADCE0] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1 max-w-3xl">
                <div className="text-sm font-semibold text-[#202124]">
                  {HERO_FEATURED_IMAGE.title}
                </div>
                <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                  {HERO_FEATURED_IMAGE.caption}
                </p>
              </div>
              <span className="text-xs font-mono text-[#4B5563] sm:whitespace-nowrap sm:shrink-0">
                {HERO_FEATURED_IMAGE.label}
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Explore SPHEREx & Prominent Coordinate/Object Search */}
      <section id="explore-spherex" className="border-b border-[#DADCE0] bg-[#F5F6F7]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <h2 className="text-2xl font-bold text-[#202124] tracking-tight">
                Explore SPHEREx
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-[#4B5563] leading-relaxed">
                Travel across infrared wavelengths and observation epochs to investigate
                stars, brown dwarfs, asteroids, comets and other celestial objects.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onNavigateExplore}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B3D91] hover:text-[#1A73B8] transition-colors"
                >
                  <span>Open SPHEREx Observation Explorer</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-[#DADCE0] p-5 sm:p-6">
              <form onSubmit={handleSearch} className="space-y-3">
                <label
                  htmlFor="home-sky-search"
                  className="block text-sm font-semibold text-[#202124]"
                >
                  Target Name or J2000 Sky Coordinates
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="home-sky-search"
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search an object, celestial region or coordinates..."
                      className="w-full border border-[#DADCE0] bg-white pl-10 pr-3.5 py-2.5 text-sm text-[#202124] placeholder:text-[#6B7280] focus:outline-none focus:border-[#0B3D91]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-5 py-2.5 bg-[#0B3D91] text-white text-sm font-medium hover:bg-[#1A73B8] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                  >
                    {searching ? 'Resolving...' : 'Explore Sky'}
                  </button>
                </div>

                {searchError && (
                  <p role="alert" className="text-xs text-[#B91C1C]">
                    {searchError}
                  </p>
                )}

                <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#4B5563]">
                  <span>Examples:</span>
                  <button
                    type="button"
                    onClick={() => quickSearch('WISE 0855')}
                    className="text-[#1A73B8] hover:underline font-medium"
                  >
                    WISE 0855
                  </button>
                  <button
                    type="button"
                    onClick={() => quickSearch('08h55m10.831s -07d14m42.53s')}
                    className="text-[#1A73B8] hover:underline font-mono"
                  >
                    08h55m10.831s -07d14m42.53s
                  </button>
                  <button
                    type="button"
                    onClick={() => quickSearch("Barnard's Star")}
                    className="text-[#1A73B8] hover:underline font-medium"
                  >
                    Barnard&apos;s Star
                  </button>
                  <button
                    type="button"
                    onClick={() => quickSearch('269.452, 4.693')}
                    className="text-[#1A73B8] hover:underline font-mono"
                  >
                    269.452, 4.693
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cosmic Objects — Sticky Editorial Index + Scrolling Photojournal Plates */}
      <section
        id="featured-objects"
        className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14"
      >
        <div className="lg:grid lg:grid-cols-12 lg:gap-10 items-start">
          {/* Sticky Left Editorial Column */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 self-start">
            <div className="text-xs font-mono uppercase tracking-wider text-[#0B3D91]">
              5 Benchmark Targets · J2000 ICRS
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#202124] tracking-tight [text-wrap:balance]">
              Featured Cosmic Objects
            </h2>
            <p className="mt-2.5 text-sm text-[#4B5563] leading-relaxed">
              Preconfigured benchmark targets illustrating high proper motion,
              brown dwarf thermal emission, and infrared variability across
              multi-year baselines.
            </p>

            {/* Numbered Sticky Index (desktop & tablet quick-jump) */}
            <nav
              aria-label="Featured objects index"
              className="mt-6 border-y border-[#DADCE0] divide-y divide-[#DADCE0]"
            >
              {CURATED_TARGETS.map((obj, idx) => {
                const isActive = activeObjectId === obj.id;
                const ordinal = String(idx + 1).padStart(2, '0');
                return (
                  <button
                    key={obj.id}
                    type="button"
                    data-testid={`sticky-index-${obj.id}`}
                    onClick={() => {
                      setActiveObjectId(obj.id);
                      scrollToTarget(`#object-card-${obj.id}`, -88, 1.15);
                    }}
                    className={`w-full text-left py-3 px-2.5 flex items-center justify-between gap-3 transition-colors ${
                      isActive
                        ? 'bg-[#F5F6F7] text-[#0B3D91]'
                        : 'bg-white text-[#202124] hover:bg-[#F5F6F7]/60'
                    }`}
                  >
                    <div className="flex items-baseline gap-3 min-w-0">
                      <span
                        className={`text-xs font-mono tabular-nums shrink-0 ${
                          isActive ? 'text-[#0B3D91] font-semibold' : 'text-[#6B7280]'
                        }`}
                      >
                        {ordinal}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {obj.name}
                        </div>
                        <div className="text-xs text-[#4B5563] truncate">
                          {obj.category} · {obj.distanceLy}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                        isActive ? 'text-[#0B3D91] opacity-100' : 'text-[#6B7280] opacity-40'
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            <div className="hidden lg:flex items-center justify-between mt-5 text-xs text-[#4B5563]">
              <span>J2000 Benchmark Archive</span>
              <button
                type="button"
                onClick={() => scrollToTarget(0, 0, 1.2)}
                className="inline-flex items-center gap-1.5 font-semibold text-[#0B3D91] hover:text-[#1A73B8] transition-colors whitespace-nowrap"
              >
                <span>Back to top</span>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </aside>

          {/* Scrolling Right Column — Large Photojournal Plates */}
          <div className="lg:col-span-8 space-y-10 mt-10 lg:mt-0">
            {CURATED_TARGETS.map((obj: CelestialTarget, idx: number) => {
              const ordinal = String(idx + 1).padStart(2, '0');
              return (
                <article
                  key={obj.id}
                  id={`object-card-${obj.id}`}
                  data-object-id={obj.id}
                  className="border border-[#DADCE0] bg-white"
                >
                  <a
                    href={`#object-${obj.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectObject(obj.id);
                    }}
                    className="block bg-[#090C12] border-b border-[#DADCE0] overflow-hidden"
                  >
                    <img
                      src={obj.imageUrl}
                      alt={`${obj.name} — ${obj.imageAttribution}`}
                      referrerPolicy="no-referrer"
                      className="w-full aspect-[16/10] object-cover hover:opacity-95 transition-opacity block"
                    />
                  </a>

                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563] font-medium">
                      <div>
                        <span className="font-mono tabular-nums text-[#0B3D91] font-semibold">
                          {ordinal} / {String(CURATED_TARGETS.length).padStart(2, '0')}
                        </span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{obj.category}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{obj.constellation}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{obj.distanceLy}</span>
                      </div>
                      <span className="font-mono tabular-nums text-[#6B7280]">
                        {obj.spectralType}
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-xl sm:text-2xl font-bold text-[#202124] tracking-tight">
                      <a
                        href={`#object-${obj.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectObject(obj.id);
                        }}
                        className="hover:text-[#0B3D91] transition-colors"
                      >
                        {obj.name}
                      </a>
                    </h3>

                    <p className="mt-2 text-sm sm:text-base text-[#4B5563] leading-relaxed">
                      {obj.shortDescription}
                    </p>

                    <div className="mt-4 pt-3 border-t border-[#DADCE0]/70 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-[#4B5563]">
                      <span>RA {obj.raString}</span>
                      <span className="text-[#DADCE0]" aria-hidden="true">|</span>
                      <span>Dec {obj.decString}</span>
                      <span className="text-[#DADCE0]" aria-hidden="true">|</span>
                      <span>
                        μ = {obj.totalProperMotionArcsecYr.toFixed(3)}&quot;/yr
                      </span>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 py-3.5 bg-[#F5F6F7] border-t border-[#DADCE0] flex items-center justify-between gap-4 text-xs">
                    <span className="font-mono text-[#6B7280] truncate">
                      {obj.imageAttribution}
                    </span>
                    <a
                      href={`#object-${obj.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectObject(obj.id);
                      }}
                      className="inline-flex items-center gap-1.5 font-semibold text-[#0B3D91] hover:text-[#1A73B8] whitespace-nowrap shrink-0"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="lg:hidden mt-10 pt-6 border-t border-[#DADCE0] flex items-center justify-between text-xs text-[#4B5563]">
          <span>Featured Cosmic Objects · J2000 Benchmark Archive</span>
          <button
            type="button"
            onClick={() => scrollToTarget(0, 0, 1.2)}
            className="inline-flex items-center gap-1.5 font-semibold text-[#0B3D91] hover:text-[#1A73B8] transition-colors whitespace-nowrap"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </main>
  );
};

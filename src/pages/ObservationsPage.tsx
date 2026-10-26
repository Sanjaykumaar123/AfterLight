import React, { useState } from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import {
  CelestialTarget,
  CURATED_TARGETS,
  SINGLE_EPOCH_DEMO_FIELD,
} from '../data/objects';

interface ObservationsPageProps {
  onSelectObject: (id: string) => void;
  onExploreObject: (target: CelestialTarget) => void;
}

const CATEGORIES = [
  'All',
  'Red Dwarf',
  'Brown Dwarf Binary',
  'Y-Type Brown Dwarf',
  'T Tauri Variable',
  'Mira Variable',
  'Reference Field',
] as const;

export const ObservationsPage: React.FC<ObservationsPageProps> = ({
  onSelectObject,
  onExploreObject,
}) => {
  const [filterCat, setFilterCat] = useState<string>('All');
  const [textFilter, setTextFilter] = useState('');

  const allTargets = [...CURATED_TARGETS, SINGLE_EPOCH_DEMO_FIELD];
  const filtered = allTargets.filter((t) => {
    const matchesCat = filterCat === 'All' || t.category === filterCat;
    const q = textFilter.trim().toLowerCase();
    const matchesText =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.catalogDesignation.toLowerCase().includes(q) ||
      t.constellation.toLowerCase().includes(q) ||
      t.raString.toLowerCase().includes(q);
    return matchesCat && matchesText;
  });

  return (
    <main className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="border-b border-[#DADCE0] pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#0B3D91]">
            Curated Target Archive
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#202124] tracking-tight">
            Observations &amp; Benchmark Catalog
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#4B5563] max-w-3xl leading-relaxed">
            Browse preconfigured celestial targets spanning high-proper-motion red dwarfs,
            ultracold Y/T brown dwarfs, circumstellar dust variables, and a single-epoch
            calibration field.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCat(cat)}
                className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  filterCat === cat
                    ? 'bg-[#0B3D91] text-white border-[#0B3D91]'
                    : 'bg-white text-[#4B5563] border-[#DADCE0] hover:border-[#0B3D91] hover:text-[#202124]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="obs-filter" className="sr-only">
              Filter observations
            </label>
            <input
              id="obs-filter"
              type="text"
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              placeholder="Filter by name, constellation or RA..."
              className="w-full md:w-64 border border-[#DADCE0] px-3 py-1.5 text-xs text-[#202124] focus:outline-none focus:border-[#0B3D91]"
            />
          </div>
        </div>

        {/* Catalog List */}
        {filtered.length === 0 ? (
          <div className="border border-[#DADCE0] bg-[#F5F6F7] p-8 text-sm text-[#4B5563]">
            No observations match your current filter. Clear the filter text or select &ldquo;All&rdquo;.
          </div>
        ) : (
          <div className="divide-y divide-[#DADCE0] border-t border-b border-[#DADCE0]">
            {filtered.map((target) => (
              <article
                key={target.id}
                className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
              >
                <div className="md:col-span-3 bg-[#090C12] border border-[#DADCE0]">
                  <img
                    src={target.imageUrl}
                    alt={`${target.name} reference image`}
                    referrerPolicy="no-referrer"
                    className="w-full aspect-[4/3] object-cover block"
                  />
                </div>

                <div className="md:col-span-6 space-y-2">
                  <div className="text-xs text-[#4B5563]">
                    <span className="font-medium text-[#0B3D91]">{target.category}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{target.constellation}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {target.epochs.length}{' '}
                      {target.epochs.length === 1 ? 'epoch' : 'epochs'}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-[#202124]">
                    <a
                      href={`#object-${target.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onSelectObject(target.id);
                      }}
                      className="hover:text-[#0B3D91]"
                    >
                      {target.name}
                    </a>
                  </h2>

                  <p className="text-sm text-[#4B5563] leading-relaxed">
                    {target.shortDescription}
                  </p>

                  <div className="text-xs font-mono tabular-nums text-[#4B5563] pt-1">
                    RA {target.raString} · Dec {target.decString} · μ{' '}
                    {target.totalProperMotionArcsecYr.toFixed(3)}&quot;/yr
                  </div>
                </div>

                <div className="md:col-span-3 flex flex-col sm:flex-row md:flex-col gap-2.5 md:items-end">
                  <button
                    type="button"
                    onClick={() => onSelectObject(target.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0B3D91] text-white text-xs font-semibold hover:bg-[#1A73B8] transition-colors whitespace-nowrap"
                  >
                    <span>View Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onExploreObject(target)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#DADCE0] text-[#202124] text-xs font-semibold hover:border-[#0B3D91] hover:text-[#0B3D91] transition-colors whitespace-nowrap"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Open in Explorer</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

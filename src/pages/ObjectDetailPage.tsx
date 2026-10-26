import React, { useState } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { CelestialTarget, findTargetById } from '../data/objects';
import { SkyCanvasViewer } from '../components/SkyCanvasViewer';
import { ImageComparisonPanel } from '../components/ImageComparisonPanel';
import { WavelengthExplorerPanel } from '../components/WavelengthExplorerPanel';
import { ExplorerTab } from './ExplorerPage';

interface ObjectDetailPageProps {
  target: CelestialTarget;
  onNavigateHome: () => void;
  onNavigateObservations: () => void;
  onSelectObject: (id: string) => void;
  onLaunchExplorer: (target: CelestialTarget, tab?: ExplorerTab) => void;
}

export const ObjectDetailPage: React.FC<ObjectDetailPageProps> = ({
  target,
  onNavigateHome,
  onNavigateObservations,
  onSelectObject,
  onLaunchExplorer,
}) => {
  const [heroMode, setHeroMode] = useState<'interactive' | 'plate'>('interactive');
  const [bandNumber, setBandNumber] = useState<number>(
    target.id === 'wise-0855' ? 96 : 62
  );

  const relatedTargets = target.relatedIds
    .map((id) => findTargetById(id))
    .filter((t): t is CelestialTarget => Boolean(t));

  const epochDatesSummary = target.epochs.map((e) => e.dateIso).join(' · ');

  return (
    <main className="bg-white">
      <article className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-[#4B5563]"
        >
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              onNavigateHome();
            }}
            className="hover:text-[#0B3D91] hover:underline"
          >
            Home
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <a
            href="#observations"
            onClick={(e) => {
              e.preventDefault();
              onNavigateObservations();
            }}
            className="hover:text-[#0B3D91] hover:underline"
          >
            Observations
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="text-[#202124] font-medium">{target.name}</span>
        </nav>

        {/* Editorial Title & Subtitle */}
        <header className="max-w-4xl space-y-3 border-b border-[#DADCE0] pb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#0B3D91]">
            {target.category} · {target.constellation}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#202124] tracking-tight">
            {target.name}
          </h1>
          <p className="text-base sm:text-lg text-[#4B5563] leading-relaxed">
            {target.shortDescription}
          </p>
        </header>

        {/* Large Astronomical Viewer / Plate + Scientific Information Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex border border-[#DADCE0] bg-[#F5F6F7] p-0.5">
                <button
                  type="button"
                  onClick={() => setHeroMode('interactive')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    heroMode === 'interactive'
                      ? 'bg-[#0B3D91] text-white'
                      : 'text-[#4B5563] hover:text-[#202124]'
                  }`}
                >
                  Interactive Sky Plate
                </button>
                <button
                  type="button"
                  onClick={() => setHeroMode('plate')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    heroMode === 'plate'
                      ? 'bg-[#0B3D91] text-white'
                      : 'text-[#4B5563] hover:text-[#202124]'
                  }`}
                >
                  Illustrative Reference Image
                </button>
              </div>
              <span className="text-xs font-mono text-[#6B7280]">
                {target.catalogDesignation}
              </span>
            </div>

            {heroMode === 'interactive' ? (
              <SkyCanvasViewer
                center={{ raDeg: target.raDeg, decDeg: target.decDeg }}
                fovArcmin={target.defaultFovArcmin}
                epoch={target.epochs[target.epochs.length - 1]}
                bandNumber={bandNumber}
                target={target}
                compact
              />
            ) : (
              <figure className="border border-[#DADCE0] bg-[#090C12]">
                <img
                  src={target.imageUrl}
                  alt={`${target.name} — ${target.imageAttribution}`}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[540px] object-contain block"
                />
                <figcaption className="bg-[#F5F6F7] border-t border-[#DADCE0] px-4 py-3 text-xs text-[#4B5563]">
                  {target.imageAttribution}
                </figcaption>
              </figure>
            )}

            <p className="text-sm text-[#4B5563] leading-relaxed pt-1">
              {target.caption}
            </p>
          </div>

          {/* Scientific Information Sidebar */}
          <aside className="lg:col-span-4 border border-[#DADCE0] bg-[#F5F6F7] p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#202124] pb-3 border-b border-[#DADCE0]">
              Scientific Information
            </h2>

            <dl className="divide-y divide-[#DADCE0] text-xs space-y-0">
              <div className="py-2.5">
                <dt className="text-[#4B5563]">Object Classification</dt>
                <dd className="font-semibold text-[#202124] mt-0.5">
                  {target.category} ({target.spectralType})
                </dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[#4B5563]">Right Ascension (J2000)</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#202124] mt-0.5">
                  {target.raString} ({target.raDeg.toFixed(6)}°)
                </dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[#4B5563]">Declination (J2000)</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#202124] mt-0.5">
                  {target.decString} ({target.decDeg.toFixed(6)}°)
                </dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[#4B5563]">Proper Motion</dt>
                <dd className="font-mono tabular-nums text-[#202124] mt-0.5">
                  {target.totalProperMotionArcsecYr.toFixed(3)}&quot;/yr (μRA{' '}
                  {target.pmRaCosDecMasYr.toFixed(1)}, μDec{' '}
                  {target.pmDecMasYr.toFixed(1)} mas/yr)
                </dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[#4B5563]">Observation Dates</dt>
                <dd className="font-mono tabular-nums text-[#202124] mt-0.5 leading-relaxed">
                  {epochDatesSummary}
                </dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[#4B5563]">Available Wavelengths</dt>
                <dd className="text-[#202124] mt-0.5">{target.availableWavelengths}</dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[#4B5563]">Instrument Information</dt>
                <dd className="text-[#202124] mt-0.5">{target.instrumentInfo}</dd>
              </div>
              <div className="py-2.5">
                <dt className="text-[#4B5563]">Data Source</dt>
                <dd className="text-[#202124] mt-0.5">{target.dataSource}</dd>
              </div>
            </dl>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onLaunchExplorer(target, 'viewer')}
                className="w-full py-2.5 px-4 bg-[#0B3D91] text-white text-xs font-semibold hover:bg-[#1A73B8] transition-colors"
              >
                Open in Full Observation Explorer
              </button>
            </div>
          </aside>
        </section>

        {/* Editorial Science Context */}
        <section className="max-w-3xl space-y-3 border-t border-[#DADCE0] pt-8">
          <h2 className="text-xl font-bold text-[#202124]">
            Astrophysical Context
          </h2>
          <p className="text-base text-[#4B5563] leading-relaxed">
            {target.scientificSummary}
          </p>
        </section>

        {/* Explore Observations */}
        <section className="border-t border-[#DADCE0] pt-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold text-[#202124]">
                Explore Observations
              </h2>
              <p className="text-sm text-[#4B5563] mt-1">
                Chronological epochs archived for {target.name}. Launch the Cosmic Time Machine or Discovery Radar to analyze motion across frames.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onLaunchExplorer(target, 'timemachine')}
                className="px-4 py-2 text-xs font-semibold border border-[#0B3D91] text-[#0B3D91] hover:bg-[#0B3D91] hover:text-white transition-colors whitespace-nowrap"
              >
                Launch Time Machine
              </button>
              <button
                type="button"
                onClick={() => onLaunchExplorer(target, 'radar')}
                className="px-4 py-2 text-xs font-semibold bg-[#0B3D91] text-white hover:bg-[#1A73B8] transition-colors whitespace-nowrap"
              >
                Run Discovery Radar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#DADCE0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F6F7] border-b border-[#DADCE0] text-[#202124]">
                  <th className="py-2.5 px-4">Observation Date</th>
                  <th className="py-2.5 px-4">Instrument</th>
                  <th className="py-2.5 px-4">Wavelength Channel</th>
                  <th className="py-2.5 px-4">Provenance</th>
                  <th className="py-2.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DADCE0]">
                {target.epochs.map((ep) => (
                  <tr key={ep.id}>
                    <td className="py-2.5 px-4 font-mono tabular-nums font-medium text-[#202124]">
                      {ep.dateIso}
                    </td>
                    <td className="py-2.5 px-4 text-[#202124]">{ep.instrument}</td>
                    <td className="py-2.5 px-4 font-mono text-[#4B5563]">
                      {ep.wavelengthLabel}
                    </td>
                    <td className="py-2.5 px-4 text-[#4B5563]">{ep.dataProvenance}</td>
                    <td className="py-2.5 px-4 text-[#4B5563]">{ep.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Compare Different Epochs */}
        <section className="border-t border-[#DADCE0] pt-8 space-y-4">
          <h2 className="text-2xl font-bold text-[#202124]">
            Compare Different Epochs
          </h2>
          <ImageComparisonPanel
            center={{ raDeg: target.raDeg, decDeg: target.decDeg }}
            fovArcmin={target.defaultFovArcmin}
            epochs={target.epochs}
            bandNumber={bandNumber}
            target={target}
          />
        </section>

        {/* Infrared Spectrum */}
        <section className="border-t border-[#DADCE0] pt-8 space-y-4">
          <h2 className="text-2xl font-bold text-[#202124]">
            Infrared Spectrum
          </h2>
          <WavelengthExplorerPanel
            bandNumber={bandNumber}
            onChangeBand={setBandNumber}
            spectralProfile={target.spectralProfile}
            scaleFluxMjy={target.scaleFluxMjy}
            targetName={target.name}
          />
        </section>

        {/* Related Objects */}
        <section className="border-t border-[#DADCE0] pt-8 space-y-4">
          <h2 className="text-2xl font-bold text-[#202124]">Related Objects</h2>
          <div className="divide-y divide-[#DADCE0] border-t border-b border-[#DADCE0]">
            {relatedTargets.map((rel) => (
              <div
                key={rel.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs text-[#4B5563]">
                    {rel.category} · {rel.constellation} ·{' '}
                    <span className="font-mono tabular-nums">{rel.raString}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#202124] mt-0.5">
                    {rel.name}
                  </h3>
                  <p className="text-sm text-[#4B5563] mt-0.5">
                    {rel.shortDescription}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectObject(rel.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3D91] hover:text-[#1A73B8] whitespace-nowrap shrink-0"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
};

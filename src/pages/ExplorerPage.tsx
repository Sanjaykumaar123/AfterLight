import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Database, Info } from 'lucide-react';
import {
  CelestialTarget,
  CURATED_TARGETS,
  ObservationEpoch,
  SINGLE_EPOCH_DEMO_FIELD,
} from '../data/objects';
import {
  formatDecDms,
  formatRaHms,
  parseDec,
  parseRa,
  SkyCoordinates,
} from '../lib/astronomy';
import { MovingObjectCandidate } from '../lib/detection';
import { getSpherexBand } from '../lib/spherex';
import { SkyCanvasViewer, SurveyOverlayMode } from '../components/SkyCanvasViewer';
import { TimeMachinePanel } from '../components/TimeMachinePanel';
import { ImageComparisonPanel } from '../components/ImageComparisonPanel';
import { WavelengthExplorerPanel } from '../components/WavelengthExplorerPanel';
import { DiscoveryRadarPanel } from '../components/DiscoveryRadarPanel';
import { SpherexTutorialPanel } from '../components/SpherexTutorialPanel';
import { SPHEREX_TUTORIAL_TARGET } from '../data/spherexTutorialDataset';

export type ExplorerTab =
  | 'viewer'
  | 'timemachine'
  | 'comparison'
  | 'wavelength'
  | 'radar';

interface ExplorerPageProps {
  initialTarget: CelestialTarget | null;
  initialCoords: SkyCoordinates;
  initialLabel?: string;
  initialTab?: ExplorerTab;
  onOpenObjectDetail: (targetId: string) => void;
}

interface IrsaCatalogResult {
  dataMode: 'live-archive' | 'demonstration';
  source: string;
  rows: Array<Record<string, string | number | null>>;
}

const DEFAULT_CUSTOM_EPOCHS: ObservationEpoch[] = [
  {
    id: 'custom-2010',
    dateIso: '2010-05-12',
    yearDecimal: 2010.36,
    instrument: 'WISE Cryogenic Survey',
    wavelengthLabel: '3.4 µm (W1)',
    bandNumber: 62,
    fluxMultiplier: 1.0,
    dataProvenance: 'Archival Survey Reference',
    notes: 'Archival WISE baseline sky coordinates.',
  },
  {
    id: 'custom-2017',
    dateIso: '2017-05-15',
    yearDecimal: 2017.37,
    instrument: 'NEOWISE Reactivation',
    wavelengthLabel: '4.6 µm (W2)',
    bandNumber: 90,
    fluxMultiplier: 1.0,
    dataProvenance: 'Archival Survey Reference',
    notes: 'Mid-baseline reactivation pass.',
  },
  {
    id: 'custom-2025',
    dateIso: '2025-05-20',
    yearDecimal: 2025.38,
    instrument: 'SPHEREx All-Sky Survey (Simulated)',
    wavelengthLabel: '2.20 µm (Array 3)',
    bandNumber: 46,
    fluxMultiplier: 1.0,
    dataProvenance: 'Simulated SPHEREx Epoch',
    notes: 'Simulated multi-band SPHEREx pass.',
  },
];

const TUTORIAL_M101_EPOCHS: ObservationEpoch[] = [
  {
    id: 'm101-dr1-2025w20',
    dateIso: '2025-05-15',
    yearDecimal: 2025.37,
    instrument: 'SPHEREx DR1 (2025W20_2D · D2)',
    wavelengthLabel: '1.11 – 1.63 µm (D2)',
    bandNumber: 26,
    fluxMultiplier: 1.0,
    dataProvenance: 'Archival Survey Reference',
    notes: 'SPHEREx DR1 Level-2 Spectral Image exposure 0176_4D2 from IRSA tutorial.',
  },
  {
    id: 'm101-dr1-2025w49',
    dateIso: '2025-12-04',
    yearDecimal: 2025.92,
    instrument: 'SPHEREx DR1 (2025W49_2A · D2)',
    wavelengthLabel: '1.11 – 1.63 µm (D2)',
    bandNumber: 28,
    fluxMultiplier: 1.0,
    dataProvenance: 'Archival Survey Reference',
    notes: 'SPHEREx DR1 Level-2 exposures 0426_2D2 / 0650_1D2 / 0707_1D2.',
  },
  {
    id: 'm101-qr3-2026w26',
    dateIso: '2026-06-25',
    yearDecimal: 2026.48,
    instrument: 'SPHEREx QR3 (2026W26_1A · D2)',
    wavelengthLabel: '1.11 – 1.63 µm (D2)',
    bandNumber: 24,
    fluxMultiplier: 1.0,
    dataProvenance: 'Archival Survey Reference',
    notes: 'SPHEREx QR3 Level-2 exposures 0178_1D2 & 0500_1D2 from IRSA tutorial.',
  },
];

export const ExplorerPage: React.FC<ExplorerPageProps> = ({
  initialTarget,
  initialCoords,
  initialLabel,
  initialTab = 'viewer',
  onOpenObjectDetail,
}) => {
  const [activeTab, setActiveTab] = useState<ExplorerTab>(initialTab);
  const [selectedTarget, setSelectedTarget] = useState<CelestialTarget | null>(
    initialTarget
  );
  const [center, setCenter] = useState<SkyCoordinates>(initialCoords);
  const [regionLabel, setRegionLabel] = useState<string>(
    initialTarget?.name || initialLabel || 'Custom Sky Field'
  );

  // Coordinate form inputs
  const [raInput, setRaInput] = useState(
    initialTarget ? initialTarget.raString : formatRaHms(initialCoords.raDeg)
  );
  const [decInput, setDecInput] = useState(
    initialTarget ? initialTarget.decString : formatDecDms(initialCoords.decDeg)
  );
  const [coordError, setCoordError] = useState<string | null>(null);
  const [fovArcmin, setFovArcmin] = useState<number>(
    initialTarget?.defaultFovArcmin ?? 8
  );

  const [bandNumber, setBandNumber] = useState<number>(
    initialTarget?.id === 'wise-0855' ? 96 : 62
  );
  const [epochIdx, setEpochIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [surveyMode, setSurveyMode] = useState<SurveyOverlayMode>('simulation');

  const [candidates, setCandidates] = useState<MovingObjectCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const [irsaLoading, setIrsaLoading] = useState(false);
  const [irsaResult, setIrsaResult] = useState<IrsaCatalogResult | null>(null);
  const [isTutorialPreset, setIsTutorialPreset] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSelectedTarget(initialTarget);
    setIsTutorialPreset(false);
    setCenter(initialCoords);
    setRegionLabel(initialTarget?.name || initialLabel || 'Custom Sky Field');
    setRaInput(initialTarget ? initialTarget.raString : formatRaHms(initialCoords.raDeg));
    setDecInput(initialTarget ? initialTarget.decString : formatDecDms(initialCoords.decDeg));
    setFovArcmin(initialTarget?.defaultFovArcmin ?? 8);
    setBandNumber(initialTarget?.id === 'wise-0855' ? 96 : 62);
    setEpochIdx(0);
    setIsPlaying(false);
    setIrsaResult(null);
  }, [initialTarget, initialCoords, initialLabel]);

  const epochs = useMemo(() => {
    if (isTutorialPreset) return TUTORIAL_M101_EPOCHS;
    return selectedTarget ? selectedTarget.epochs : DEFAULT_CUSTOM_EPOCHS;
  }, [selectedTarget, isTutorialPreset]);

  const activeEpoch = epochs[epochIdx] ?? epochs[0];
  const activeBand = getSpherexBand(bandNumber);

  const handleApplyCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const ra = parseRa(raInput);
    const dec = parseDec(decInput);
    if (ra === null || dec === null) {
      setCoordError(
        'Invalid RA or Dec format. Use HMS/DMS (e.g. 08h55m10.831s, -07d14m42.53s) or decimal degrees.'
      );
      return;
    }
    setCoordError(null);
    setSelectedTarget(null);
    setIsTutorialPreset(false);
    setCenter({ raDeg: ra, decDeg: dec });
    setRegionLabel(`Sky Field (${formatRaHms(ra)}, ${formatDecDms(dec)})`);
    setEpochIdx(0);
    setIrsaResult(null);
  };

  const handleLoadM101Tutorial = () => {
    setSelectedTarget(null);
    setIsTutorialPreset(true);
    setCenter({
      raDeg: SPHEREX_TUTORIAL_TARGET.raDeg,
      decDeg: SPHEREX_TUTORIAL_TARGET.decDeg,
    });
    setRegionLabel(SPHEREX_TUTORIAL_TARGET.name);
    setRaInput(SPHEREX_TUTORIAL_TARGET.raString);
    setDecInput(SPHEREX_TUTORIAL_TARGET.decString);
    setFovArcmin(SPHEREX_TUTORIAL_TARGET.fovArcmin);
    setBandNumber(SPHEREX_TUTORIAL_TARGET.defaultBandNumber);
    setEpochIdx(0);
    setCoordError(null);
    setIsPlaying(false);
    setIrsaResult(null);
  };

  const handleSelectPreset = (id: string) => {
    if (!id) return;
    if (id === SPHEREX_TUTORIAL_TARGET.id) {
      handleLoadM101Tutorial();
      return;
    }
    const allTargets = [...CURATED_TARGETS, SINGLE_EPOCH_DEMO_FIELD];
    const match = allTargets.find((t) => t.id === id);
    if (!match) return;
    setIsTutorialPreset(false);
    setSelectedTarget(match);
    setCenter({ raDeg: match.raDeg, decDeg: match.decDeg });
    setRegionLabel(match.name);
    setRaInput(match.raString);
    setDecInput(match.decString);
    setFovArcmin(match.defaultFovArcmin);
    setBandNumber(match.id === 'wise-0855' ? 96 : 62);
    setEpochIdx(0);
    setCoordError(null);
    setIsPlaying(false);
    setIrsaResult(null);
  };

  const handleQueryIrsa = async () => {
    setIrsaLoading(true);
    try {
      const resp = await fetch(
        `/api/archive/irsa-catalog?ra=${center.raDeg.toFixed(6)}&dec=${center.decDeg.toFixed(
          6
        )}&radiusArcsec=120`
      );
      const data = (await resp.json()) as IrsaCatalogResult;
      setIrsaResult(data);
    } catch {
      setIrsaResult({
        dataMode: 'demonstration',
        source: 'Demonstration Fallback (IRSA TAP request failed)',
        rows: [],
      });
    } finally {
      setIrsaLoading(false);
    }
  };

  return (
    <main className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Page Heading */}
        <div className="border-b border-[#DADCE0] pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0B3D91]">
              Interactive Astronomical Research Workbench
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#202124] tracking-tight">
              SPHEREx Observation Explorer
            </h1>
            <p className="mt-1.5 text-sm text-[#4B5563]">
              Active Region: <strong className="text-[#202124]">{regionLabel}</strong>
              <span className="mx-2 text-[#DADCE0]">·</span>
              <span className="font-mono tabular-nums">
                {formatRaHms(center.raDeg)} {formatDecDms(center.decDeg)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {selectedTarget && selectedTarget.id !== SINGLE_EPOCH_DEMO_FIELD.id && (
              <button
                type="button"
                onClick={() => onOpenObjectDetail(selectedTarget.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-[#0B3D91] text-[#0B3D91] bg-white hover:bg-[#0B3D91] hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Editorial Article</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Target & Coordinate Control Bar */}
        <form
          onSubmit={handleApplyCoordinates}
          className="border border-[#DADCE0] bg-[#F5F6F7] p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <label htmlFor="exp-preset" className="block text-xs font-semibold text-[#202124] mb-1">
                Target Preset
              </label>
              <select
                id="exp-preset"
                value={isTutorialPreset ? SPHEREX_TUTORIAL_TARGET.id : (selectedTarget?.id ?? '')}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="w-full bg-white border border-[#DADCE0] px-2.5 py-2 text-xs text-[#202124]"
              >
                <option value="">Custom Coordinates</option>
                {CURATED_TARGETS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
                <option value={SPHEREX_TUTORIAL_TARGET.id}>
                  M101 Pinwheel Galaxy (IRSA SPHEREx DR1/QR3 Tutorial)
                </option>
                <option value={SINGLE_EPOCH_DEMO_FIELD.id}>
                  SA 57 (Single-Epoch Test Field)
                </option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="exp-ra" className="block text-xs font-semibold text-[#202124] mb-1">
                Right Ascension (J2000)
              </label>
              <input
                id="exp-ra"
                type="text"
                value={raInput}
                onChange={(e) => setRaInput(e.target.value)}
                placeholder="08h55m10.831s or 133.795"
                className="w-full bg-white border border-[#DADCE0] px-2.5 py-2 text-xs font-mono text-[#202124] focus:outline-none focus:border-[#0B3D91]"
              />
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="exp-dec" className="block text-xs font-semibold text-[#202124] mb-1">
                Declination (J2000)
              </label>
              <input
                id="exp-dec"
                type="text"
                value={decInput}
                onChange={(e) => setDecInput(e.target.value)}
                placeholder="-07d14m42.53s or -7.245"
                className="w-full bg-white border border-[#DADCE0] px-2.5 py-2 text-xs font-mono text-[#202124] focus:outline-none focus:border-[#0B3D91]"
              />
            </div>

            <div className="lg:col-span-1">
              <label htmlFor="exp-fov" className="block text-xs font-semibold text-[#202124] mb-1">
                FOV
              </label>
              <select
                id="exp-fov"
                value={fovArcmin}
                onChange={(e) => setFovArcmin(Number(e.target.value))}
                className="w-full bg-white border border-[#DADCE0] px-2 py-2 text-xs font-mono text-[#202124]"
              >
                <option value={5}>5&apos;</option>
                <option value={6}>6&apos; (0.1°)</option>
                <option value={8}>8&apos;</option>
                <option value={10}>10&apos;</option>
                <option value={15}>15&apos;</option>
                <option value={30}>30&apos;</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-[#0B3D91] text-white text-xs font-semibold hover:bg-[#1A73B8] transition-colors whitespace-nowrap"
              >
                Load Sky Region
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#DADCE0] min-w-0">
            <div className="flex items-center gap-2 text-xs min-w-0">
              <label htmlFor="exp-epoch" className="font-semibold text-[#202124] whitespace-nowrap shrink-0">
                Epoch:
              </label>
              <select
                id="exp-epoch"
                value={epochIdx}
                onChange={(e) => setEpochIdx(Number(e.target.value))}
                className="flex-1 min-w-0 bg-white border border-[#DADCE0] px-2.5 py-1.5 font-mono text-xs text-[#202124]"
              >
                {epochs.map((ep, idx) => (
                  <option key={ep.id} value={idx}>
                    {ep.dateIso} · {ep.instrument}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs min-w-0">
              <label htmlFor="exp-band" className="font-semibold text-[#202124] whitespace-nowrap shrink-0">
                Wavelength:
              </label>
              <input
                id="exp-band"
                type="range"
                min={1}
                max={102}
                step={1}
                value={bandNumber}
                onChange={(e) => setBandNumber(Number(e.target.value))}
                className="flex-1 min-w-[90px] accent-[#0B3D91]"
              />
              <span className="font-mono tabular-nums text-[#202124] whitespace-nowrap">
                Band {bandNumber} ({activeBand.wavelengthUm.toFixed(2)} µm)
              </span>
            </div>
          </div>

          {coordError && (
            <p role="alert" className="text-xs text-[#B91C1C]">
              {coordError}
            </p>
          )}
        </form>

        {/* Demonstration Mode Transparency Banner */}
        <div className="border border-[#DADCE0] bg-white px-4 py-2.5 flex items-start gap-2.5 text-xs text-[#4B5563]">
          <Info className="w-4 h-4 text-[#0B3D91] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[#202124]">Data Provenance:</strong> Calibrated
            multi-epoch SPHEREx 102-band plates run in transparent{' '}
            <strong className="text-[#202124]">Demonstration Mode</strong> using real J2000
            coordinates, Gaia DR3 proper motions, and physical SEDs. Switch the viewer’s
            survey selector to query live CDS HiPS2FITS archival cutouts or query NASA/IPAC
            IRSA AllWISE TAP below when external archive access is available.
          </p>
        </div>

        {/* Instrument Tabs */}
        <div
          role="tablist"
          aria-label="Observation Explorer Tools"
          className="flex flex-wrap border-b border-[#DADCE0] gap-1"
        >
          {(
            [
              { id: 'viewer', label: 'Observation Viewer' },
              { id: 'timemachine', label: 'Cosmic Time Machine' },
              { id: 'comparison', label: 'Image Comparison' },
              { id: 'wavelength', label: 'Wavelength Explorer (102 Bands)' },
              { id: 'radar', label: 'Discovery Radar' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[#0B3D91] text-[#0B3D91] bg-[#F5F6F7]'
                    : 'border-transparent text-[#4B5563] hover:text-[#202124]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Tool Panel */}
        {activeTab === 'viewer' && (
          <div className="space-y-6">
            <SkyCanvasViewer
              center={center}
              fovArcmin={fovArcmin}
              epoch={activeEpoch}
              bandNumber={bandNumber}
              target={selectedTarget}
              includeSyntheticMover={!selectedTarget}
              surveyMode={surveyMode}
              onSurveyModeChange={setSurveyMode}
            />

            {/* NASA/IPAC IRSA AllWISE Live Catalog Query */}
            <section className="border border-[#DADCE0] bg-white p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#202124] flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#0B3D91]" />
                    <span>NASA/IPAC IRSA AllWISE Catalog Cross-Match (2&apos; Cone)</span>
                  </h2>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    Query public AllWISE source photometry (`allwise_p3as_psd`) around the active J2000 coordinates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleQueryIrsa}
                  disabled={irsaLoading}
                  className="px-4 py-2 bg-[#0B3D91] text-white text-xs font-semibold hover:bg-[#1A73B8] disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {irsaLoading ? 'Querying IRSA TAP...' : 'Query IRSA AllWISE'}
                </button>
              </div>

              {irsaResult && (
                <div className="space-y-2 text-xs">
                  <div className="text-[#4B5563]">
                    Source: <strong className="text-[#202124]">{irsaResult.source}</strong>
                  </div>
                  {irsaResult.rows.length > 0 ? (
                    <div className="overflow-x-auto border border-[#DADCE0]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F5F6F7] border-b border-[#DADCE0]">
                            <th className="py-2 px-3">Designation</th>
                            <th className="py-2 px-3">RA (deg)</th>
                            <th className="py-2 px-3">Dec (deg)</th>
                            <th className="py-2 px-3">W1 (3.4 µm)</th>
                            <th className="py-2 px-3">W2 (4.6 µm)</th>
                            <th className="py-2 px-3">W3 (12 µm)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DADCE0] font-mono tabular-nums">
                          {irsaResult.rows.map((r, i) => (
                            <tr key={i}>
                              <td className="py-2 px-3">{String(r.designation ?? '—')}</td>
                              <td className="py-2 px-3">{Number(r.ra).toFixed(5)}</td>
                              <td className="py-2 px-3">{Number(r.dec).toFixed(5)}</td>
                              <td className="py-2 px-3">{r.w1mpro ?? '—'}</td>
                              <td className="py-2 px-3">{r.w2mpro ?? '—'}</td>
                              <td className="py-2 px-3">{r.w3mpro ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[#4B5563] bg-[#F5F6F7] border border-[#DADCE0] p-3">
                      {irsaResult.dataMode === 'demonstration'
                        ? 'Live IRSA TAP query could not reach caltech.edu from the sandboxed environment; demonstration coordinates remain active in the Sky Viewer.'
                        : 'No AllWISE point sources returned within 120 arcseconds.'}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Caltech/IPAC IRSA SPHEREx Level-2 Cutouts Tutorial Dataset */}
            <SpherexTutorialPanel
              center={center}
              fovArcmin={fovArcmin}
              isM101Active={isTutorialPreset}
              onLoadM101Tutorial={handleLoadM101Tutorial}
            />
          </div>
        )}

        {activeTab === 'timemachine' && (
          <div className="space-y-5">
            <TimeMachinePanel
              epochs={epochs}
              activeIndex={epochIdx}
              onChangeIndex={setEpochIdx}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              speedMultiplier={speedMultiplier}
              onChangeSpeed={setSpeedMultiplier}
            />
            <SkyCanvasViewer
              center={center}
              fovArcmin={fovArcmin}
              epoch={activeEpoch}
              bandNumber={bandNumber}
              target={selectedTarget}
              includeSyntheticMover={!selectedTarget}
            />
          </div>
        )}

        {activeTab === 'comparison' && (
          <ImageComparisonPanel
            center={center}
            fovArcmin={fovArcmin}
            epochs={epochs}
            bandNumber={bandNumber}
            target={selectedTarget}
            includeSyntheticMover={!selectedTarget}
          />
        )}

        {activeTab === 'wavelength' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5">
              <SkyCanvasViewer
                center={center}
                fovArcmin={fovArcmin}
                epoch={activeEpoch}
                bandNumber={bandNumber}
                target={selectedTarget}
                includeSyntheticMover={!selectedTarget}
                compact
              />
            </div>
            <div className="lg:col-span-7">
              <WavelengthExplorerPanel
                bandNumber={bandNumber}
                onChangeBand={setBandNumber}
                spectralProfile={selectedTarget?.spectralProfile ?? 'field-star'}
                scaleFluxMjy={selectedTarget?.scaleFluxMjy ?? 25}
                targetName={regionLabel}
              />
            </div>
          </div>
        )}

        {activeTab === 'radar' && (
          <div className="space-y-6">
            <SkyCanvasViewer
              center={center}
              fovArcmin={fovArcmin}
              epoch={activeEpoch}
              bandNumber={bandNumber}
              target={selectedTarget}
              includeSyntheticMover={!selectedTarget}
              candidates={candidates}
              selectedCandidateId={selectedCandidateId}
              compact
            />
            <DiscoveryRadarPanel
              center={center}
              fovArcmin={fovArcmin}
              epochs={epochs}
              bandNumber={bandNumber}
              target={selectedTarget}
              includeSyntheticMover={!selectedTarget}
              onCandidatesUpdated={setCandidates}
              selectedCandidateId={selectedCandidateId}
              onSelectCandidate={(c) => setSelectedCandidateId(c?.candidateId ?? null)}
            />
          </div>
        )}
      </div>
    </main>
  );
};

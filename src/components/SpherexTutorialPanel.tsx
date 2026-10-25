import React, { useMemo, useState } from 'react';
import { ChevronDown, Database, ExternalLink, Layers, Search } from 'lucide-react';
import {
  buildSpherexTapAdql,
  filterTutorialCutouts,
  SPHEREX_TUTORIAL_CUTOUTS,
  SPHEREX_TUTORIAL_TARGET,
  SpherexBandpassName,
  SpherexCutoutRecord,
  SpherexRelease,
} from '../data/spherexTutorialDataset';
import { SkyCoordinates } from '../lib/astronomy';

interface SpherexTutorialPanelProps {
  center: SkyCoordinates;
  fovArcmin: number;
  isM101Active: boolean;
  onLoadM101Tutorial: () => void;
}

interface SpherexTapResponse {
  ok: boolean;
  dataMode: 'live-archive' | 'tutorial-reference';
  source: string;
  adql: string;
  rows: Array<
    SpherexCutoutRecord & {
      timeBoundsLower?: string | number | null;
    }
  >;
}

const BANDPASS_OPTIONS: Array<{ value: SpherexBandpassName; label: string }> = [
  { value: 'SPHEREx-D1', label: 'SPHEREx-D1 (0.75–1.11 µm)' },
  { value: 'SPHEREx-D2', label: 'SPHEREx-D2 (1.11–1.63 µm)' },
  { value: 'SPHEREx-D3', label: 'SPHEREx-D3 (1.63–2.42 µm)' },
  { value: 'SPHEREx-D4', label: 'SPHEREx-D4 (2.42–3.82 µm)' },
  { value: 'SPHEREx-D5', label: 'SPHEREx-D5 (3.82–4.42 µm)' },
  { value: 'SPHEREx-D6', label: 'SPHEREx-D6 (4.42–5.00 µm)' },
];

export const SpherexTutorialPanel: React.FC<SpherexTutorialPanelProps> = ({
  center,
  fovArcmin,
  isM101Active,
  onLoadM101Tutorial,
}) => {
  const [bandpass, setBandpass] = useState<SpherexBandpassName>('SPHEREx-D2');
  const [releaseFilter, setReleaseFilter] = useState<'ALL' | SpherexRelease>('ALL');
  const [filterText, setFilterText] = useState('');
  const [tapLoading, setTapLoading] = useState(false);
  const [tapResponse, setTapResponse] = useState<SpherexTapResponse | null>(null);

  const sizeDeg = Number((fovArcmin / 60).toFixed(3));
  const activeAdql = useMemo(
    () =>
      buildSpherexTapAdql({
        raDeg: center.raDeg,
        decDeg: center.decDeg,
        sizeDeg,
        bandpass,
      }),
    [center.raDeg, center.decDeg, sizeDeg, bandpass]
  );

  const activeRecords = useMemo(() => {
    const base: SpherexCutoutRecord[] =
      tapResponse && tapResponse.rows.length > 0
        ? tapResponse.rows.map((r, idx) => ({
            index: r.index ?? idx + 1,
            release: r.release === 'QR3' ? 'QR3' : 'DR1',
            obsWeek: r.obsWeek,
            exposureId: r.exposureId,
            detector: 'SPHEREx-D2',
            pipelineVersion: r.pipelineVersion,
            uri: r.uri,
          }))
        : SPHEREX_TUTORIAL_CUTOUTS;

    return filterTutorialCutouts(base, releaseFilter, filterText);
  }, [tapResponse, releaseFilter, filterText]);

  const counts = useMemo(() => {
    const base =
      tapResponse && tapResponse.rows.length > 0
        ? tapResponse.rows
        : SPHEREX_TUTORIAL_CUTOUTS;
    const dr1 = base.filter((r) => r.release === 'DR1').length;
    const qr3 = base.filter((r) => r.release === 'QR3').length;
    return { total: base.length, dr1, qr3 };
  }, [tapResponse]);

  const handleQueryTap = async () => {
    setTapLoading(true);
    try {
      const resp = await fetch(
        `/api/archive/spherex-cutouts?ra=${center.raDeg.toFixed(5)}&dec=${center.decDeg.toFixed(
          5
        )}&sizeDeg=${sizeDeg}&bandpass=${encodeURIComponent(bandpass)}`
      );
      const data = (await resp.json()) as SpherexTapResponse;
      setTapResponse(data);
    } catch {
      setTapResponse({
        ok: true,
        dataMode: 'tutorial-reference',
        source:
          'Caltech/IPAC IRSA SPHEREx Cutouts Tutorial Dataset (M101 DR1/QR3 Reference)',
        adql: activeAdql,
        rows: SPHEREX_TUTORIAL_CUTOUTS,
      });
    } finally {
      setTapLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="spherex-tutorial-dataset-heading"
      className="border border-[#DADCE0] bg-white p-5 space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 border-b border-[#DADCE0] pb-4 min-w-0">
        <div className="space-y-1 max-w-3xl min-w-0">
          <div className="text-xs font-mono uppercase tracking-wider text-[#0B3D91]">
            Caltech/IPAC IRSA Dataset · SPHEREx DR1 &amp; QR3 Level-2 MEF Cutouts
          </div>
          <h2
            id="spherex-tutorial-dataset-heading"
            className="text-base sm:text-lg font-semibold text-[#202124] flex items-start gap-2"
          >
            <Layers className="w-4 h-4 text-[#0B3D91] shrink-0 mt-1" />
            <span>IRSA SPHEREx Spectral Image Cutouts (M101 Tutorial Dataset)</span>
          </h2>
          <p className="text-xs text-[#4B5563] leading-relaxed break-words">
            Extracted from{' '}
            <a
              href={SPHEREX_TUTORIAL_TARGET.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[#1A73B8] hover:underline font-medium inline-flex items-center gap-1 break-all max-w-full"
            >
              <span>caltech-ipac.github.io/irsa-tutorials/spherex-cutouts/</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            {' '}— queries <code className="font-mono text-[#202124]">spherex.artifact</code> &amp;{' '}
            <code className="font-mono text-[#202124]">spherex.plane</code> for Pinwheel Galaxy (M101) at{' '}
            <span className="font-mono tabular-nums text-[#202124]">
              RA 210.80227°, Dec +54.34895°, Size 0.1°
            </span>{' '}
            (<span className="font-mono">{SPHEREX_TUTORIAL_TARGET.totalMatchedInTutorialQuery}</span> overlapping cutouts in DR1/QR3).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 max-w-full">
          <button
            type="button"
            data-testid="load-m101-tutorial-btn"
            onClick={onLoadM101Tutorial}
            className={`px-3.5 py-2 text-xs font-semibold border transition-colors whitespace-nowrap ${
              isM101Active
                ? 'bg-[#F5F6F7] border-[#0B3D91] text-[#0B3D91]'
                : 'bg-white border-[#0B3D91] text-[#0B3D91] hover:bg-[#0B3D91] hover:text-white'
            }`}
          >
            {isM101Active ? 'M101 Tutorial Region Loaded' : 'Load M101 Tutorial Region'}
          </button>

          <select
            aria-label="SPHEREx detector bandpass"
            value={bandpass}
            onChange={(e) => setBandpass(e.target.value as SpherexBandpassName)}
            className="w-full sm:w-auto max-w-full bg-white border border-[#DADCE0] px-2.5 py-2 text-xs font-mono text-[#202124]"
          >
            {BANDPASS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleQueryTap}
            disabled={tapLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0B3D91] text-white text-xs font-semibold hover:bg-[#1A73B8] disabled:opacity-60 whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{tapLoading ? 'Querying SPHEREx TAP...' : 'Query Live SPHEREx TAP'}</span>
          </button>
        </div>
      </div>

      {/* Live / Reference Status Line */}
      {tapResponse && (
        <div className="bg-[#F5F6F7] border border-[#DADCE0] px-3.5 py-2.5 text-xs text-[#4B5563] flex flex-wrap items-center justify-between gap-2">
          <span>
            Status: <strong className="text-[#202124]">{tapResponse.source}</strong>
          </span>
          <span className="font-mono tabular-nums text-[#202124]">
            {tapResponse.rows.length} record{tapResponse.rows.length === 1 ? '' : 's'} returned
          </span>
        </div>
      )}

      {/* Official 10-Band M101 Cutout Grid from Tutorial */}
      <figure className="border border-[#DADCE0] bg-white">
        <div className="p-3 bg-white border-b border-[#DADCE0]">
          <img
            src={SPHEREX_TUTORIAL_TARGET.previewPlateUrl}
            alt="10 SPHEREx Detector D2 Level-2 cutouts of M101 Pinwheel Galaxy from 1.087 to 1.656 micrometers"
            className="w-full h-auto block"
          />
        </div>
        <figcaption className="px-4 py-3 bg-[#F5F6F7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#4B5563]">
          <span>
            <strong className="text-[#202124]">M101 Level-2 Spectral Cutouts (SPHEREx-D2):</strong>{' '}
            10 multi-extension FITS cutouts spanning{' '}
            <span className="font-mono tabular-nums text-[#202124]">
              1.087 – 1.656 µm
            </span>{' '}
            from the tutorial&apos;s combined MEF output.
          </span>
          <span className="font-mono text-[#6B7280] sm:whitespace-nowrap">
            Source: Caltech/IPAC IRSA
          </span>
        </figcaption>
      </figure>

      {/* Filter Bar for Curated DR1/QR3 Cutout URIs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 border border-[#DADCE0] bg-[#F5F6F7] p-1">
          {(
            [
              { id: 'ALL', label: `All (${counts.total})` },
              { id: 'DR1', label: `DR1 (${counts.dr1})` },
              { id: 'QR3', label: `QR3 (${counts.qr3})` },
            ] as const
          ).map((item) => {
            const active = releaseFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setReleaseFilter(item.id)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#0B3D91] text-white'
                    : 'bg-transparent text-[#4B5563] hover:text-[#202124]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Filter SPHEREx cutouts by week or exposure"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter week or exposure ID..."
            className="w-full border border-[#DADCE0] bg-white pl-8 pr-3 py-1.5 text-xs text-[#202124] placeholder:text-[#6B7280] focus:outline-none focus:border-[#0B3D91]"
          />
        </div>
      </div>

      {/* Cutout MEF Table */}
      <div
        data-lenis-prevent
        className="border border-[#DADCE0] overflow-x-auto max-h-[300px] overflow-y-auto"
      >
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-[#F5F6F7] border-b border-[#DADCE0] z-10">
            <tr>
              <th className="py-2 px-3 font-semibold text-[#202124]">#</th>
              <th className="py-2 px-3 font-semibold text-[#202124]">Release</th>
              <th className="py-2 px-3 font-semibold text-[#202124]">Obs Week</th>
              <th className="py-2 px-3 font-semibold text-[#202124]">Exposure ID</th>
              <th className="py-2 px-3 font-semibold text-[#202124]">Pipeline Version</th>
              <th className="py-2 px-3 font-semibold text-[#202124]">IRSA IBE Cutout MEF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DADCE0] font-mono tabular-nums">
            {activeRecords.map((rec) => (
              <tr key={`${rec.release}-${rec.obsWeek}-${rec.exposureId}-${rec.index}`} className="hover:bg-[#F5F6F7]/60">
                <td className="py-2 px-3 text-[#6B7280]">{String(rec.index).padStart(2, '0')}</td>
                <td className="py-2 px-3 font-semibold text-[#0B3D91]">{rec.release}</td>
                <td className="py-2 px-3 text-[#202124]">{rec.obsWeek}</td>
                <td className="py-2 px-3 text-[#202124]">{rec.exposureId}</td>
                <td className="py-2 px-3 text-[#4B5563]">{rec.pipelineVersion}</td>
                <td className="py-2 px-3">
                  <a
                    href={rec.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#1A73B8] hover:underline whitespace-nowrap"
                  >
                    <span>FITS Cutout</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </td>
              </tr>
            ))}
            {activeRecords.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 px-3 text-center text-[#4B5563] font-sans">
                  No SPHEREx Level-2 cutout entries match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Collapsible ADQL Query Disclosure */}
      <details className="border border-[#DADCE0] bg-[#F5F6F7]">
        <summary className="px-4 py-2.5 text-xs font-semibold text-[#202124] cursor-pointer flex items-center justify-between select-none">
          <span>IRSA TAP ADQL Query (spherex.artifact JOIN spherex.plane)</span>
          <ChevronDown className="w-4 h-4 text-[#4B5563]" />
        </summary>
        <pre className="p-4 pt-2 text-[11px] font-mono text-[#202124] bg-white border-t border-[#DADCE0] overflow-x-auto leading-relaxed">
          {activeAdql}
        </pre>
      </details>
    </section>
  );
};

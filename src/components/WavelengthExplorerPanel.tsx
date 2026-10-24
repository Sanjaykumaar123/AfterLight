import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  computeReferenceSpectrum,
  getSpherexBand,
  SPHEREX_ARRAYS,
  SpectralProfileKind,
} from '../lib/spherex';

interface WavelengthExplorerPanelProps {
  bandNumber: number;
  onChangeBand: (band: number) => void;
  spectralProfile: SpectralProfileKind;
  scaleFluxMjy: number;
  targetName: string;
}

export const WavelengthExplorerPanel: React.FC<WavelengthExplorerPanelProps> = ({
  bandNumber,
  onChangeBand,
  spectralProfile,
  scaleFluxMjy,
  targetName,
}) => {
  const activeBand = getSpherexBand(bandNumber);
  const activeArray = SPHEREX_ARRAYS.find((a) => a.arrayId === activeBand.arrayId)!;

  const spectrum = useMemo(
    () => computeReferenceSpectrum(spectralProfile, scaleFluxMjy),
    [spectralProfile, scaleFluxMjy]
  );

  const activePoint = spectrum[activeBand.bandNumber - 1];
  const maxFlux = useMemo(
    () => Math.max(...spectrum.map((p) => p.fluxMjy), 0.1),
    [spectrum]
  );

  // SVG Chart geometry
  const svgW = 760;
  const svgH = 220;
  const padL = 56;
  const padR = 20;
  const padT = 18;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const xForUm = (um: number) => padL + ((um - 0.75) / (5.0 - 0.75)) * plotW;
  const yForFlux = (flux: number) =>
    padT + plotH - (Math.max(0, flux) / (maxFlux * 1.08)) * plotH;

  const polylinePoints = spectrum
    .map((p) => `${xForUm(p.wavelengthUm).toFixed(1)},${yForFlux(p.fluxMjy).toFixed(1)}`)
    .join(' ');

  const activeX = xForUm(activePoint.wavelengthUm);
  const activeY = yForFlux(activePoint.fluxMjy);

  return (
    <section
      aria-label="Infrared Wavelength Explorer"
      className="border border-[#DADCE0] bg-white p-5 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-[#DADCE0]">
        <div>
          <h2 className="text-base font-semibold text-[#202124]">
            SPHEREx 102-Band Infrared Wavelength Explorer
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Navigate across SPHEREx’s six Linear Variable Filter (LVF) detector arrays spanning 0.75–5.00 µm.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-[#0B3D91] font-medium">
          Band {activeBand.bandNumber} / 102 · {activeBand.wavelengthUm.toFixed(3)} µm
        </div>
      </div>

      {/* Six Detector Array Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {SPHEREX_ARRAYS.map((arr) => {
          const isActive = arr.arrayId === activeBand.arrayId;
          const midBand = Math.round((arr.bandStart + arr.bandEnd) / 2);
          return (
            <button
              key={arr.arrayId}
              type="button"
              onClick={() => onChangeBand(midBand)}
              className={`text-left px-3 py-2.5 border transition-colors ${
                isActive
                  ? 'border-[#0B3D91] bg-[#F5F6F7]'
                  : 'border-[#DADCE0] bg-white hover:border-[#1A73B8]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#202124] whitespace-nowrap">
                  Array {arr.arrayId}
                </span>
                <span className="font-mono text-[#4B5563] whitespace-nowrap">
                  R≈{arr.resolvingPower}
                </span>
              </div>
              <div className="text-xs font-mono tabular-nums text-[#4B5563] mt-0.5 whitespace-nowrap">
                {arr.minUm.toFixed(2)}–{arr.maxUm.toFixed(2)} µm
              </div>
            </button>
          );
        })}
      </div>

      {/* 102-Band Slider & Step Navigation */}
      <div className="bg-[#F5F6F7] border border-[#DADCE0] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChangeBand(Math.max(1, activeBand.bandNumber - 1))}
              disabled={activeBand.bandNumber <= 1}
              aria-label="Previous spectral band"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] disabled:opacity-40 hover:border-[#0B3D91]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev Band</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeBand(Math.min(102, activeBand.bandNumber + 1))}
              disabled={activeBand.bandNumber >= 102}
              aria-label="Next spectral band"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] disabled:opacity-40 hover:border-[#0B3D91]"
            >
              <span>Next Band</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-xs font-mono tabular-nums text-[#202124]">
            λ = {activeBand.wavelengthUm.toFixed(3)} µm · Δλ = {activeBand.bandwidthUm.toFixed(4)} µm · R ={' '}
            {activeBand.resolvingPower}
          </div>
        </div>

        <div>
          <label htmlFor="spherex-band-slider" className="sr-only">
            SPHEREx spectral band selector (1 to 102)
          </label>
          <input
            id="spherex-band-slider"
            type="range"
            min={1}
            max={102}
            step={1}
            value={activeBand.bandNumber}
            onChange={(e) => onChangeBand(Number(e.target.value))}
            className="w-full accent-[#0B3D91]"
          />
          <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#4B5563] mt-1">
            <span>Band 1 (0.75 µm)</span>
            <span>Band 34 (1.64 µm)</span>
            <span>Band 68 (3.82 µm)</span>
            <span>Band 102 (5.00 µm)</span>
          </div>
        </div>

        {/* Band Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#DADCE0] text-xs">
          <div>
            <span className="text-[#4B5563] block">Detector Array</span>
            <span className="font-medium text-[#202124]">{activeArray.name}</span>
          </div>
          <div>
            <span className="text-[#4B5563] block">Spectral Tracer</span>
            <span className="font-medium text-[#202124]">{activeBand.tracerNote}</span>
          </div>
          <div>
            <span className="text-[#4B5563] block">Reference Model Flux</span>
            <span className="font-mono tabular-nums font-medium text-[#202124]">
              {activePoint.fluxMjy.toFixed(3)} ± {activePoint.uncertaintyMjy.toFixed(3)} mJy
            </span>
          </div>
        </div>
      </div>

      {/* Calibrated / Reference SED Chart */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#202124]">
            102-Channel Spectral Energy Distribution — {targetName}
          </span>
          <span className="text-[#4B5563]">
            Demonstration Mode · Reference Physical SED (not a live SPHEREx FITS spectrum)
          </span>
        </div>

        <div className="border border-[#DADCE0] bg-white p-2 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            role="img"
            aria-label={`Reference 102-band infrared spectrum for ${targetName}`}
            className="w-full min-w-[540px] h-auto"
          >
            {/* Array Shading */}
            {SPHEREX_ARRAYS.map((arr, idx) => {
              const x0 = xForUm(arr.minUm);
              const x1 = xForUm(arr.maxUm);
              return (
                <g key={arr.arrayId}>
                  <rect
                    x={x0}
                    y={padT}
                    width={x1 - x0}
                    height={plotH}
                    fill={idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF'}
                  />
                  <line
                    x1={x0}
                    y1={padT}
                    x2={x0}
                    y2={padT + plotH}
                    stroke="#E5E7EB"
                    strokeWidth={1}
                  />
                  <text
                    x={(x0 + x1) / 2}
                    y={padT + 12}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#6B7280"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    A{arr.arrayId}
                  </text>
                </g>
              );
            })}

            {/* Molecular Landmark Guides */}
            {[
              { um: 3.05, label: 'H2O Ice' },
              { um: 3.3, label: 'CH4/PAH' },
              { um: 4.27, label: 'CO2 Ice' },
              { um: 4.67, label: 'CO' },
            ].map((feat) => {
              const fx = xForUm(feat.um);
              return (
                <g key={feat.label}>
                  <line
                    x1={fx}
                    y1={padT + 18}
                    x2={fx}
                    y2={padT + plotH}
                    stroke="#CBD5E1"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                  <text
                    x={fx}
                    y={padT + plotH - 6}
                    textAnchor="middle"
                    fontSize="8.5"
                    fill="#64748B"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {feat.label}
                  </text>
                </g>
              );
            })}

            {/* Axes */}
            <line
              x1={padL}
              y1={padT + plotH}
              x2={padL + plotW}
              y2={padT + plotH}
              stroke="#9CA3AF"
              strokeWidth={1}
            />
            <line
              x1={padL}
              y1={padT}
              x2={padL}
              y2={padT + plotH}
              stroke="#9CA3AF"
              strokeWidth={1}
            />

            {/* Y-axis ticks */}
            {[0, 0.5, 1].map((frac) => {
              const val = maxFlux * 1.08 * frac;
              const y = yForFlux(val);
              return (
                <g key={frac}>
                  <line
                    x1={padL - 4}
                    y1={y}
                    x2={padL}
                    y2={y}
                    stroke="#9CA3AF"
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9.5"
                    fill="#4B5563"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {val >= 100 ? Math.round(val) : val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* X-axis ticks */}
            {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((um) => {
              const x = xForUm(um);
              return (
                <g key={um}>
                  <line
                    x1={x}
                    y1={padT + plotH}
                    x2={x}
                    y2={padT + plotH + 4}
                    stroke="#9CA3AF"
                    strokeWidth={1}
                  />
                  <text
                    x={x}
                    y={padT + plotH + 16}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#4B5563"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    {um.toFixed(1)} µm
                  </text>
                </g>
              );
            })}

            {/* Spectrum Curve */}
            <polyline
              fill="none"
              stroke="#0B3D91"
              strokeWidth={2}
              points={polylinePoints}
            />

            {/* Interactive Band Points */}
            {spectrum.map((pt) => (
              <circle
                key={pt.bandNumber}
                cx={xForUm(pt.wavelengthUm)}
                cy={yForFlux(pt.fluxMjy)}
                r={pt.bandNumber === activeBand.bandNumber ? 4.5 : 2.2}
                fill={pt.bandNumber === activeBand.bandNumber ? '#1A73B8' : '#0B3D91'}
                className="cursor-pointer"
                onClick={() => onChangeBand(pt.bandNumber)}
              />
            ))}

            {/* Active Band Vertical Cursor */}
            <line
              x1={activeX}
              y1={padT}
              x2={activeX}
              y2={padT + plotH}
              stroke="#1A73B8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
            <circle
              cx={activeX}
              cy={activeY}
              r={5.5}
              fill="#FFFFFF"
              stroke="#0B3D91"
              strokeWidth={2}
            />

            {/* Axis Labels */}
            <text
              x={14}
              y={padT + plotH / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${padT + plotH / 2})`}
              fontSize="10"
              fill="#4B5563"
              fontFamily="Public Sans, sans-serif"
            >
              Flux Density (mJy)
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, Pause, Play, RotateCcw } from 'lucide-react';
import { CelestialTarget, ObservationEpoch } from '../data/objects';
import { SkyCoordinates } from '../lib/astronomy';
import { getSpherexBand } from '../lib/spherex';
import { bufferToRgba, renderSkyBuffer } from '../lib/skyRenderer';

type ComparisonMode = 'side-by-side' | 'difference' | 'blink';

interface ImageComparisonPanelProps {
  center: SkyCoordinates;
  fovArcmin: number;
  epochs: ObservationEpoch[];
  bandNumber: number;
  target?: CelestialTarget | null;
  includeSyntheticMover?: boolean;
}

const COMP_SIZE = 384;

export const ImageComparisonPanel: React.FC<ImageComparisonPanelProps> = ({
  center,
  fovArcmin,
  epochs,
  bandNumber,
  target,
  includeSyntheticMover = false,
}) => {
  const [mode, setMode] = useState<ComparisonMode>('side-by-side');
  const [epochAIdx, setEpochAIdx] = useState(0);
  const [epochBIdx, setEpochBIdx] = useState(Math.max(0, epochs.length - 1));

  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1.0);
  const [diffIntensity, setDiffIntensity] = useState(2.2);
  const [alignDx, setAlignDx] = useState(0);
  const [alignDy, setAlignDy] = useState(0);
  const [syncZoom, setSyncZoom] = useState(1);

  const [blinkActiveFrame, setBlinkActiveFrame] = useState<'A' | 'B'>('A');
  const [blinkRunning, setBlinkRunning] = useState(true);
  const [blinkIntervalMs, setBlinkIntervalMs] = useState(550);

  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const canvasDiffRef = useRef<HTMLCanvasElement>(null);
  const canvasBlinkRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setEpochAIdx(0);
    setEpochBIdx(Math.max(0, epochs.length - 1));
  }, [epochs]);

  useEffect(() => {
    if (mode !== 'blink' || !blinkRunning || epochs.length < 2) return;
    const timer = setInterval(() => {
      setBlinkActiveFrame((prev) => (prev === 'A' ? 'B' : 'A'));
    }, blinkIntervalMs);
    return () => clearInterval(timer);
  }, [mode, blinkRunning, blinkIntervalMs, epochs.length]);

  const epochA = epochs[epochAIdx] ?? epochs[0];
  const epochB = epochs[epochBIdx] ?? epochs[epochs.length - 1] ?? epochs[0];
  const band = getSpherexBand(bandNumber);

  const bufferA = useMemo(() => {
    if (!epochA) return new Float32Array(COMP_SIZE * COMP_SIZE);
    return renderSkyBuffer({
      width: COMP_SIZE,
      height: COMP_SIZE,
      center,
      fovArcmin,
      epochYear: epochA.yearDecimal,
      bandNumber,
      target,
      fluxMultiplier: epochA.fluxMultiplier,
      includeSyntheticMover,
    });
  }, [center, fovArcmin, epochA, bandNumber, target, includeSyntheticMover]);

  const bufferB = useMemo(() => {
    if (!epochB) return new Float32Array(COMP_SIZE * COMP_SIZE);
    return renderSkyBuffer({
      width: COMP_SIZE,
      height: COMP_SIZE,
      center,
      fovArcmin,
      epochYear: epochB.yearDecimal,
      bandNumber,
      target,
      fluxMultiplier: epochB.fluxMultiplier,
      includeSyntheticMover,
    });
  }, [center, fovArcmin, epochB, bandNumber, target, includeSyntheticMover]);

  const diffBuffer = useMemo(() => {
    const out = new Float32Array(COMP_SIZE * COMP_SIZE);
    for (let y = 0; y < COMP_SIZE; y++) {
      for (let x = 0; x < COMP_SIZE; x++) {
        const sx = Math.max(0, Math.min(COMP_SIZE - 1, Math.round(x - alignDx)));
        const sy = Math.max(0, Math.min(COMP_SIZE - 1, Math.round(y - alignDy)));
        out[y * COMP_SIZE + x] =
          bufferB[sy * COMP_SIZE + sx] - bufferA[y * COMP_SIZE + x];
      }
    }
    return out;
  }, [bufferA, bufferB, alignDx, alignDy]);

  // Helper to paint an offscreen buffer with synchronized zoom
  const paintBufferToCanvas = (
    canvas: HTMLCanvasElement | null,
    buf: Float32Array,
    isDifference: boolean,
    shiftX = 0,
    shiftY = 0
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rgba = bufferToRgba(buf, COMP_SIZE, COMP_SIZE, {
      wavelengthUm: band.wavelengthUm,
      brightness,
      contrast,
      isDifference,
      diffIntensity,
    });

    const offscreen = document.createElement('canvas');
    offscreen.width = COMP_SIZE;
    offscreen.height = COMP_SIZE;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    offCtx.putImageData(new ImageData(rgba, COMP_SIZE, COMP_SIZE), 0, 0);

    ctx.fillStyle = '#090C12';
    ctx.fillRect(0, 0, COMP_SIZE, COMP_SIZE);
    ctx.save();
    ctx.translate(COMP_SIZE / 2 + shiftX * syncZoom, COMP_SIZE / 2 + shiftY * syncZoom);
    ctx.scale(syncZoom, syncZoom);
    ctx.drawImage(offscreen, -COMP_SIZE / 2, -COMP_SIZE / 2);
    ctx.restore();
  };

  useEffect(() => {
    if (mode === 'side-by-side') {
      paintBufferToCanvas(canvasARef.current, bufferA, false, 0, 0);
      paintBufferToCanvas(canvasBRef.current, bufferB, false, alignDx, alignDy);
    } else if (mode === 'difference') {
      paintBufferToCanvas(canvasDiffRef.current, diffBuffer, true, 0, 0);
    } else if (mode === 'blink') {
      if (blinkActiveFrame === 'A') {
        paintBufferToCanvas(canvasBlinkRef.current, bufferA, false, 0, 0);
      } else {
        paintBufferToCanvas(canvasBlinkRef.current, bufferB, false, alignDx, alignDy);
      }
    }
  });

  if (epochs.length < 2) {
    return (
      <div className="border border-[#DADCE0] bg-[#F5F6F7] p-6 text-sm text-[#202124]">
        At least two observation epochs are required for side-by-side, difference, or blink comparison.
        The current target only has {epochs.length} observation epoch.
      </div>
    );
  }

  return (
    <section
      aria-label="Scientific Image Comparison"
      className="border border-[#DADCE0] bg-white"
    >
      {/* Header & Mode Switch */}
      <div className="p-4 sm:p-5 border-b border-[#DADCE0] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#202124]">
            Multi-Epoch Image Comparison
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Compare aligned infrared observations side-by-side, compute residual difference frames, or blink between epochs.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Image comparison modes"
          className="inline-flex border border-[#DADCE0] bg-[#F5F6F7] p-0.5 self-start"
        >
          {(
            [
              { id: 'side-by-side', label: 'Side by Side' },
              { id: 'difference', label: 'Image Difference' },
              { id: 'blink', label: 'Blink Comparison' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={mode === tab.id}
              onClick={() => setMode(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                mode === tab.id
                  ? 'bg-[#0B3D91] text-white'
                  : 'text-[#4B5563] hover:text-[#202124]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Epoch Selectors & Calibration Controls */}
      <div className="px-4 sm:px-5 py-4 border-b border-[#DADCE0] bg-[#F5F6F7] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label htmlFor="comp-epoch-a" className="block font-medium text-[#202124] mb-1">
            Baseline Epoch (A)
          </label>
          <select
            id="comp-epoch-a"
            value={epochAIdx}
            onChange={(e) => setEpochAIdx(Number(e.target.value))}
            className="w-full bg-white border border-[#DADCE0] px-2.5 py-1.5 font-mono text-xs text-[#202124]"
          >
            {epochs.map((ep, idx) => (
              <option key={ep.id} value={idx}>
                {ep.dateIso} · {ep.instrument}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="comp-epoch-b" className="block font-medium text-[#202124] mb-1">
            Comparison Epoch (B)
          </label>
          <select
            id="comp-epoch-b"
            value={epochBIdx}
            onChange={(e) => setEpochBIdx(Number(e.target.value))}
            className="w-full bg-white border border-[#DADCE0] px-2.5 py-1.5 font-mono text-xs text-[#202124]"
          >
            {epochs.map((ep, idx) => (
              <option key={ep.id} value={idx}>
                {ep.dateIso} · {ep.instrument}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="comp-brightness" className="flex justify-between font-medium text-[#202124] mb-1">
            <span>Brightness / Contrast</span>
            <span className="font-mono tabular-nums text-[#4B5563]">
              {brightness >= 0 ? `+${brightness.toFixed(1)}` : brightness.toFixed(1)} / {contrast.toFixed(1)}×
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="comp-brightness"
              type="range"
              min={-0.6}
              max={0.8}
              step={0.1}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-1/2 accent-[#0B3D91]"
              aria-label="Brightness adjustment"
            />
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-1/2 accent-[#0B3D91]"
              aria-label="Contrast adjustment"
            />
          </div>
        </div>

        <div>
          <label htmlFor="comp-zoom" className="flex justify-between font-medium text-[#202124] mb-1">
            <span>Synchronized Zoom &amp; Align</span>
            <span className="font-mono tabular-nums text-[#4B5563]">
              {syncZoom.toFixed(1)}× · ({alignDx}px, {alignDy}px)
            </span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="comp-zoom"
              type="range"
              min={1}
              max={4}
              step={0.25}
              value={syncZoom}
              onChange={(e) => setSyncZoom(Number(e.target.value))}
              className="flex-1 accent-[#0B3D91]"
              aria-label="Synchronized zoom"
            />
            <button
              type="button"
              onClick={() => {
                setBrightness(0);
                setContrast(1);
                setDiffIntensity(2.2);
                setAlignDx(0);
                setAlignDy(0);
                setSyncZoom(1);
              }}
              aria-label="Reset comparison controls"
              className="px-2 py-1 bg-white border border-[#DADCE0] text-[#202124] hover:border-[#0B3D91]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mode-Specific Controls */}
      <div className="px-4 sm:px-5 py-2.5 border-b border-[#DADCE0] bg-white flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-[#4B5563]">
            <span>Align X (px):</span>
            <input
              type="range"
              min={-6}
              max={6}
              step={1}
              value={alignDx}
              onChange={(e) => setAlignDx(Number(e.target.value))}
              className="w-20 accent-[#0B3D91]"
            />
            <span className="font-mono tabular-nums text-[#202124] w-5">{alignDx}</span>
          </label>
          <label className="inline-flex items-center gap-2 text-[#4B5563]">
            <span>Align Y (px):</span>
            <input
              type="range"
              min={-6}
              max={6}
              step={1}
              value={alignDy}
              onChange={(e) => setAlignDy(Number(e.target.value))}
              className="w-20 accent-[#0B3D91]"
            />
            <span className="font-mono tabular-nums text-[#202124] w-5">{alignDy}</span>
          </label>

          {mode === 'difference' && (
            <label className="inline-flex items-center gap-2 text-[#4B5563]">
              <span>Difference Gain:</span>
              <input
                type="range"
                min={0.8}
                max={5.0}
                step={0.2}
                value={diffIntensity}
                onChange={(e) => setDiffIntensity(Number(e.target.value))}
                className="w-24 accent-[#0B3D91]"
              />
              <span className="font-mono tabular-nums text-[#202124]">
                {diffIntensity.toFixed(1)}×
              </span>
            </label>
          )}
        </div>

        {mode === 'blink' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setBlinkRunning((r) => !r)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0B3D91] text-white font-medium"
            >
              {blinkRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{blinkRunning ? 'Pause Blink' : 'Start Blink'}</span>
            </button>
            <select
              aria-label="Blink cadence"
              value={blinkIntervalMs}
              onChange={(e) => setBlinkIntervalMs(Number(e.target.value))}
              className="border border-[#DADCE0] bg-white px-2 py-1 font-mono"
            >
              <option value={300}>300 ms (Fast)</option>
              <option value={550}>550 ms (Standard)</option>
              <option value={1000}>1000 ms (Slow)</option>
            </select>
          </div>
        )}
      </div>

      {/* Viewport Panels */}
      <div className="p-4 sm:p-5">
        {mode === 'side-by-side' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <figure className="border border-[#DADCE0] bg-[#090C12]">
              <canvas
                ref={canvasARef}
                width={COMP_SIZE}
                height={COMP_SIZE}
                className="w-full aspect-square object-contain"
              />
              <figcaption className="bg-white border-t border-[#DADCE0] px-3 py-2 text-xs flex items-center justify-between">
                <span className="font-semibold text-[#202124]">
                  Epoch A · {epochA.dateIso}
                </span>
                <span className="font-mono text-[#4B5563]">
                  {epochA.dataProvenance}
                </span>
              </figcaption>
            </figure>

            <figure className="border border-[#DADCE0] bg-[#090C12]">
              <canvas
                ref={canvasBRef}
                width={COMP_SIZE}
                height={COMP_SIZE}
                className="w-full aspect-square object-contain"
              />
              <figcaption className="bg-white border-t border-[#DADCE0] px-3 py-2 text-xs flex items-center justify-between">
                <span className="font-semibold text-[#202124]">
                  Epoch B · {epochB.dateIso}
                </span>
                <span className="font-mono text-[#4B5563]">
                  {epochB.dataProvenance}
                </span>
              </figcaption>
            </figure>
          </div>
        )}

        {mode === 'difference' && (
          <div className="max-w-xl mx-auto">
            <figure className="border border-[#DADCE0] bg-[#090C12]">
              <canvas
                ref={canvasDiffRef}
                width={COMP_SIZE}
                height={COMP_SIZE}
                className="w-full aspect-square object-contain"
              />
              <figcaption className="bg-white border-t border-[#DADCE0] px-4 py-3 text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-[#202124]">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0B3D91]" />
                    Processed Difference Image (Epoch B {epochB.dateIso} − Epoch A {epochA.dateIso})
                  </span>
                  <span className="font-mono text-[#0B3D91]">Processed Product</span>
                </div>
                <p className="text-[#4B5563]">
                  Warm amber pixels indicate positive flux at Epoch B; cool blue pixels indicate the prior Epoch A position or negative flux change. Static background stars cancel out.
                </p>
              </figcaption>
            </figure>
          </div>
        )}

        {mode === 'blink' && (
          <div className="max-w-xl mx-auto">
            <figure className="border border-[#DADCE0] bg-[#090C12]">
              <canvas
                ref={canvasBlinkRef}
                width={COMP_SIZE}
                height={COMP_SIZE}
                className="w-full aspect-square object-contain"
              />
              <figcaption className="bg-white border-t border-[#DADCE0] px-4 py-3 text-xs flex items-center justify-between">
                <span className="font-semibold text-[#202124] font-mono tabular-nums">
                  Showing Frame {blinkActiveFrame}:{' '}
                  {blinkActiveFrame === 'A' ? epochA.dateIso : epochB.dateIso}
                </span>
                <span className="text-[#4B5563]">
                  Blink Alignment Mode ({blinkActiveFrame === 'A' ? epochA.instrument : epochB.instrument})
                </span>
              </figcaption>
            </figure>
          </div>
        )}
      </div>
    </section>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Download,
  FileDown,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CelestialTarget, ObservationEpoch } from '../data/objects';
import {
  formatDecDms,
  formatRaHms,
  pixelToWcs,
  propagateProperMotion,
  SkyCoordinates,
  wcsToPixel,
} from '../lib/astronomy';
import { getSpherexBand } from '../lib/spherex';
import { bufferToRgba, renderSkyBuffer } from '../lib/skyRenderer';
import { MovingObjectCandidate } from '../lib/detection';

export type SurveyOverlayMode =
  | 'simulation'
  | 'CDS/P/allWISE/color'
  | 'CDS/P/2MASS/color'
  | 'CDS/P/DSS2/color';

interface SkyCanvasViewerProps {
  center: SkyCoordinates;
  fovArcmin: number;
  epoch: ObservationEpoch;
  bandNumber: number;
  target?: CelestialTarget | null;
  includeSyntheticMover?: boolean;
  candidates?: MovingObjectCandidate[];
  selectedCandidateId?: string | null;
  surveyMode?: SurveyOverlayMode;
  onSurveyModeChange?: (mode: SurveyOverlayMode) => void;
  brightness?: number;
  contrast?: number;
  compact?: boolean;
  onArchiveStatusChange?: (status: 'live-archive' | 'demonstration', message?: string) => void;
}

const PLATE_SIZE = 512;

export const SkyCanvasViewer: React.FC<SkyCanvasViewerProps> = ({
  center,
  fovArcmin,
  epoch,
  bandNumber,
  target,
  includeSyntheticMover = false,
  candidates = [],
  selectedCandidateId = null,
  surveyMode = 'simulation',
  onSurveyModeChange,
  brightness = 0,
  contrast = 1,
  compact = false,
  onArchiveStatusChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [showGrid, setShowGrid] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorCoords, setCursorCoords] = useState<SkyCoordinates | null>(null);

  const [liveArchiveImg, setLiveArchiveImg] = useState<HTMLImageElement | null>(null);
  const [archiveNotice, setArchiveNotice] = useState<string>(
    'Demonstration Mode — Calibrated synthetic infrared plate'
  );

  const band = getSpherexBand(bandNumber);

  // Reset pan/zoom when center or FOV changes meaningfully
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [center.raDeg, center.decDeg, fovArcmin]);

  // Attempt live archival HiPS cutout fetch when an archival survey mode is selected
  useEffect(() => {
    if (surveyMode === 'simulation') {
      setLiveArchiveImg(null);
      const msg =
        'Demonstration Mode — Calibrated multi-epoch SPHEREx/IR simulation (live SPHEREx 102-band FITS cutouts unavailable)';
      setArchiveNotice(msg);
      onArchiveStatusChange?.('demonstration', msg);
      return;
    }

    let cancelled = false;
    setArchiveNotice(`Querying live ${surveyMode.replace('CDS/P/', '')} archive...`);

    const url = `/api/archive/cutout?ra=${center.raDeg.toFixed(6)}&dec=${center.decDeg.toFixed(
      6
    )}&fov=${fovArcmin}&survey=${encodeURIComponent(surveyMode)}`;

    fetch(url)
      .then(async (resp) => {
        if (!resp.ok) throw new Error('Archive unavailable');
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          if (cancelled) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          setLiveArchiveImg(img);
          const msg = `Live Archive Cutout (${surveyMode.replace('CDS/P/', '')}) via CDS HiPS2FITS`;
          setArchiveNotice(msg);
          onArchiveStatusChange?.('live-archive', msg);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          if (!cancelled) {
            setLiveArchiveImg(null);
            const msg =
              'Live archive cutout unreachable from runtime — showing calibrated Demonstration Mode plate';
            setArchiveNotice(msg);
            onArchiveStatusChange?.('demonstration', msg);
          }
        };
        img.src = objectUrl;
      })
      .catch(() => {
        if (!cancelled) {
          setLiveArchiveImg(null);
          const msg =
            'Live archive cutout unreachable from runtime — showing calibrated Demonstration Mode plate';
          setArchiveNotice(msg);
          onArchiveStatusChange?.('demonstration', msg);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [surveyMode, center.raDeg, center.decDeg, fovArcmin, onArchiveStatusChange]);

  // Compute calibrated sky intensity buffer
  const skyBuffer = useMemo(() => {
    return renderSkyBuffer({
      width: PLATE_SIZE,
      height: PLATE_SIZE,
      center,
      fovArcmin,
      epochYear: epoch.yearDecimal,
      bandNumber,
      target,
      fluxMultiplier: epoch.fluxMultiplier,
      includeSyntheticMover,
    });
  }, [center, fovArcmin, epoch.yearDecimal, epoch.fluxMultiplier, bandNumber, target, includeSyntheticMover]);

  // Paint sky plate + WCS grid + candidate overlays onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Offscreen plate image
    const offscreen = document.createElement('canvas');
    offscreen.width = PLATE_SIZE;
    offscreen.height = PLATE_SIZE;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    if (liveArchiveImg && surveyMode !== 'simulation') {
      offCtx.filter = `brightness(${100 + brightness * 40}%) contrast(${Math.round(
        contrast * 100
      )}%)`;
      offCtx.drawImage(liveArchiveImg, 0, 0, PLATE_SIZE, PLATE_SIZE);
      offCtx.filter = 'none';
    } else {
      const rgba = bufferToRgba(skyBuffer, PLATE_SIZE, PLATE_SIZE, {
        wavelengthUm: band.wavelengthUm,
        brightness,
        contrast,
      });
      const imgData = new ImageData(rgba, PLATE_SIZE, PLATE_SIZE);
      offCtx.putImageData(imgData, 0, 0);
    }

    // Clear main viewport
    ctx.fillStyle = '#090C12';
    ctx.fillRect(0, 0, PLATE_SIZE, PLATE_SIZE);

    ctx.save();
    ctx.translate(PLATE_SIZE / 2 + pan.x, PLATE_SIZE / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(offscreen, -PLATE_SIZE / 2, -PLATE_SIZE / 2);

    // Optional WCS Grid overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(148, 197, 255, 0.25)';
      ctx.lineWidth = 1 / zoom;
      const step = PLATE_SIZE / 4;
      for (let i = -1; i <= 1; i++) {
        const offset = i * step;
        ctx.beginPath();
        ctx.moveTo(offset, -PLATE_SIZE / 2);
        ctx.lineTo(offset, PLATE_SIZE / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-PLATE_SIZE / 2, offset);
        ctx.lineTo(PLATE_SIZE / 2, offset);
        ctx.stroke();
      }
      // Subtle compass indicator (N up, E left)
      ctx.fillStyle = 'rgba(219, 234, 254, 0.78)';
      ctx.font = `${Math.max(9, Math.round(11 / zoom))}px "IBM Plex Mono", monospace`;
      ctx.fillText('N ↑', -PLATE_SIZE / 2 + 12, -PLATE_SIZE / 2 + 20);
      ctx.fillText('← E', -PLATE_SIZE / 2 + 12, -PLATE_SIZE / 2 + 34);
    }

    // Optional target & candidate overlays
    if (showMarkers) {
      if (target) {
        const propagated = propagateProperMotion(
          { raDeg: target.raDeg, decDeg: target.decDeg },
          target.pmRaCosDecMasYr,
          target.pmDecMasYr,
          target.referenceEpochYear,
          epoch.yearDecimal
        );
        const px = wcsToPixel(propagated, PLATE_SIZE, PLATE_SIZE, center, fovArcmin);
        const cx = px.x - PLATE_SIZE / 2;
        const cy = px.y - PLATE_SIZE / 2;
        const r = 13 / zoom;

        ctx.strokeStyle = 'rgba(96, 165, 250, 0.9)';
        ctx.lineWidth = 1.4 / zoom;
        ctx.beginPath();
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx - r * 0.45, cy);
        ctx.moveTo(cx + r * 0.45, cy);
        ctx.lineTo(cx + r, cy);
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx, cy - r * 0.45);
        ctx.moveTo(cx, cy + r * 0.45);
        ctx.lineTo(cx, cy + r);
        ctx.stroke();
      }

      candidates.forEach((cand, idx) => {
        const isSel = cand.candidateId === selectedCandidateId;
        const pos = wcsToPixel(
          { raDeg: cand.raDeg, decDeg: cand.decDeg },
          PLATE_SIZE,
          PLATE_SIZE,
          center,
          fovArcmin
        );
        const cx = pos.x - PLATE_SIZE / 2;
        const cy = pos.y - PLATE_SIZE / 2;

        ctx.strokeStyle = isSel ? '#FBBF24' : 'rgba(251, 191, 36, 0.72)';
        ctx.lineWidth = (isSel ? 2 : 1.2) / zoom;
        ctx.beginPath();
        ctx.arc(cx, cy, 14 / zoom, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#FBBF24';
        ctx.font = `${Math.max(9, Math.round(10 / zoom))}px "IBM Plex Mono", monospace`;
        const yOffset = ((idx % 3) - 1) * (12 / zoom);
        ctx.fillText(cand.candidateId, cx + 16 / zoom, cy + 4 / zoom + yOffset);
      });
    }

    ctx.restore();
  }, [
    skyBuffer,
    liveArchiveImg,
    surveyMode,
    band.wavelengthUm,
    brightness,
    contrast,
    zoom,
    pan,
    showGrid,
    showMarkers,
    target,
    epoch.yearDecimal,
    center,
    fovArcmin,
    candidates,
    selectedCandidateId,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom((z) => Math.max(0.75, Math.min(8, Number((z * factor).toFixed(2)))));
    };
    canvas.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const canvasX = ((e.clientX - rect.left) / rect.width) * PLATE_SIZE;
      const canvasY = ((e.clientY - rect.top) / rect.height) * PLATE_SIZE;
      const plateX = (canvasX - PLATE_SIZE / 2 - pan.x) / zoom + PLATE_SIZE / 2;
      const plateY = (canvasY - PLATE_SIZE / 2 - pan.y) / zoom + PLATE_SIZE / 2;
      setCursorCoords(pixelToWcs(plateX, plateY, PLATE_SIZE, PLATE_SIZE, center, fovArcmin));
    }

    if (dragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    }
  };

  const handleMouseUpOrLeave = () => {
    setDragging(false);
  };

  const handleToggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    const nameSlug = (target?.id || 'sky-region').replace(/[^a-z0-9-_]/gi, '_');
    link.download = `afterlight_${nameSlug}_${epoch.dateIso}_band${bandNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const fitsDownloadUrl = `/api/archive/fits-export?ra=${center.raDeg.toFixed(
    6
  )}&dec=${center.decDeg.toFixed(6)}&fov=${fovArcmin}&epoch=${encodeURIComponent(
    epoch.dateIso
  )}&band=${bandNumber}&targetName=${encodeURIComponent(target?.name || 'SKY_REGION')}`;

  return (
    <div
      ref={containerRef}
      className="border border-[#DADCE0] bg-white flex flex-col"
    >
      {/* Instrument Toolbar */}
      <div className="px-4 py-2.5 border-b border-[#DADCE0] bg-[#F5F6F7] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(8, Number((z * 1.25).toFixed(2))))}
            aria-label="Zoom in sky plate"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] hover:border-[#0B3D91] whitespace-nowrap shrink-0"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Zoom In</span>
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, Number((z / 1.25).toFixed(2))))}
            aria-label="Zoom out sky plate"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] hover:border-[#0B3D91] whitespace-nowrap shrink-0"
          >
            <ZoomOut className="w-3.5 h-3.5" />
            <span>Zoom Out</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            aria-label="Reset zoom and pan"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] hover:border-[#0B3D91] whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            aria-pressed={showGrid}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border whitespace-nowrap shrink-0 ${
              showGrid
                ? 'bg-[#0B3D91] text-white border-[#0B3D91]'
                : 'bg-white text-[#202124] border-[#DADCE0] hover:border-[#0B3D91]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>WCS Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setShowMarkers((m) => !m)}
            aria-pressed={showMarkers}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border whitespace-nowrap shrink-0 ${
              showMarkers
                ? 'bg-[#0B3D91] text-white border-[#0B3D91]'
                : 'bg-white text-[#202124] border-[#DADCE0] hover:border-[#0B3D91]'
            }`}
          >
            <span>Crosshair</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSurveyModeChange && (
            <label className="inline-flex items-center gap-1.5 text-xs text-[#4B5563]">
              <span className="sr-only">Survey layer</span>
              <select
                aria-label="Survey cutout source"
                value={surveyMode}
                onChange={(e) => onSurveyModeChange(e.target.value as SurveyOverlayMode)}
                className="bg-white border border-[#DADCE0] px-2.5 py-1.5 text-xs font-medium text-[#202124] focus:outline-none focus:border-[#0B3D91]"
              >
                <option value="simulation">SPHEREx Demonstration Plate</option>
                <option value="CDS/P/allWISE/color">Live Archive: AllWISE Color</option>
                <option value="CDS/P/2MASS/color">Live Archive: 2MASS Near-IR</option>
                <option value="CDS/P/DSS2/color">Live Archive: DSS2 Optical</option>
              </select>
            </label>
          )}

          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] hover:border-[#0B3D91] whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>

          <a
            href={fitsDownloadUrl}
            download
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] hover:border-[#0B3D91] whitespace-nowrap shrink-0"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>FITS</span>
          </a>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen viewer'}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] hover:border-[#0B3D91] whitespace-nowrap shrink-0"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Astronomical Canvas Plate */}
      <div
        data-lenis-prevent
        className="relative bg-[#090C12] flex items-center justify-center overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          data-testid="sky-canvas"
          width={PLATE_SIZE}
          height={PLATE_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={() => {
            handleMouseUpOrLeave();
            setCursorCoords(null);
          }}
          className={`w-full ${
            compact ? 'max-h-[400px]' : 'max-h-[540px]'
          } aspect-square object-contain cursor-crosshair select-none`}
        />

        {/* Bottom-left live WCS cursor readout */}
        <div className="absolute bottom-3 left-3 bg-[#090C12]/85 border border-white/15 px-3 py-1.5 text-xs font-mono tabular-nums text-white pointer-events-none">
          {cursorCoords
            ? `RA ${formatRaHms(cursorCoords.raDeg)} · Dec ${formatDecDms(cursorCoords.decDeg)}`
            : `Center ${formatRaHms(center.raDeg)} · ${formatDecDms(center.decDeg)}`}
        </div>

        {/* Bottom-right scale & zoom readout */}
        <div className="absolute bottom-3 right-3 bg-[#090C12]/85 border border-white/15 px-3 py-1.5 text-xs font-mono tabular-nums text-white pointer-events-none">
          FOV {fovArcmin}' × {fovArcmin}' · {zoom.toFixed(2)}×
        </div>
      </div>

      {/* Scientific Plate Metadata Strip */}
      <div className="px-4 py-3 border-t border-[#DADCE0] bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#4B5563]">
        <div className="font-mono tabular-nums">
          <span>Epoch {epoch.dateIso}</span>
          <span className="mx-2 text-[#DADCE0]">|</span>
          <span>
            Band {band.bandNumber} ({band.wavelengthUm.toFixed(3)} µm · Array {band.arrayId})
          </span>
          <span className="mx-2 text-[#DADCE0]">|</span>
          <span>{epoch.instrument}</span>
        </div>
        <div className="text-[#4B5563] font-medium">{archiveNotice}</div>
      </div>
    </div>
  );
};

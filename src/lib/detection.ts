import {
  angularSeparationArcsec,
  formatDecDms,
  formatRaHms,
  pixelToWcs,
  SkyCoordinates,
} from './astronomy';

export interface DetectedSource {
  id: string;
  x: number;
  y: number;
  peakFlux: number;
  integratedFlux: number;
  snr: number;
  raDeg: number;
  decDeg: number;
}

export type ReviewStatus =
  | 'Pending Review'
  | 'Under Inspection'
  | 'Matched Known Object';

export interface MovingObjectCandidate {
  candidateId: string;
  raDeg: number;
  decDeg: number;
  raHms: string;
  decDms: string;
  epochADate: string;
  epochBDate: string;
  displacementArcsec: number;
  displacementPx: number;
  properMotionArcsecYr: number;
  positionAngleDeg: number;
  snrEpochA: number;
  snrEpochB: number;
  confidence: number;
  reviewStatus: ReviewStatus;
  epochAPos: { x: number; y: number };
  epochBPos: { x: number; y: number };
  classificationNote: string;
}

export interface DetectionSummary {
  epochASourceCount: number;
  epochBSourceCount: number;
  matchedStaticCount: number;
  astrometricRmsArcsec: number;
  candidates: MovingObjectCandidate[];
}

function estimateBackground(data: Float32Array): { median: number; sigma: number } {
  const step = Math.max(1, Math.floor(data.length / 2048));
  const samples: number[] = [];
  for (let i = 0; i < data.length; i += step) {
    samples.push(data[i]);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)] ?? 0;

  const deviations = samples.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)] ?? 1e-4;
  const sigma = Math.max(0.002, 1.4826 * mad);
  return { median, sigma };
}

/**
 * Extract 2D point sources via local-maximum detection and intensity-weighted centroiding.
 */
export function extractPointSources(
  buffer: Float32Array,
  width: number,
  height: number,
  center: SkyCoordinates,
  fovArcmin: number,
  snrThreshold = 5.5
): DetectedSource[] {
  const { median, sigma } = estimateBackground(buffer);
  const threshold = median + snrThreshold * sigma;
  const rawPeaks: Array<{ x: number; y: number; val: number }> = [];

  const margin = 4;
  for (let y = margin; y < height - margin; y++) {
    for (let x = margin; x < width - margin; x++) {
      const idx = y * width + x;
      const val = buffer[idx];
      if (val < threshold) continue;

      let isMax = true;
      for (let dy = -2; dy <= 2 && isMax; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (buffer[(y + dy) * width + (x + dx)] > val) {
            isMax = false;
            break;
          }
        }
      }
      if (isMax) {
        rawPeaks.push({ x, y, val });
      }
    }
  }

  // Sort brightest first and suppress adjacent peaks / diffraction spikes
  rawPeaks.sort((a, b) => b.val - a.val);
  const sources: DetectedSource[] = [];

  for (const peak of rawPeaks) {
    const tooClose = sources.some((s) => {
      const dist = Math.hypot(s.x - peak.x, s.y - peak.y);
      if (dist < 6) return true;
      // Suppress diffraction-spike knots around bright stars
      if (s.peakFlux > 0.75 && dist < 24 && peak.val < s.peakFlux * 0.35) {
        return true;
      }
      return false;
    });
    if (tooClose) continue;

    // 3-pixel radius intensity-weighted centroid
    let sumW = 0;
    let sumWx = 0;
    let sumWy = 0;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const px = peak.x + dx;
        const py = peak.y + dy;
        const w = Math.max(0, buffer[py * width + px] - median);
        sumW += w;
        sumWx += w * px;
        sumWy += w * py;
      }
    }

    const cx = sumW > 0 ? sumWx / sumW : peak.x;
    const cy = sumW > 0 ? sumWy / sumW : peak.y;
    const wcs = pixelToWcs(cx, cy, width, height, center, fovArcmin);
    const snr = (peak.val - median) / sigma;

    sources.push({
      id: `SRC-${sources.length + 1}`,
      x: cx,
      y: cy,
      peakFlux: peak.val,
      integratedFlux: sumW,
      snr: Number(snr.toFixed(1)),
      raDeg: wcs.raDeg,
      decDeg: wcs.decDeg,
    });
  }

  return sources.slice(0, 60);
}

/**
 * Compare two aligned epoch frames to separate static background stars from
 * high-proper-motion or transient moving candidates.
 */
export function detectMovingCandidates(params: {
  bufferA: Float32Array;
  bufferB: Float32Array;
  width: number;
  height: number;
  center: SkyCoordinates;
  fovArcmin: number;
  epochADate: string;
  epochBDate: string;
  epochAYear: number;
  epochBYear: number;
  knownObjectName?: string;
}): DetectionSummary {
  const {
    bufferA,
    bufferB,
    width,
    height,
    center,
    fovArcmin,
    epochADate,
    epochBDate,
    epochAYear,
    epochBYear,
    knownObjectName,
  } = params;

  const sourcesA = extractPointSources(bufferA, width, height, center, fovArcmin);
  const sourcesB = extractPointSources(bufferB, width, height, center, fovArcmin);

  const usedB = new Set<number>();
  let matchedStaticCount = 0;
  let sumSqArcsec = 0;
  const movedMatches: Array<{ a: DetectedSource; b: DetectedSource; distPx: number; sepArcsec: number }> = [];

  // Pass 1: Match static stars (< 1.5 px)
  const unmatchedA: DetectedSource[] = [];
  for (const sa of sourcesA) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < sourcesB.length; j++) {
      if (usedB.has(j)) continue;
      const d = Math.hypot(sa.x - sourcesB[j].x, sa.y - sourcesB[j].y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0 && bestDist <= 1.5) {
      usedB.add(bestIdx);
      matchedStaticCount += 1;
      const sep = angularSeparationArcsec(sa, sourcesB[bestIdx]);
      sumSqArcsec += sep * sep;
    } else {
      unmatchedA.push(sa);
    }
  }

  // Pass 2: Pair remaining sources within search radius (handles rapid proper motion up to ~40% of frame)
  const maxSearchPx = Math.min(160, Math.max(40, width * 0.42));
  const usedUnmatchedB = new Set<number>();

  for (const sa of unmatchedA) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < sourcesB.length; j++) {
      if (usedB.has(j) || usedUnmatchedB.has(j)) continue;
      const d = Math.hypot(sa.x - sourcesB[j].x, sa.y - sourcesB[j].y);
      if (d > 1.5 && d <= maxSearchPx && d < bestDist) {
        bestDist = d;
        bestIdx = j;
      }
    }

    if (bestIdx >= 0) {
      usedUnmatchedB.add(bestIdx);
      const sb = sourcesB[bestIdx];
      const sepArcsec = angularSeparationArcsec(sa, sb);
      movedMatches.push({ a: sa, b: sb, distPx: bestDist, sepArcsec });
    }
  }

  const dtYears = Math.max(0.1, Math.abs(epochBYear - epochAYear));
  const candidates: MovingObjectCandidate[] = movedMatches
    .map((m, idx) => {
      const pmArcsecYr = m.sepArcsec / dtYears;
      const dx = m.b.x - m.a.x;
      const dy = m.b.y - m.a.y;
      const paRad = Math.atan2(-dx, -dy);
      const paDeg = ((paRad * 180) / Math.PI + 360) % 360;

      const snrMin = Math.min(m.a.snr, m.b.snr);
      const snrScore = Math.min(1, snrMin / 28);
      const dispScore = Math.min(1, m.distPx / 8);
      const confidence = Number(Math.min(0.98, 0.45 * snrScore + 0.35 * dispScore + 0.18).toFixed(2));

      // Distance from field center helps note if it corresponds to the catalog target
      const distFromCenter = angularSeparationArcsec(m.b, center);
      const isKnownCenterTarget = Boolean(knownObjectName) && distFromCenter < 120;

      return {
        candidateId: `CAND-${String(idx + 1).padStart(3, '0')}`,
        raDeg: m.b.raDeg,
        decDeg: m.b.decDeg,
        raHms: formatRaHms(m.b.raDeg),
        decDms: formatDecDms(m.b.decDeg),
        epochADate,
        epochBDate,
        displacementArcsec: Number(m.sepArcsec.toFixed(2)),
        displacementPx: Number(m.distPx.toFixed(1)),
        properMotionArcsecYr: Number(pmArcsecYr.toFixed(3)),
        positionAngleDeg: Number(paDeg.toFixed(1)),
        snrEpochA: m.a.snr,
        snrEpochB: m.b.snr,
        confidence,
        reviewStatus: isKnownCenterTarget
          ? ('Matched Known Object' as ReviewStatus)
          : ('Pending Review' as ReviewStatus),
        epochAPos: { x: m.a.x, y: m.a.y },
        epochBPos: { x: m.b.x, y: m.b.y },
        classificationNote: isKnownCenterTarget
          ? `Positional offset aligns with expected proper motion of ${knownObjectName}. Requires astrometric confirmation.`
          : 'Unmatched point-source offset detected between epochs. Requires human verification against Gaia DR3 / MPC ephemerides.',
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const astrometricRmsArcsec =
    matchedStaticCount > 0 ? Number(Math.sqrt(sumSqArcsec / matchedStaticCount).toFixed(3)) : 0;

  return {
    epochASourceCount: sourcesA.length,
    epochBSourceCount: sourcesB.length,
    matchedStaticCount,
    astrometricRmsArcsec,
    candidates,
  };
}

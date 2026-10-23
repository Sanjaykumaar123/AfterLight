import { CelestialTarget } from '../data/objects';
import { propagateProperMotion, SkyCoordinates, wcsToPixel } from './astronomy';
import { getSpherexBand } from './spherex';

export interface SkyFieldStar {
  id: string;
  raDeg: number;
  decDeg: number;
  baseFlux: number;
  colorTempK: number;
  isGalaxy?: boolean;
  ellipticity?: number;
  angleRad?: number;
}

/**
 * Deterministic 32-bit PRNG (Mulberry32) seeded by sky coordinates so any RA/Dec
 * yields a stable background starfield across epochs and wavelength bands.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromCoordinates(raDeg: number, decDeg: number): number {
  const r = Math.round(raDeg * 100);
  const d = Math.round((decDeg + 90) * 100);
  return ((r * 73856093) ^ (d * 19349663)) >>> 0;
}

/**
 * Generate deterministic background field stars & faint galaxies around a sky center.
 */
export function generateBackgroundField(
  center: SkyCoordinates,
  fovArcmin: number,
  starCount = 72
): SkyFieldStar[] {
  const rng = mulberry32(seedFromCoordinates(center.raDeg, center.decDeg));
  const fovDeg = fovArcmin / 60;
  const cosDec = Math.max(0.1, Math.cos((center.decDeg * Math.PI) / 180));

  const stars: SkyFieldStar[] = [];
  for (let i = 0; i < starCount; i++) {
    const dxDeg = (rng() - 0.5) * fovDeg * 1.25;
    const dyDeg = (rng() - 0.5) * fovDeg * 1.25;
    const isGalaxy = i % 9 === 0;
    stars.push({
      id: `BG-${i + 1}`,
      raDeg: center.raDeg + dxDeg / cosDec,
      decDeg: Math.max(-89.9, Math.min(89.9, center.decDeg + dyDeg)),
      baseFlux: 0.14 + Math.pow(rng(), 2.2) * 0.78,
      colorTempK: isGalaxy ? 2400 : 3200 + rng() * 4800,
      isGalaxy,
      ellipticity: isGalaxy ? 0.35 + rng() * 0.35 : 0,
      angleRad: rng() * Math.PI,
    });
  }
  return stars;
}

/**
 * Wavelength-dependent relative flux response for a given star temperature or target profile.
 */
function starBandResponse(tempK: number, wavelengthUm: number): number {
  const refUm = 2.2;
  const hcOverK = 14387.77;
  const val = 1 / (Math.pow(wavelengthUm, 3) * (Math.exp(Math.min(50, hcOverK / (wavelengthUm * tempK))) - 1));
  const ref = 1 / (Math.pow(refUm, 3) * (Math.exp(Math.min(50, hcOverK / (refUm * tempK))) - 1));
  return Math.max(0.15, Math.min(2.4, val / ref));
}

function targetBandResponse(target: CelestialTarget, wavelengthUm: number): number {
  if (target.spectralProfile === 'y-dwarf') {
    // Virtually invisible < 2.2 um, rises sharply toward 4.5-5.0 um
    if (wavelengthUm < 1.8) return 0.04;
    if (wavelengthUm < 3.0) return 0.14;
    if (wavelengthUm < 4.0) return 0.42;
    return 0.78 + ((wavelengthUm - 4.0) / 1.0) * 0.45;
  }
  if (target.spectralProfile === 't-dwarf') {
    const ch4 = 1 - 0.45 * Math.exp(-Math.pow((wavelengthUm - 3.3) / 0.25, 2));
    return (0.55 + 0.12 * wavelengthUm) * ch4;
  }
  if (target.spectralProfile === 't-tauri-dust') {
    return 0.7 + 0.22 * wavelengthUm;
  }
  if (target.spectralProfile === 'mira-giant') {
    return 1.15 - 0.06 * wavelengthUm;
  }
  return starBandResponse(3150, wavelengthUm);
}

export interface RenderSkyBufferOptions {
  width: number;
  height: number;
  center: SkyCoordinates;
  fovArcmin: number;
  epochYear: number;
  bandNumber: number;
  target?: CelestialTarget | null;
  fluxMultiplier?: number;
  includeSyntheticMover?: boolean;
}

/**
 * Render a calibrated 2D floating-point astronomical intensity buffer (0..1+)
 * representing stars, PSF wings, diffraction spikes, proper-motion targets, and sky noise.
 */
export function renderSkyBuffer(opts: RenderSkyBufferOptions): Float32Array {
  const {
    width,
    height,
    center,
    fovArcmin,
    epochYear,
    bandNumber,
    target,
    fluxMultiplier = 1,
    includeSyntheticMover = false,
  } = opts;

  const buffer = new Float32Array(width * height);
  const band = getSpherexBand(bandNumber);
  const bgStars = generateBackgroundField(center, fovArcmin, 70);

  // Calibrated background sky level + deterministic Poisson-like grain
  const rng = mulberry32(
    seedFromCoordinates(center.raDeg, center.decDeg) ^ Math.round(epochYear * 100) ^ bandNumber
  );
  const skyPedestal = 0.035 + (band.wavelengthUm / 5.0) * 0.018;
  for (let i = 0; i < buffer.length; i++) {
    const n = (rng() + rng() - 1) * 0.012;
    buffer[i] = Math.max(0.005, skyPedestal + n);
  }

  const stampPsf = (
    cx: number,
    cy: number,
    amplitude: number,
    sigmaPx: number,
    diffractionSpikes = false
  ) => {
    const rad = Math.ceil(sigmaPx * (diffractionSpikes ? 9 : 4.5));
    const minX = Math.max(0, Math.floor(cx - rad));
    const maxX = Math.min(width - 1, Math.ceil(cx + rad));
    const minY = Math.max(0, Math.floor(cy - rad));
    const maxY = Math.min(height - 1, Math.ceil(cy + rad));
    const inv2Sig2 = 1 / (2 * sigmaPx * sigmaPx);

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const r2 = dx * dx + dy * dy;
        let val = amplitude * Math.exp(-r2 * inv2Sig2);

        // Subtle Airy wing
        val += amplitude * 0.08 * Math.exp(-r2 / (8 * sigmaPx * sigmaPx));

        if (diffractionSpikes && amplitude > 0.75) {
          const spikeX = Math.exp(-Math.abs(dy) * 0.85) * Math.exp(-Math.abs(dx) * 0.09);
          const spikeY = Math.exp(-Math.abs(dx) * 0.85) * Math.exp(-Math.abs(dy) * 0.09);
          val += amplitude * 0.22 * (spikeX + spikeY);
        }

        buffer[y * width + x] += val;
      }
    }
  };

  // Wavelength slightly broadens the diffraction-limited PSF
  const psfSigma = 1.65 + (band.wavelengthUm / 5.0) * 0.65;

  for (const s of bgStars) {
    const pos = wcsToPixel(s, width, height, center, fovArcmin);
    if (pos.x < -12 || pos.x > width + 12 || pos.y < -12 || pos.y > height + 12) continue;
    const resp = starBandResponse(s.colorTempK, band.wavelengthUm);
    const amp = s.baseFlux * resp * 0.72;
    stampPsf(pos.x, pos.y, amp, s.isGalaxy ? psfSigma * 1.65 : psfSigma * 0.95, false);
  }

  // Render primary science target propagated to epochYear
  if (target) {
    const targetSkyPos = propagateProperMotion(
      { raDeg: target.raDeg, decDeg: target.decDeg },
      target.pmRaCosDecMasYr,
      target.pmDecMasYr,
      target.referenceEpochYear,
      epochYear
    );
    const px = wcsToPixel(targetSkyPos, width, height, center, fovArcmin);
    const resp = targetBandResponse(target, band.wavelengthUm);
    const baseAmp =
      target.spectralProfile === 'y-dwarf'
        ? 0.95
        : target.spectralProfile === 't-dwarf'
        ? 1.05
        : 1.45;
    const amp = Math.max(0.03, baseAmp * resp * fluxMultiplier);
    stampPsf(
      px.x,
      px.y,
      amp,
      psfSigma * 1.15,
      target.spectralProfile !== 'y-dwarf'
    );

    // Epsilon Indi B binary companion visual separation
    if (target.id === 'epsilon-indi-b') {
      stampPsf(px.x + 4.8, px.y + 1.6, amp * 0.62, psfSigma * 1.05, false);
    }
  } else if (includeSyntheticMover) {
    // Arbitrary coordinate search: inject a faint high-proper-motion benchmark source
    // only when explicitly requested for moving-object demonstration in uncatalogued fields
    const dt = epochYear - 2016;
    const moverPos = propagateProperMotion(
      { raDeg: center.raDeg + 0.012, decDeg: center.decDeg - 0.008 },
      -4200,
      1950,
      2016,
      2016 + dt
    );
    const px = wcsToPixel(moverPos, width, height, center, fovArcmin);
    stampPsf(px.x, px.y, 0.78, psfSigma * 1.05, false);
  }

  return buffer;
}

/**
 * Convert a Float32Array sky intensity buffer into RGBA pixels using a linear/asinh stretch
 * and false-color infrared palette driven by SPHEREx wavelength band.
 */
export function bufferToRgba(
  buffer: Float32Array,
  width: number,
  height: number,
  options: {
    wavelengthUm: number;
    brightness?: number;
    contrast?: number;
    isDifference?: boolean;
    diffIntensity?: number;
  }
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
  const {
    wavelengthUm,
    brightness = 0,
    contrast = 1,
    isDifference = false,
    diffIntensity = 1.6,
  } = options;

  // Color ramp smoothly shifts from cobalt-cyan (0.75 um) -> white/gold (2.2 um) -> warm amber-crimson (5.0 um)
  const t = Math.max(0, Math.min(1, (wavelengthUm - 0.75) / 4.25));
  const rWeight = 0.72 + 0.38 * t;
  const gWeight = 0.85 - 0.18 * Math.abs(t - 0.45);
  const bWeight = 1.12 - 0.68 * t;

  for (let i = 0; i < buffer.length; i++) {
    const idx = i * 4;
    if (isDifference) {
      // Signed difference: positive = warm orange/white, negative = deep cyan/blue
      const v = buffer[i] * diffIntensity * contrast;
      const absStretch = Math.asinh(Math.abs(v) * 4.5) / Math.asinh(4.5);
      const clamped = Math.max(0, Math.min(1, absStretch + brightness * 0.25));
      if (v >= 0) {
        out[idx] = Math.round(Math.min(255, 18 + clamped * 237));
        out[idx + 1] = Math.round(Math.min(255, 22 + clamped * 145));
        out[idx + 2] = Math.round(Math.min(255, 28 + clamped * 45));
      } else {
        out[idx] = Math.round(Math.min(255, 18 + clamped * 45));
        out[idx + 1] = Math.round(Math.min(255, 22 + clamped * 175));
        out[idx + 2] = Math.round(Math.min(255, 28 + clamped * 227));
      }
      out[idx + 3] = 255;
      continue;
    }

    // Astronomical asinh stretch preserves faint stars without blowing out bright cores
    const raw = Math.max(0, buffer[i] * contrast + brightness * 0.18);
    const stretched = Math.asinh(raw * 5.2) / Math.asinh(5.2);
    const lum = Math.max(0, Math.min(1, stretched));

    out[idx] = Math.round(Math.min(255, lum * 255 * rWeight));
    out[idx + 1] = Math.round(Math.min(255, lum * 255 * gWeight));
    out[idx + 2] = Math.round(Math.min(255, lum * 255 * bWeight));
    out[idx + 3] = 255;
  }

  return out;
}

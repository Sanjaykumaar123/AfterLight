export interface SpherexDetectorArray {
  arrayId: 1 | 2 | 3 | 4 | 5 | 6;
  name: string;
  minUm: number;
  maxUm: number;
  resolvingPower: number;
  bandStart: number;
  bandEnd: number;
  primaryScienceFocus: string;
}

export interface SpherexBand {
  bandNumber: number; // 1..102
  arrayId: 1 | 2 | 3 | 4 | 5 | 6;
  wavelengthUm: number;
  bandwidthUm: number;
  resolvingPower: number;
  tracerNote: string;
}

export const SPHEREX_ARRAYS: SpherexDetectorArray[] = [
  {
    arrayId: 1,
    name: 'Band 1 · Short-Wave NIR',
    minUm: 0.75,
    maxUm: 1.11,
    resolvingPower: 41,
    bandStart: 1,
    bandEnd: 17,
    primaryScienceFocus: 'Stellar photospheres, galaxy redshifts & M/L-dwarf continua',
  },
  {
    arrayId: 2,
    name: 'Band 2 · J / H Window',
    minUm: 1.11,
    maxUm: 1.64,
    resolvingPower: 41,
    bandStart: 18,
    bandEnd: 34,
    primaryScienceFocus: 'Methane (CH4) & H2O steam bands in brown dwarfs and Y/T objects',
  },
  {
    arrayId: 3,
    name: 'Band 3 · K-Band Thermal',
    minUm: 1.64,
    maxUm: 2.42,
    resolvingPower: 41,
    bandStart: 35,
    bandEnd: 51,
    primaryScienceFocus: 'Circumstellar dust excess, H2O vapor & evolved giant continua',
  },
  {
    arrayId: 4,
    name: 'Band 4 · Ice & PAH Bridge',
    minUm: 2.42,
    maxUm: 3.82,
    resolvingPower: 35,
    bandStart: 52,
    bandEnd: 68,
    primaryScienceFocus: 'H2O ice (3.05 µm), PAH emission (3.3 µm) & deep CH4 features',
  },
  {
    arrayId: 5,
    name: 'Band 5 · CO2 Ice Channel',
    minUm: 3.82,
    maxUm: 4.42,
    resolvingPower: 110,
    bandStart: 69,
    bandEnd: 85,
    primaryScienceFocus: 'CO2 ice absorption (4.27 µm) & cold substellar thermal emission',
  },
  {
    arrayId: 6,
    name: 'Band 6 · Long-Wave Thermal',
    minUm: 4.42,
    maxUm: 5.00,
    resolvingPower: 130,
    bandStart: 86,
    bandEnd: 102,
    primaryScienceFocus: 'CO ice (4.67 µm), 4.8 µm Y-dwarf peak & cold Planet X searches',
  },
];

function tracerForWavelength(um: number): string {
  if (um < 1.05) return 'Optical-NIR stellar continuum';
  if (um >= 1.35 && um <= 1.50) return 'H2O vapor absorption band';
  if (um >= 1.60 && um <= 1.75) return 'CH4 H-band continuum feature';
  if (um >= 2.10 && um <= 2.35) return 'CO overtone & K-band flux';
  if (um >= 2.95 && um <= 3.18) return 'H2O ice absorption (3.05 µm)';
  if (um >= 3.25 && um <= 3.45) return 'PAH (3.3 µm) / CH4 fundamental';
  if (um >= 4.18 && um <= 4.35) return 'CO2 ice absorption (4.27 µm)';
  if (um >= 4.55 && um <= 4.78) return 'CO ice (4.67 µm) & Y-dwarf 4.8 µm window';
  return 'Broadband infrared continuum';
}

/**
 * Generate the complete 102-channel SPHEREx Linear Variable Filter (LVF) bandpass table.
 */
export function buildSpherexBands(): SpherexBand[] {
  const bands: SpherexBand[] = [];
  for (const arr of SPHEREX_ARRAYS) {
    const count = arr.bandEnd - arr.bandStart + 1;
    const step = (arr.maxUm - arr.minUm) / count;
    for (let i = 0; i < count; i++) {
      const bandNumber = arr.bandStart + i;
      const wavelengthUm = Number((arr.minUm + (i + 0.5) * step).toFixed(3));
      const bandwidthUm = Number((wavelengthUm / arr.resolvingPower).toFixed(4));
      bands.push({
        bandNumber,
        arrayId: arr.arrayId,
        wavelengthUm,
        bandwidthUm,
        resolvingPower: arr.resolvingPower,
        tracerNote: tracerForWavelength(wavelengthUm),
      });
    }
  }
  return bands;
}

export const SPHEREX_BANDS: SpherexBand[] = buildSpherexBands();

export function getSpherexBand(bandNumber: number): SpherexBand {
  const clamped = Math.max(1, Math.min(102, Math.round(bandNumber)));
  return SPHEREX_BANDS[clamped - 1];
}

export type SpectralProfileKind =
  | 'm-dwarf'
  | 't-dwarf'
  | 'y-dwarf'
  | 't-tauri-dust'
  | 'mira-giant'
  | 'field-star';

export interface SpectrumPoint {
  bandNumber: number;
  wavelengthUm: number;
  fluxMjy: number;
  uncertaintyMjy: number;
  arrayId: number;
}

/**
 * Compute a physically grounded, deterministic demonstration spectral energy distribution
 * across all 102 SPHEREx bands based on blackbody temperature and molecular opacity features.
 * Clearly labeled as a Demonstration / Reference SED model in the UI.
 */
export function computeReferenceSpectrum(
  kind: SpectralProfileKind,
  scaleFluxMjy = 12
): SpectrumPoint[] {
  const tempK =
    kind === 'y-dwarf'
      ? 260
      : kind === 't-dwarf'
      ? 950
      : kind === 'm-dwarf'
      ? 3150
      : kind === 'mira-giant'
      ? 2750
      : kind === 't-tauri-dust'
      ? 4200
      : 4800;

  // Planck-like relative shape in f_nu (mJy) normalized at reference wavelength
  const planckNu = (um: number, t: number) => {
    const hcOverK = 14387.77; // um * K
    const x = hcOverK / (um * t);
    const clampedX = Math.min(80, Math.max(0.02, x));
    return 1 / (Math.pow(um, 3) * (Math.exp(clampedX) - 1));
  };

  const refUm = kind === 'y-dwarf' ? 4.6 : 1.6;
  const refVal = planckNu(refUm, tempK);

  return SPHEREX_BANDS.map((band) => {
    const um = band.wavelengthUm;
    let rel = planckNu(um, tempK) / refVal;

    // Add realistic molecular absorption / dust excess features
    if (kind === 'y-dwarf') {
      // Strong CH4 (1.6, 2.2, 3.3 um) and H2O absorption, sharp thermal peak at 4.5-5.0 um
      const ch4 = 1 - 0.78 * Math.exp(-Math.pow((um - 3.32) / 0.25, 2));
      const h2o = 1 - 0.65 * Math.exp(-Math.pow((um - 2.75) / 0.3, 2));
      const co = 1 - 0.35 * Math.exp(-Math.pow((um - 4.65) / 0.12, 2));
      rel *= ch4 * h2o * co;
    } else if (kind === 't-dwarf') {
      const ch4H = 1 - 0.55 * Math.exp(-Math.pow((um - 1.67) / 0.14, 2));
      const ch4K = 1 - 0.65 * Math.exp(-Math.pow((um - 2.25) / 0.18, 2));
      const ch4L = 1 - 0.6 * Math.exp(-Math.pow((um - 3.32) / 0.22, 2));
      rel *= ch4H * ch4K * ch4L;
    } else if (kind === 't-tauri-dust') {
      // Warm circumstellar disk excess growing longward of 2.0 um
      const diskExcess = 0.55 * (planckNu(um, 900) / planckNu(2.2, 900));
      rel += diskExcess;
    } else if (kind === 'mira-giant') {
      // H2O steam absorption at 1.9 and 2.7 um + CO bandhead at 4.6 um
      const h2o19 = 1 - 0.28 * Math.exp(-Math.pow((um - 1.9) / 0.15, 2));
      const h2o27 = 1 - 0.32 * Math.exp(-Math.pow((um - 2.7) / 0.2, 2));
      rel *= h2o19 * h2o27;
    } else if (kind === 'm-dwarf') {
      const h2o = 1 - 0.14 * Math.exp(-Math.pow((um - 1.42) / 0.12, 2));
      rel *= h2o;
    }

    const fluxMjy = Number(Math.max(0.002, rel * scaleFluxMjy).toFixed(4));
    const uncertaintyMjy = Number((fluxMjy * 0.035 + 0.015).toFixed(4));

    return {
      bandNumber: band.bandNumber,
      wavelengthUm: um,
      fluxMjy,
      uncertaintyMjy,
      arrayId: band.arrayId,
    };
  });
}

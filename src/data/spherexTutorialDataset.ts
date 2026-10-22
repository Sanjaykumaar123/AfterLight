/**
 * Dataset extracted from Caltech/IPAC IRSA Tutorial:
 * "Download a collection of SPHEREx Spectral Image cutouts as a multi-extension FITS file"
 * Source URL: https://caltech-ipac.github.io/irsa-tutorials/spherex-cutouts/
 */

export type SpherexRelease = 'DR1' | 'QR3';

export interface SpherexCutoutRecord {
  index: number;
  release: SpherexRelease;
  obsWeek: string;
  exposureId: string;
  detector: 'SPHEREx-D2';
  pipelineVersion: string;
  uri: string;
}

export interface SpherexTutorialTarget {
  id: 'm101-spherex-tutorial';
  name: string;
  commonName: string;
  raDeg: number;
  decDeg: number;
  raString: string;
  decString: string;
  cutoutSizeDeg: number;
  fovArcmin: number;
  bandpass: 'SPHEREx-D2';
  defaultBandNumber: number;
  totalMatchedInTutorialQuery: number;
  sourceUrl: string;
  previewPlateUrl: string;
  previewPlateWavelengthsUm: number[];
  notes: string;
}

export const SPHEREX_TUTORIAL_TARGET: SpherexTutorialTarget = {
  id: 'm101-spherex-tutorial',
  name: 'M101 (Pinwheel Galaxy) — SPHEREx DR1/QR3',
  commonName: 'Pinwheel Galaxy (M101)',
  raDeg: 210.80227,
  decDeg: 54.34895,
  raString: '14h 03m 12.54s',
  decString: '+54° 20\' 56.2"',
  cutoutSizeDeg: 0.1,
  fovArcmin: 6,
  bandpass: 'SPHEREx-D2',
  defaultBandNumber: 26, // ~1.35 um in Detector Array 2 (1.11 - 1.63 um)
  totalMatchedInTutorialQuery: 84,
  sourceUrl: 'https://caltech-ipac.github.io/irsa-tutorials/spherex-cutouts/',
  previewPlateUrl: '/src/assets/images/spherex_m101_cutouts_tutorial.png',
  previewPlateWavelengthsUm: [
    1.506, 1.543, 1.58, 1.618, 1.656, 1.087, 1.113, 1.139, 1.166, 1.194,
  ],
  notes:
    'Official Caltech/IPAC IRSA SPHEREx Cutouts tutorial dataset covering the Pinwheel Galaxy (M101) across DR1 and QR3 Level-2 Spectral Image Multi-Extension FITS (MEF) exposures.',
};

const BASE_CUTOUT_PATHS: Array<{
  release: SpherexRelease;
  obsWeek: string;
  pipelineVersion: string;
  exposureId: string;
  relativePath: string;
}> = [
  {
    release: 'DR1',
    obsWeek: '2025W20_2D',
    pipelineVersion: 'l2b-v27-2026-198',
    exposureId: '0176_4D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W20_2D/l2b-v27-2026-198/2/level2_2025W20_2D_0176_4D2_spx_l2b-v27-2026-198.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W21_2C',
    pipelineVersion: 'l2b-v27-2026-199',
    exposureId: '0401_1D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W21_2C/l2b-v27-2026-199/2/level2_2025W21_2C_0401_1D2_spx_l2b-v27-2026-199.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W21_2C',
    pipelineVersion: 'l2b-v27-2026-199',
    exposureId: '0401_3D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W21_2C/l2b-v27-2026-199/2/level2_2025W21_2C_0401_3D2_spx_l2b-v27-2026-199.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W21_2C',
    pipelineVersion: 'l2b_retry-v27-2026-199',
    exposureId: '0401_4D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W21_2C/l2b_retry-v27-2026-199/2/level2_2025W21_2C_0401_4D2_spx_l2b_retry-v27-2026-199.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W22_1B',
    pipelineVersion: 'l2b-v27-2026-199',
    exposureId: '0584_1D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W22_1B/l2b-v27-2026-199/2/level2_2025W22_1B_0584_1D2_spx_l2b-v27-2026-199.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W49_2A',
    pipelineVersion: 'l2b-v27-2026-209',
    exposureId: '0426_2D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W49_2A/l2b-v27-2026-209/2/level2_2025W49_2A_0426_2D2_spx_l2b-v27-2026-209.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W49_2A',
    pipelineVersion: 'l2b-v27-2026-209',
    exposureId: '0650_1D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W49_2A/l2b-v27-2026-209/2/level2_2025W49_2A_0650_1D2_spx_l2b-v27-2026-209.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W49_2A',
    pipelineVersion: 'l2b-v27-2026-209',
    exposureId: '0650_3D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W49_2A/l2b-v27-2026-209/2/level2_2025W49_2A_0650_3D2_spx_l2b-v27-2026-209.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W49_2A',
    pipelineVersion: 'l2b-v27-2026-209',
    exposureId: '0707_1D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W49_2A/l2b-v27-2026-209/2/level2_2025W49_2A_0707_1D2_spx_l2b-v27-2026-209.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W50_1A',
    pipelineVersion: 'l2b-v27-2026-209',
    exposureId: '0223_1D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W50_1A/l2b-v27-2026-209/2/level2_2025W50_1A_0223_1D2_spx_l2b-v27-2026-209.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W50_2A',
    pipelineVersion: 'l2b-v27-2026-210',
    exposureId: '0072_2D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W50_2A/l2b-v27-2026-210/2/level2_2025W50_2A_0072_2D2_spx_l2b-v27-2026-210.fits',
  },
  {
    release: 'DR1',
    obsWeek: '2025W50_2A',
    pipelineVersion: 'l2b-v27-2026-210',
    exposureId: '0072_4D2',
    relativePath:
      'ibe/data/spherex/dr1/level2/2025W50_2A/l2b-v27-2026-210/2/level2_2025W50_2A_0072_4D2_spx_l2b-v27-2026-210.fits',
  },
  {
    release: 'QR3',
    obsWeek: '2026W20_2A',
    pipelineVersion: 'l2b-v27-2026-267',
    exposureId: '0464_4D2',
    relativePath:
      'ibe/data/spherex/qr3/level2/2026W20_2A/l2b-v27-2026-267/2/level2_2026W20_2A_0464_4D2_spx_l2b-v27-2026-267.fits',
  },
  {
    release: 'QR3',
    obsWeek: '2026W21_2A',
    pipelineVersion: 'l2b-v27-2026-268',
    exposureId: '0213_1D2',
    relativePath:
      'ibe/data/spherex/qr3/level2/2026W21_2A/l2b-v27-2026-268/2/level2_2026W21_2A_0213_1D2_spx_l2b-v27-2026-268.fits',
  },
  {
    release: 'QR3',
    obsWeek: '2026W25_2A',
    pipelineVersion: 'l2b-v27-2026-273',
    exposureId: '0279_1D2',
    relativePath:
      'ibe/data/spherex/qr3/level2/2026W25_2A/l2b-v27-2026-273/2/level2_2026W25_2A_0279_1D2_spx_l2b-v27-2026-273.fits',
  },
  {
    release: 'QR3',
    obsWeek: '2026W26_1A',
    pipelineVersion: 'l2b-v27-2026-273',
    exposureId: '0178_1D2',
    relativePath:
      'ibe/data/spherex/qr3/level2/2026W26_1A/l2b-v27-2026-273/2/level2_2026W26_1A_0178_1D2_spx_l2b-v27-2026-273.fits',
  },
  {
    release: 'QR3',
    obsWeek: '2026W26_1A',
    pipelineVersion: 'l2b_retry-v27-2026-274',
    exposureId: '0500_1D2',
    relativePath:
      'ibe/data/spherex/qr3/level2/2026W26_1A/l2b_retry-v27-2026-274/2/level2_2026W26_1A_0500_1D2_spx_l2b_retry-v27-2026-274.fits',
  },
];

export const SPHEREX_TUTORIAL_CUTOUTS: SpherexCutoutRecord[] = BASE_CUTOUT_PATHS.map(
  (entry, idx) => ({
    index: idx + 1,
    release: entry.release,
    obsWeek: entry.obsWeek,
    exposureId: entry.exposureId,
    detector: 'SPHEREx-D2',
    pipelineVersion: entry.pipelineVersion,
    uri: `https://irsa.ipac.caltech.edu/${entry.relativePath}?center=${SPHEREX_TUTORIAL_TARGET.raDeg},${SPHEREX_TUTORIAL_TARGET.decDeg}d&size=${SPHEREX_TUTORIAL_TARGET.cutoutSizeDeg}`,
  })
);

export type SpherexBandpassName =
  | 'SPHEREx-D1'
  | 'SPHEREx-D2'
  | 'SPHEREx-D3'
  | 'SPHEREx-D4'
  | 'SPHEREx-D5'
  | 'SPHEREx-D6';

export function buildSpherexTapAdql(params: {
  raDeg: number;
  decDeg: number;
  sizeDeg?: number;
  bandpass?: SpherexBandpassName;
}): string {
  const ra = Number(params.raDeg).toFixed(5);
  const dec = Number(params.decDeg).toFixed(5);
  const size = Number(params.sizeDeg ?? 0.1).toString();
  const bandpass = params.bandpass ?? 'SPHEREx-D2';

  return `SELECT
  'https://irsa.ipac.caltech.edu/' || a.uri || '?center=${ra},${dec}d&size=${size}' AS uri,
  p.time_bounds_lower
FROM spherex.artifact a
JOIN spherex.plane p ON a.planeid = p.planeid
WHERE 1 = CONTAINS(POINT('ICRS', ${ra}, ${dec}), p.poly)
  AND p.energy_bandpassname = '${bandpass}'
ORDER BY p.time_bounds_lower`;
}

export function filterTutorialCutouts(
  records: SpherexCutoutRecord[],
  releaseFilter: 'ALL' | SpherexRelease,
  searchTerm = ''
): SpherexCutoutRecord[] {
  const q = searchTerm.trim().toLowerCase();
  return records.filter((rec) => {
    if (releaseFilter !== 'ALL' && rec.release !== releaseFilter) return false;
    if (!q) return true;
    return (
      rec.obsWeek.toLowerCase().includes(q) ||
      rec.exposureId.toLowerCase().includes(q) ||
      rec.pipelineVersion.toLowerCase().includes(q) ||
      rec.release.toLowerCase().includes(q)
    );
  });
}

export function isNearTutorialM101(raDeg: number, decDeg: number, toleranceDeg = 0.5): boolean {
  const dRa = Math.abs(raDeg - SPHEREX_TUTORIAL_TARGET.raDeg);
  const dDec = Math.abs(decDeg - SPHEREX_TUTORIAL_TARGET.decDeg);
  return dRa <= toleranceDeg && dDec <= toleranceDeg;
}

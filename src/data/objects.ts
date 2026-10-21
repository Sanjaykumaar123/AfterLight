import { SpectralProfileKind } from '../lib/spherex';

export interface ObservationEpoch {
  id: string;
  dateIso: string;
  yearDecimal: number;
  instrument: string;
  wavelengthLabel: string;
  bandNumber: number;
  fluxMultiplier: number;
  dataProvenance: 'Archival Survey Reference' | 'Simulated SPHEREx Epoch';
  notes: string;
}

export interface CelestialTarget {
  id: string;
  name: string;
  catalogDesignation: string;
  category:
    | 'Red Dwarf'
    | 'Brown Dwarf Binary'
    | 'Y-Type Brown Dwarf'
    | 'T Tauri Variable'
    | 'Mira Variable'
    | 'Reference Field';
  constellation: string;
  raString: string;
  decString: string;
  raDeg: number;
  decDeg: number;
  distanceLy: string;
  spectralType: string;
  spectralProfile: SpectralProfileKind;
  pmRaCosDecMasYr: number;
  pmDecMasYr: number;
  totalProperMotionArcsecYr: number;
  referenceEpochYear: number;
  scaleFluxMjy: number;
  defaultFovArcmin: number;
  shortDescription: string;
  scientificSummary: string;
  caption: string;
  imageUrl: string;
  imageAttribution: string;
  instrumentInfo: string;
  dataSource: string;
  availableWavelengths: string;
  epochs: ObservationEpoch[];
  relatedIds: string[];
}

export const HERO_FEATURED_IMAGE = {
  url: '/src/assets/images/hero_spherex_sky_1794646429324.jpg',
  title: 'All-Sky Infrared Survey Visualization',
  caption:
    'Illustrative all-sky infrared Mollweide projection depicting thermal dust emission and dense stellar fields along the Galactic plane, representative of the full-sky spectral mapping performed by NASA’s SPHEREx mission.',
  label: 'Illustrative Survey Visualization · Not a live mission cutout',
};

export const CURATED_TARGETS: CelestialTarget[] = [
  {
    id: 'barnards-star',
    name: "Barnard's Star",
    catalogDesignation: 'V2500 Ophiuchi · Gaia DR3 4472832130942575872',
    category: 'Red Dwarf',
    constellation: 'Ophiuchus',
    raString: '17h 57m 48.50s',
    decString: '+04° 41\' 36.1"',
    raDeg: 269.452077,
    decDeg: 4.693365,
    distanceLy: '5.96 ly',
    spectralType: 'M4.0V',
    spectralProfile: 'm-dwarf',
    pmRaCosDecMasYr: -801.55,
    pmDecMasYr: 10362.39,
    totalProperMotionArcsecYr: 10.358,
    referenceEpochYear: 2016.0,
    scaleFluxMjy: 4200,
    defaultFovArcmin: 8,
    shortDescription:
      'The fastest-moving star across Earth’s sky, shifting 10.36 arcseconds northward every year against background stars.',
    scientificSummary:
      "Discovered to possess extreme proper motion by E. E. Barnard in 1916, Barnard's Star is the second-closest known stellar system to the Sun. Over multi-year infrared baselines spanning AllWISE, NEOWISE, and SPHEREx, its rapid northward trajectory produces an unambiguous positional shift exceeding 1.5 arcminutes over a decade, serving as an ideal astrometric benchmark for moving-object detection algorithms.",
    caption:
      "Illustrative near-infrared field centered on Barnard's Star (M4V) in Ophiuchus. Use the Observation Explorer to inspect multi-epoch proper motion across calibrated sky coordinates.",
    imageUrl: '/src/assets/images/obj_barnards_star_1794646430991.jpg',
    imageAttribution: 'Illustrative Reference Plate · Demonstration Visualization',
    instrumentInfo: 'SPHEREx 102-Band LVF Spectrophotometer (0.75–5.00 µm) / AllWISE W1–W2 Reference',
    dataSource: 'NASA/IPAC IRSA · Gaia DR3 · AllWISE / NEOWISE',
    availableWavelengths: '0.75 – 5.00 µm (Bands 1–102 simulated; WISE 3.4 & 4.6 µm archival)',
    epochs: [
      {
        id: 'barnard-2010',
        dateIso: '2010-03-18',
        yearDecimal: 2010.21,
        instrument: 'WISE Cryogenic Survey',
        wavelengthLabel: '3.4 µm (W1)',
        bandNumber: 62,
        fluxMultiplier: 1.0,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Initial cryogenic WISE epoch baseline.',
      },
      {
        id: 'barnard-2015',
        dateIso: '2015-09-14',
        yearDecimal: 2015.7,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '3.4 µm (W1)',
        bandNumber: 62,
        fluxMultiplier: 1.02,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Mid-baseline reactivation pass (+56.9" northward shift).',
      },
      {
        id: 'barnard-2020',
        dateIso: '2020-09-12',
        yearDecimal: 2020.7,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '4.6 µm (W2)',
        bandNumber: 90,
        fluxMultiplier: 0.98,
        dataProvenance: 'Archival Survey Reference',
        notes: '10-year baseline epoch (+108.7" total displacement).',
      },
      {
        id: 'barnard-2025',
        dateIso: '2025-09-15',
        yearDecimal: 2025.71,
        instrument: 'SPHEREx All-Sky Survey (Simulated)',
        wavelengthLabel: '1.65 µm (Array 3)',
        bandNumber: 35,
        fluxMultiplier: 1.04,
        dataProvenance: 'Simulated SPHEREx Epoch',
        notes: 'Modelled SPHEREx epoch showing 15.5-year accumulated proper motion.',
      },
    ],
    relatedIds: ['wise-0855', 'epsilon-indi-b'],
  },
  {
    id: 'epsilon-indi-b',
    name: 'Epsilon Indi B',
    catalogDesignation: 'eps Ind Ba / Bb · WISEP J220410.52-564657.7',
    category: 'Brown Dwarf Binary',
    constellation: 'Indus',
    raString: '22h 04m 10.52s',
    decString: '-56° 46\' 57.7"',
    raDeg: 331.043833,
    decDeg: -56.782694,
    distanceLy: '11.87 ly',
    spectralType: 'T1V + T6V Binary',
    spectralProfile: 't-dwarf',
    pmRaCosDecMasYr: 3966.66,
    pmDecMasYr: -2536.19,
    totalProperMotionArcsecYr: 4.708,
    referenceEpochYear: 2016.0,
    scaleFluxMjy: 85,
    defaultFovArcmin: 8,
    shortDescription:
      'A resolved binary pair of cool T-type brown dwarfs orbiting the K-dwarf Epsilon Indi at 4.71 arcseconds per year.',
    scientificSummary:
      'Epsilon Indi Ba and Bb form one of the closest known brown dwarf binaries to our solar system. With effective temperatures around 1,300 K and 880 K respectively, their combined near-infrared spectrum exhibits deep methane (CH4) and water vapor absorption troughs across SPHEREx Arrays 2 through 4, while their high proper motion carries them rapidly southeast across the Indus starfield.',
    caption:
      'Illustrative infrared observation field of the Epsilon Indi Ba/Bb brown dwarf pair. Notice the warm crimson-amber spectral signature characteristic of cool methane-bearing atmospheres.',
    imageUrl: '/src/assets/images/obj_epsilon_indi_1794646431913.jpg',
    imageAttribution: 'Illustrative Reference Plate · Demonstration Visualization',
    instrumentInfo: 'SPHEREx 102-Band LVF Spectrophotometer / 2MASS & AllWISE Reference',
    dataSource: 'NASA/IPAC IRSA · 2MASS · AllWISE · Gaia DR3',
    availableWavelengths: '0.75 – 5.00 µm (Methane & H2O spectral bands)',
    epochs: [
      {
        id: 'eps-2010',
        dateIso: '2010-05-04',
        yearDecimal: 2010.34,
        instrument: 'WISE Cryogenic Survey',
        wavelengthLabel: '3.4 µm (W1)',
        bandNumber: 62,
        fluxMultiplier: 1.0,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Early AllWISE epoch reference.',
      },
      {
        id: 'eps-2016',
        dateIso: '2016-05-09',
        yearDecimal: 2016.35,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '4.6 µm (W2)',
        bandNumber: 90,
        fluxMultiplier: 0.99,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Six-year epoch showing 28.3" southeast displacement.',
      },
      {
        id: 'eps-2021',
        dateIso: '2021-05-12',
        yearDecimal: 2021.36,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '4.6 µm (W2)',
        bandNumber: 90,
        fluxMultiplier: 1.01,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Eleven-year epoch showing 51.8" cumulative displacement.',
      },
      {
        id: 'eps-2025',
        dateIso: '2025-05-15',
        yearDecimal: 2025.37,
        instrument: 'SPHEREx All-Sky Survey (Simulated)',
        wavelengthLabel: '2.15 µm (Array 3)',
        bandNumber: 45,
        fluxMultiplier: 1.0,
        dataProvenance: 'Simulated SPHEREx Epoch',
        notes: 'Modelled SPHEREx near-infrared epoch.',
      },
    ],
    relatedIds: ['wise-0855', 'barnards-star'],
  },
  {
    id: 'wise-0855',
    name: 'WISE 0855',
    catalogDesignation: 'WISE J085510.83-071442.5',
    category: 'Y-Type Brown Dwarf',
    constellation: 'Hydra',
    raString: '08h 55m 10.831s',
    decString: '-07° 14\' 42.53"',
    raDeg: 133.795129,
    decDeg: -7.245147,
    distanceLy: '7.42 ly',
    spectralType: 'Y2 / Y4 (250 K)',
    spectralProfile: 'y-dwarf',
    pmRaCosDecMasYr: -8118.0,
    pmDecMasYr: 680.0,
    totalProperMotionArcsecYr: 8.146,
    referenceEpochYear: 2014.0,
    scaleFluxMjy: 3.4,
    defaultFovArcmin: 8,
    shortDescription:
      'The coldest known brown dwarf (~250 K), virtually invisible in optical light and glowing primarily around 4.5–5.0 µm.',
    scientificSummary:
      'Discovered in 2014 using multi-epoch WISE mid-infrared data, WISE 0855 is an extreme Y-type substellar object with an effective temperature comparable to a brisk polar winter on Earth (~250 K). Because its spectral energy distribution peaks steeply in SPHEREx Array 6 (4.42–5.00 µm) while dropping sharply below 2.5 µm, it represents a premier Planet X-analog benchmark for faint, cold, fast-moving infrared discoveries.',
    caption:
      'Illustrative mid-infrared field centered on WISE J085510.83-071442.5 in Hydra. In short-wave near-infrared bands (< 2.0 µm) the object fades into the background noise, emerging clearly in Array 6 (4.4–5.0 µm).',
    imageUrl: '/src/assets/images/obj_wise_0855_1794646432599.jpg',
    imageAttribution: 'Illustrative Reference Plate · Demonstration Visualization',
    instrumentInfo: 'SPHEREx Array 5–6 (3.82–5.00 µm) / AllWISE & NEOWISE W2 (4.6 µm)',
    dataSource: 'NASA/IPAC IRSA · AllWISE · NEOWISE · Spitzer',
    availableWavelengths: '3.40 – 5.00 µm (Peak thermal emission in Array 6)',
    epochs: [
      {
        id: 'wise0855-2010',
        dateIso: '2010-05-04',
        yearDecimal: 2010.34,
        instrument: 'WISE Cryogenic Survey',
        wavelengthLabel: '4.6 µm (W2)',
        bandNumber: 92,
        fluxMultiplier: 1.0,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Discovery-era WISE W2 detection.',
      },
      {
        id: 'wise0855-2014',
        dateIso: '2014-05-03',
        yearDecimal: 2014.34,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '4.6 µm (W2)',
        bandNumber: 92,
        fluxMultiplier: 0.99,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Reference epoch (08h55m10.831s, -07d14m42.53s); 32.6" westward shift since 2010.',
      },
      {
        id: 'wise0855-2019',
        dateIso: '2019-11-18',
        yearDecimal: 2019.88,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '4.6 µm (W2)',
        bandNumber: 92,
        fluxMultiplier: 1.02,
        dataProvenance: 'Archival Survey Reference',
        notes: 'High-S/N stacked pass confirming 8.15"/yr westward motion.',
      },
      {
        id: 'wise0855-2025',
        dateIso: '2025-11-12',
        yearDecimal: 2025.86,
        instrument: 'SPHEREx All-Sky Survey (Simulated)',
        wavelengthLabel: '4.78 µm (Array 6)',
        bandNumber: 96,
        fluxMultiplier: 1.01,
        dataProvenance: 'Simulated SPHEREx Epoch',
        notes: 'Modelled SPHEREx Array 6 detection at 4.78 µm.',
      },
    ],
    relatedIds: ['epsilon-indi-b', 'barnards-star'],
  },
  {
    id: 'rw-aurigae',
    name: 'RW Aurigae',
    catalogDesignation: 'RW Aur A/B · HD 240764',
    category: 'T Tauri Variable',
    constellation: 'Auriga',
    raString: '05h 07m 49.54s',
    decString: '+30° 24\' 05.1"',
    raDeg: 76.956417,
    decDeg: 30.401417,
    distanceLy: '530 ly',
    spectralType: 'K1V + K5V T Tauri',
    spectralProfile: 't-tauri-dust',
    pmRaCosDecMasYr: 4.82,
    pmDecMasYr: -24.15,
    totalProperMotionArcsecYr: 0.025,
    referenceEpochYear: 2016.0,
    scaleFluxMjy: 1650,
    defaultFovArcmin: 10,
    shortDescription:
      'A young binary T Tauri star undergoing dramatic multi-year dimming events caused by dusty circumstellar disk clouds.',
    scientificSummary:
      'Located in the Taurus-Auriga star-forming complex, RW Aurigae is a ~10-million-year-old binary system encircled by tidally disrupted dusty gas streams. Its infrared brightness exhibits striking non-periodic drops and hot-dust excesses between 2 and 5 µm when dense dust clumps cross the line of sight—making it an ideal photometric variability benchmark alongside astrometric motion targets.',
    caption:
      'Illustrative near-infrared visualization of the RW Aurigae circumstellar dust environment. Compare epochs to observe strong flux variations rather than large angular displacement.',
    imageUrl: '/src/assets/images/obj_rw_aurigae_1794646431885.jpg',
    imageAttribution: 'Illustrative Reference Plate · Demonstration Visualization',
    instrumentInfo: 'SPHEREx Arrays 1–6 (0.75–5.00 µm) / 2MASS & NEOWISE Photometry',
    dataSource: 'NASA/IPAC IRSA · AAVSO · NEOWISE · Gaia DR3',
    availableWavelengths: '0.75 – 5.00 µm (Strong warm-dust IR excess > 2.0 µm)',
    epochs: [
      {
        id: 'rwaur-2010',
        dateIso: '2010-09-11',
        yearDecimal: 2010.69,
        instrument: 'WISE Cryogenic Survey',
        wavelengthLabel: '3.4 µm (W1)',
        bandNumber: 62,
        fluxMultiplier: 1.15,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Pre-dimming bright disk state.',
      },
      {
        id: 'rwaur-2015',
        dateIso: '2015-03-04',
        yearDecimal: 2015.17,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '3.4 µm (W1)',
        bandNumber: 62,
        fluxMultiplier: 0.42,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Deep occultation dimming episode caused by inner disk dust.',
      },
      {
        id: 'rwaur-2018',
        dateIso: '2018-09-14',
        yearDecimal: 2018.7,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '4.6 µm (W2)',
        bandNumber: 90,
        fluxMultiplier: 0.68,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Partial recovery with persistent warm infrared dust excess.',
      },
      {
        id: 'rwaur-2025',
        dateIso: '2025-09-10',
        yearDecimal: 2025.69,
        instrument: 'SPHEREx All-Sky Survey (Simulated)',
        wavelengthLabel: '2.20 µm (Array 3)',
        bandNumber: 46,
        fluxMultiplier: 1.08,
        dataProvenance: 'Simulated SPHEREx Epoch',
        notes: 'Modelled SPHEREx full-SED monitoring epoch.',
      },
    ],
    relatedIds: ['r-draconis', 'barnards-star'],
  },
  {
    id: 'r-draconis',
    name: 'R Draconis',
    catalogDesignation: 'R Dra · HD 149880',
    category: 'Mira Variable',
    constellation: 'Draco',
    raString: '16h 32m 40.23s',
    decString: '+66° 45\' 17.6"',
    raDeg: 248.167625,
    decDeg: 66.754889,
    distanceLy: '1,960 ly',
    spectralType: 'M5e – M9e III',
    spectralProfile: 'mira-giant',
    pmRaCosDecMasYr: -5.4,
    pmDecMasYr: -12.8,
    totalProperMotionArcsecYr: 0.014,
    referenceEpochYear: 2016.0,
    scaleFluxMjy: 8400,
    defaultFovArcmin: 10,
    shortDescription:
      'A pulsating Mira-type asymptotic giant branch star cycling through dramatic brightness shifts every 245.5 days.',
    scientificSummary:
      'R Draconis is a classic late-type oxygen-rich Mira variable whose outer envelope expands and cools over a 245.5-day pulsation period. While its sky position remains effectively fixed relative to background stars, its near-infrared luminosity and H2O/CO molecular absorption depths vary markedly across pulsation phases, demonstrating how time-series difference imaging isolates photometric variables from moving objects.',
    caption:
      'Illustrative near-infrared visualization of the pulsating red giant R Draconis. Image subtraction between pulsation maximum and minimum reveals clean concentric flux residuals with zero positional offset.',
    imageUrl: '/src/assets/images/obj_r_draconis_1794646432247.jpg',
    imageAttribution: 'Illustrative Reference Plate · Demonstration Visualization',
    instrumentInfo: 'SPHEREx Arrays 1–6 (0.75–5.00 µm) / AllWISE & NEOWISE Time-Series',
    dataSource: 'NASA/IPAC IRSA · AAVSO · Gaia DR3',
    availableWavelengths: '0.75 – 5.00 µm (H2O steam & CO bands across pulsation cycle)',
    epochs: [
      {
        id: 'rdra-2016-max',
        dateIso: '2016-06-18',
        yearDecimal: 2016.46,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '3.4 µm (W1)',
        bandNumber: 62,
        fluxMultiplier: 1.35,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Near pulsation maximum brightness.',
      },
      {
        id: 'rdra-2016-min',
        dateIso: '2016-10-24',
        yearDecimal: 2016.81,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '3.4 µm (W1)',
        bandNumber: 62,
        fluxMultiplier: 0.58,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Approaching pulsation minimum (~4 months later).',
      },
      {
        id: 'rdra-2021',
        dateIso: '2021-06-22',
        yearDecimal: 2021.47,
        instrument: 'NEOWISE Reactivation',
        wavelengthLabel: '4.6 µm (W2)',
        bandNumber: 90,
        fluxMultiplier: 1.24,
        dataProvenance: 'Archival Survey Reference',
        notes: 'Subsequent cycle bright phase.',
      },
      {
        id: 'rdra-2025',
        dateIso: '2025-07-04',
        yearDecimal: 2025.51,
        instrument: 'SPHEREx All-Sky Survey (Simulated)',
        wavelengthLabel: '1.90 µm (Array 3)',
        bandNumber: 40,
        fluxMultiplier: 0.72,
        dataProvenance: 'Simulated SPHEREx Epoch',
        notes: 'Modelled SPHEREx spectroscopic snapshot.',
      },
    ],
    relatedIds: ['rw-aurigae', 'barnards-star'],
  },
];

export const SINGLE_EPOCH_DEMO_FIELD: CelestialTarget = {
  id: 'single-epoch-benchmark',
  name: 'SA 57 North Galactic Pole (Single-Epoch Field)',
  catalogDesignation: 'Selected Area 57 · Single-Epoch Calibration Field',
  category: 'Reference Field',
  constellation: 'Coma Berenices',
  raString: '13h 08m 37.00s',
  decString: '+29° 22\' 55.0"',
  raDeg: 197.154167,
  decDeg: 29.381944,
  distanceLy: 'Extragalactic Window',
  spectralType: 'Reference Field',
  spectralProfile: 'field-star',
  pmRaCosDecMasYr: 0,
  pmDecMasYr: 0,
  totalProperMotionArcsecYr: 0,
  referenceEpochYear: 2025.0,
  scaleFluxMjy: 22,
  defaultFovArcmin: 10,
  shortDescription:
    'Low-extinction high-latitude reference field containing a single baseline observation epoch.',
  scientificSummary:
    'Used to verify single-epoch empty-comparison and Time Machine boundary states when only one observation epoch is currently archived for a sky region.',
  caption: 'Single-epoch calibration field with one archived baseline frame.',
  imageUrl: '/src/assets/images/hero_spherex_sky_1794646429324.jpg',
  imageAttribution: 'Illustrative Reference Field · Demonstration Visualization',
  instrumentInfo: 'SPHEREx Calibration Reference',
  dataSource: 'Demonstration Calibration Baseline',
  availableWavelengths: '0.75 – 5.00 µm',
  epochs: [
    {
      id: 'sa57-single',
      dateIso: '2025-04-02',
      yearDecimal: 2025.25,
      instrument: 'SPHEREx Baseline Pass (Simulated)',
      wavelengthLabel: '2.20 µm (Array 3)',
      bandNumber: 46,
      fluxMultiplier: 1.0,
      dataProvenance: 'Simulated SPHEREx Epoch',
      notes: 'Only one observation epoch is currently available for this region.',
    },
  ],
  relatedIds: ['wise-0855', 'barnards-star'],
};

export function findTargetById(id: string): CelestialTarget | undefined {
  if (id === SINGLE_EPOCH_DEMO_FIELD.id) return SINGLE_EPOCH_DEMO_FIELD;
  return CURATED_TARGETS.find((t) => t.id === id);
}

export function searchCuratedTargets(query: string): CelestialTarget[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURATED_TARGETS;
  return CURATED_TARGETS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.catalogDesignation.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.constellation.toLowerCase().includes(q) ||
      t.shortDescription.toLowerCase().includes(q)
  );
}

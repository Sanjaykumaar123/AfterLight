import test from 'node:test';
import assert from 'node:assert/strict';
import {
  angularSeparationArcsec,
  formatDecDms,
  formatRaHms,
  parseCoordinatePair,
  parseDec,
  parseRa,
  pixelToWcs,
  propagateProperMotion,
  wcsToPixel,
} from './astronomy';
import { SPHEREX_ARRAYS, SPHEREX_BANDS, computeReferenceSpectrum, getSpherexBand } from './spherex';
import { CURATED_TARGETS } from '../data/objects';
import { renderSkyBuffer } from './skyRenderer';
import { detectMovingCandidates } from './detection';

test('parses WISE 0855 exact HMS and DMS coordinate strings accurately', () => {
  const ra = parseRa('08h55m10.831s');
  const dec = parseDec('-07d14m42.53s');
  assert.ok(ra !== null);
  assert.ok(dec !== null);
  assert.ok(Math.abs(ra - 133.795129) < 1e-4);
  assert.ok(Math.abs(dec - -7.245147) < 1e-4);

  const pair = parseCoordinatePair('08h55m10.831s -07d14m42.53s');
  assert.ok(pair !== null);
  assert.equal(formatRaHms(pair.raDeg, 2).startsWith('08h 55m'), true);
  assert.equal(formatDecDms(pair.decDeg, 2).startsWith('-07° 14\''), true);
});

test('parses decimal coordinate pairs and rejects invalid values', () => {
  const pair = parseCoordinatePair('269.452077, 4.693365');
  assert.ok(pair !== null);
  assert.ok(Math.abs(pair.raDeg - 269.452077) < 1e-6);
  assert.ok(Math.abs(pair.decDeg - 4.693365) < 1e-6);

  assert.equal(parseDec('95.0'), null);
  assert.equal(parseRa('not-a-coord'), null);
});

test('computes angular separation and proper motion propagation accurately', () => {
  const barnard = CURATED_TARGETS.find((t) => t.id === 'barnards-star')!;
  const p2010 = propagateProperMotion(
    { raDeg: barnard.raDeg, decDeg: barnard.decDeg },
    barnard.pmRaCosDecMasYr,
    barnard.pmDecMasYr,
    barnard.referenceEpochYear,
    2010
  );
  const p2020 = propagateProperMotion(
    { raDeg: barnard.raDeg, decDeg: barnard.decDeg },
    barnard.pmRaCosDecMasYr,
    barnard.pmDecMasYr,
    barnard.referenceEpochYear,
    2020
  );
  const sep = angularSeparationArcsec(p2010, p2020);
  // 10 years * ~10.39 arcsec/yr ≈ 103.9 arcsec
  assert.ok(sep > 102 && sep < 106, `Expected ~103.9 arcsec separation, got ${sep}`);
});

test('WCS pixel round-trip conversion preserves coordinates', () => {
  const center = { raDeg: 133.795, decDeg: -7.245 };
  const target = { raDeg: 133.81, decDeg: -7.23 };
  const px = wcsToPixel(target, 400, 400, center, 10);
  const roundTrip = pixelToWcs(px.x, px.y, 400, 400, center, 10);
  assert.ok(Math.abs(roundTrip.raDeg - target.raDeg) < 1e-4);
  assert.ok(Math.abs(roundTrip.decDeg - target.decDeg) < 1e-4);
});

test('SPHEREx 102-band specification covers 6 arrays and 0.75-5.00 um monotonically', () => {
  assert.equal(SPHEREX_ARRAYS.length, 6);
  assert.equal(SPHEREX_BANDS.length, 102);
  assert.ok(SPHEREX_BANDS[0].wavelengthUm >= 0.75 && SPHEREX_BANDS[0].wavelengthUm < 0.8);
  assert.ok(SPHEREX_BANDS[101].wavelengthUm > 4.95 && SPHEREX_BANDS[101].wavelengthUm <= 5.0);

  for (let i = 1; i < SPHEREX_BANDS.length; i++) {
    assert.ok(SPHEREX_BANDS[i].wavelengthUm > SPHEREX_BANDS[i - 1].wavelengthUm);
  }
  assert.equal(getSpherexBand(96).arrayId, 6);

  const ySpectrum = computeReferenceSpectrum('y-dwarf', 3.4);
  assert.equal(ySpectrum.length, 102);
  // Cold Y-dwarf should be much brighter at 4.8 um (Array 6) than at 1.0 um (Array 1)
  assert.ok(ySpectrum[95].fluxMjy > ySpectrum[5].fluxMjy * 10);
});

test('Discovery Radar pipeline detects Barnard Star proper motion across epochs', () => {
  const barnard = CURATED_TARGETS.find((t) => t.id === 'barnards-star')!;
  const center = { raDeg: barnard.raDeg, decDeg: barnard.decDeg };
  const width = 256;
  const height = 256;
  const fovArcmin = 8;

  const bufferA = renderSkyBuffer({
    width,
    height,
    center,
    fovArcmin,
    epochYear: 2010.21,
    bandNumber: 62,
    target: barnard,
  });

  const bufferB = renderSkyBuffer({
    width,
    height,
    center,
    fovArcmin,
    epochYear: 2020.7,
    bandNumber: 62,
    target: barnard,
  });

  const summary = detectMovingCandidates({
    bufferA,
    bufferB,
    width,
    height,
    center,
    fovArcmin,
    epochADate: '2010-03-18',
    epochBDate: '2020-09-12',
    epochAYear: 2010.21,
    epochBYear: 2020.7,
    knownObjectName: barnard.name,
  });

  assert.ok(summary.matchedStaticCount >= 10, 'Should match static background stars');
  assert.ok(summary.candidates.length >= 1, 'Should detect moving candidate for Barnard Star');
  const top = summary.candidates[0];
  assert.ok(top.displacementArcsec > 80 && top.displacementArcsec < 130);
  assert.equal(top.reviewStatus, 'Matched Known Object');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpherexTapAdql,
  filterTutorialCutouts,
  isNearTutorialM101,
  SPHEREX_TUTORIAL_CUTOUTS,
  SPHEREX_TUTORIAL_TARGET,
} from './spherexTutorialDataset';

test('SPHEREX_TUTORIAL_TARGET preserves M101 Pinwheel Galaxy parameters from IRSA tutorial', () => {
  assert.equal(SPHEREX_TUTORIAL_TARGET.raDeg, 210.80227);
  assert.equal(SPHEREX_TUTORIAL_TARGET.decDeg, 54.34895);
  assert.equal(SPHEREX_TUTORIAL_TARGET.cutoutSizeDeg, 0.1);
  assert.equal(SPHEREX_TUTORIAL_TARGET.bandpass, 'SPHEREx-D2');
  assert.equal(SPHEREX_TUTORIAL_TARGET.previewPlateWavelengthsUm.length, 10);
});

test('SPHEREX_TUTORIAL_CUTOUTS contains valid DR1 and QR3 IBE cutout URIs', () => {
  assert.equal(SPHEREX_TUTORIAL_CUTOUTS.length, 17);
  const dr1 = filterTutorialCutouts(SPHEREX_TUTORIAL_CUTOUTS, 'DR1');
  const qr3 = filterTutorialCutouts(SPHEREX_TUTORIAL_CUTOUTS, 'QR3');
  assert.equal(dr1.length, 12);
  assert.equal(qr3.length, 5);
  for (const row of SPHEREX_TUTORIAL_CUTOUTS) {
    assert.ok(row.uri.startsWith('https://irsa.ipac.caltech.edu/ibe/data/spherex/'));
    assert.ok(row.uri.endsWith('?center=210.80227,54.34895d&size=0.1'));
  }
});

test('buildSpherexTapAdql produces tutorial-exact spherex.artifact/plane ADQL query', () => {
  const adql = buildSpherexTapAdql({
    raDeg: 210.80227,
    decDeg: 54.34895,
    sizeDeg: 0.1,
    bandpass: 'SPHEREx-D2',
  });
  assert.ok(adql.includes('FROM spherex.artifact a'));
  assert.ok(adql.includes('JOIN spherex.plane p ON a.planeid = p.planeid'));
  assert.ok(adql.includes("POINT('ICRS', 210.80227, 54.34895)"));
  assert.ok(adql.includes("p.energy_bandpassname = 'SPHEREx-D2'"));
});

test('isNearTutorialM101 detects M101 sky position within tolerance', () => {
  assert.equal(isNearTutorialM101(210.80227, 54.34895), true);
  assert.equal(isNearTutorialM101(133.795, -7.245), false);
});

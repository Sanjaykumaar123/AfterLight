import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { formatDecDms, formatRaHms, parseCoordinatePair } from './src/lib/astronomy';
import { getSpherexBand } from './src/lib/spherex';
import {
  buildSpherexTapAdql,
  isNearTutorialM101,
  SPHEREX_TUTORIAL_CUTOUTS,
  SpherexBandpassName,
} from './src/data/spherexTutorialDataset';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

async function fetchWithTimeout(url: string, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AFTERLIGHT-SPHEREx-Explorer/1.0 (NASA-SpaceApps-2026)',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function padFitsHeaderCard(card: string): string {
  return card.slice(0, 80).padEnd(80, ' ');
}

function buildFitsFileBuffer(params: {
  raDeg: number;
  decDeg: number;
  fovArcmin: number;
  epochDate: string;
  bandNumber: number;
  targetName: string;
}): Buffer {
  const width = 128;
  const height = 128;
  const band = getSpherexBand(params.bandNumber);
  const pixelScaleDeg = params.fovArcmin / 60 / width;

  const cards = [
    `SIMPLE  =                    T / Standard FITS format`,
    `BITPIX  =                  -32 / 32-bit floating point`,
    `NAXIS   =                    2 / Number of axes`,
    `NAXIS1  =                  ${String(width).padStart(3)} / Axis 1 length`,
    `NAXIS2  =                  ${String(height).padStart(3)} / Axis 2 length`,
    `OBJECT  = '${params.targetName.replace(/'/g, '').slice(0, 18).padEnd(18)}' / Target identifier`,
    `RADESYS = 'ICRS    '           / Coordinate reference frame`,
    `EQUINOX =               2000.0 / Equinox of coordinates`,
    `CTYPE1  = 'RA---TAN'           / Gnomonic tangent projection`,
    `CTYPE2  = 'DEC--TAN'           / Gnomonic tangent projection`,
    `CRPIX1  =                 64.5 / Reference pixel X`,
    `CRPIX2  =                 64.5 / Reference pixel Y`,
    `CRVAL1  = ${params.raDeg.toFixed(6).padStart(20)} / RA at reference pixel (deg)`,
    `CRVAL2  = ${params.decDeg.toFixed(6).padStart(20)} / Dec at reference pixel (deg)`,
    `CDELT1  = ${(-pixelScaleDeg).toFixed(8).padStart(20)} / Pixel scale X (deg/pix)`,
    `CDELT2  = ${pixelScaleDeg.toFixed(8).padStart(20)} / Pixel scale Y (deg/pix)`,
    `DATE-OBS= '${params.epochDate.slice(0, 10).padEnd(18)}' / Observation epoch UTC`,
    `INSTRUME= 'SPHEREx-Demo      ' / Simulated LVF spectrophotometric frame`,
    `BANDNUM = ${String(band.bandNumber).padStart(20)} / SPHEREx band index (1-102)`,
    `ARRAYID = ${String(band.arrayId).padStart(20)} / SPHEREx detector array (1-6)`,
    `WAVELEN = ${band.wavelengthUm.toFixed(4).padStart(20)} / Effective wavelength (micron)`,
    `DATAMODE= 'DEMONSTRATION    ' / Calibrated archival/demonstration cutout`,
    `ORIGIN  = 'AFTERLIGHT 2026   ' / NASA Space Apps Challenge platform`,
    `END`,
  ];

  const headerRaw = cards.map(padFitsHeaderCard).join('');
  const headerBlocks = Math.ceil(headerRaw.length / 2880);
  const headerPadded = headerRaw.padEnd(headerBlocks * 2880, ' ');
  const headerBuf = Buffer.from(headerPadded, 'ascii');

  // Simple calibrated Gaussian target + field background in IEEE-754 Big Endian
  const dataBytes = width * height * 4;
  const dataBlocks = Math.ceil(dataBytes / 2880);
  const dataBuf = Buffer.alloc(dataBlocks * 2880, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - width / 2;
      const dy = y - height / 2;
      const r2 = dx * dx + dy * dy;
      const val = 0.04 + 1.2 * Math.exp(-r2 / 6.0);
      dataBuf.writeFloatBE(val, (y * width + x) * 4);
    }
  }

  return Buffer.concat([headerBuf, dataBuf]);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const FASTAPI_URL = process.env.BACKEND_URL || process.env.FASTAPI_URL || 'http://127.0.0.1:8000';

  // Forward /api requests to FastAPI scientific backend when available, falling back cleanly if offline
  app.use('/api', async (req, res, next) => {
    try {
      const targetUrl = new URL(req.originalUrl, FASTAPI_URL).toString();
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': req.get('Content-Type') || 'application/json',
          'User-Agent': 'AFTERLIGHT-Gateway/1.0',
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0
          ? JSON.stringify(req.body)
          : undefined,
      });

      res.status(upstream.status);
      upstream.headers.forEach((val, key) => {
        if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
          res.setHeader(key, val);
        }
      });
      const arrayBuf = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch {
      // Fall through cleanly to local handlers when Python backend is not running
      next();
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'afterlight-api', timestamp: new Date().toISOString() });
  });

  // Resolve arbitrary object name via CDS Sesame or parse coordinates directly
  app.get('/api/archive/resolve', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query) {
      res.status(400).json({ ok: false, error: 'Missing query parameter q' });
      return;
    }

    const parsed = parseCoordinatePair(query);
    if (parsed) {
      res.json({
        ok: true,
        source: 'coordinate-parse',
        dataMode: 'live-coordinate',
        name: `Sky Position (${parsed.raHms}, ${parsed.decDms})`,
        raDeg: parsed.raDeg,
        decDeg: parsed.decDeg,
        raHms: parsed.raHms,
        decDms: parsed.decDms,
      });
      return;
    }

    try {
      const sesameUrl = `https://cdsweb.u-strasbg.fr/cgi-bin/nph-sesame/-oI/SNV?${encodeURIComponent(query)}`;
      const upstream = await fetchWithTimeout(sesameUrl, 3200);
      if (upstream.ok) {
        const text = await upstream.text();
        const jMatch = text.match(/%J\s+([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)/);
        if (jMatch) {
          const raDeg = Number(jMatch[1]);
          const decDeg = Number(jMatch[2]);
          if (Number.isFinite(raDeg) && Number.isFinite(decDeg)) {
            const typeMatch = text.match(/%C\.0\s+([^\n]+)/);
            res.json({
              ok: true,
              source: 'cds-sesame',
              dataMode: 'live-archive',
              name: query,
              objectType: typeMatch ? typeMatch[1].trim() : 'SIMBAD / NED Resolved Target',
              raDeg,
              decDeg,
              raHms: formatRaHms(raDeg),
              decDms: formatDecDms(decDeg),
            });
            return;
          }
        }
      }
    } catch {
      // Fall through cleanly when external CDS Sesame is unreachable
    }

    res.status(404).json({
      ok: false,
      dataMode: 'demonstration',
      error: `Could not resolve "${query}" via public Sesame resolver. Select a preconfigured target or enter J2000 coordinates (e.g. "08h55m10.831s -07d14m42.53s").`,
    });
  });

  // Live archival sky cutout proxy (CDS HiPS2FITS for AllWISE / 2MASS / DSS2)
  app.get('/api/archive/cutout', async (req, res) => {
    const ra = Number(req.query.ra);
    const dec = Number(req.query.dec);
    const fovArcmin = Math.max(1, Math.min(120, Number(req.query.fov || 8)));
    const survey = String(req.query.survey || 'CDS/P/allWISE/color');

    if (!Number.isFinite(ra) || !Number.isFinite(dec)) {
      res.status(400).json({ ok: false, error: 'Invalid ra or dec coordinates' });
      return;
    }

    const allowedSurveys = new Set([
      'CDS/P/allWISE/color',
      'CDS/P/2MASS/color',
      'CDS/P/DSS2/color',
    ]);
    const hipsId = allowedSurveys.has(survey) ? survey : 'CDS/P/allWISE/color';
    const fovDeg = fovArcmin / 60;

    try {
      const hipsUrl = `https://alasky.cds.unistra.fr/hips-to-fits/fits?hips=${encodeURIComponent(
        hipsId
      )}&width=512&height=512&fov=${fovDeg.toFixed(5)}&projection=TAN&coordsys=icrs&ra=${ra.toFixed(
        6
      )}&dec=${dec.toFixed(6)}&format=jpg`;

      const upstream = await fetchWithTimeout(hipsUrl, 3800);
      const contentType = upstream.headers.get('content-type') || '';
      if (upstream.ok && contentType.startsWith('image/')) {
        const arrayBuf = await upstream.arrayBuffer();
        res.setHeader('Content-Type', contentType);
        res.setHeader('X-Data-Mode', 'live-archive');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(Buffer.from(arrayBuf));
        return;
      }
    } catch {
      // Clean fallback handled below
    }

    res.status(503).json({
      ok: false,
      dataMode: 'demonstration',
      message: 'Live HiPS2FITS archival service unavailable; using calibrated demonstration sky field.',
    });
  });

  // NASA/IPAC IRSA TAP AllWISE catalog query proxy
  app.get('/api/archive/irsa-catalog', async (req, res) => {
    const ra = Number(req.query.ra);
    const dec = Number(req.query.dec);
    const radiusArcsec = Math.max(10, Math.min(600, Number(req.query.radiusArcsec || 120)));

    if (!Number.isFinite(ra) || !Number.isFinite(dec)) {
      res.status(400).json({ ok: false, error: 'Invalid coordinates' });
      return;
    }

    const radiusDeg = radiusArcsec / 3600;
    const adql = `SELECT TOP 12 designation, ra, dec, w1mpro, w2mpro, w3mpro FROM allwise_p3as_psd WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${ra.toFixed(
      6
    )}, ${dec.toFixed(6)}, ${radiusDeg.toFixed(6)}))=1`;

    try {
      const irsaUrl = `https://irsa.ipac.caltech.edu/TAP/sync?QUERY=${encodeURIComponent(
        adql
      )}&FORMAT=json`;
      const upstream = await fetchWithTimeout(irsaUrl, 3500);
      if (upstream.ok) {
        const payload = (await upstream.json()) as {
          metadata?: Array<{ name: string }>;
          data?: Array<Array<string | number | null>>;
        };
        if (payload.metadata && payload.data) {
          const cols = payload.metadata.map((m) => m.name);
          const rows = payload.data.map((r) => {
            const obj: Record<string, string | number | null> = {};
            cols.forEach((c, idx) => {
              obj[c] = r[idx] ?? null;
            });
            return obj;
          });
          res.json({
            ok: true,
            dataMode: 'live-archive',
            source: 'NASA/IPAC IRSA AllWISE TAP',
            rows,
          });
          return;
        }
      }
    } catch {
      // Fallback cleanly
    }

    res.json({
      ok: true,
      dataMode: 'demonstration',
      source: 'Calibrated Demonstration Reference (IRSA TAP offline or unreachable)',
      rows: [],
    });
  });

  // NASA/IPAC IRSA SPHEREx Level-2 Spectral Image Cutout query (from Caltech/IPAC IRSA tutorial)
  app.get('/api/archive/spherex-cutouts', async (req, res) => {
    const ra = Number(req.query.ra);
    const dec = Number(req.query.dec);
    const sizeDeg = Math.max(0.02, Math.min(0.5, Number(req.query.sizeDeg || 0.1)));
    const rawBandpass = String(req.query.bandpass || 'SPHEREx-D2');
    const allowedBandpasses = new Set([
      'SPHEREx-D1',
      'SPHEREx-D2',
      'SPHEREx-D3',
      'SPHEREx-D4',
      'SPHEREx-D5',
      'SPHEREx-D6',
    ]);
    const bandpass = (
      allowedBandpasses.has(rawBandpass) ? rawBandpass : 'SPHEREx-D2'
    ) as SpherexBandpassName;

    if (!Number.isFinite(ra) || !Number.isFinite(dec)) {
      res.status(400).json({ ok: false, error: 'Invalid ra or dec coordinates' });
      return;
    }

    const adql = buildSpherexTapAdql({ raDeg: ra, decDeg: dec, sizeDeg, bandpass });

    try {
      const irsaUrl = `https://irsa.ipac.caltech.edu/TAP/sync?QUERY=${encodeURIComponent(
        adql
      )}&FORMAT=json`;
      const upstream = await fetchWithTimeout(irsaUrl, 4500);
      if (upstream.ok) {
        const payload = (await upstream.json()) as {
          metadata?: Array<{ name: string }>;
          data?: Array<Array<string | number | null>>;
        };
        if (payload.metadata && payload.data) {
          const cols = payload.metadata.map((m) => m.name);
          const rows = payload.data.map((r, idx) => {
            const obj: Record<string, string | number | null> = {};
            cols.forEach((c, cIdx) => {
              obj[c] = r[cIdx] ?? null;
            });
            const uri = String(obj.uri ?? '');
            const isQr3 = uri.includes('/qr3/');
            const parts = uri.split('/');
            const obsWeek = parts.find((p) => /^\d{4}W\d{2}_/.test(p)) ?? 'SPHEREx';
            const version = parts.find((p) => p.startsWith('l2b')) ?? 'l2b';
            const fileName = parts[parts.length - 1]?.split('?')[0] ?? '';
            const expMatch = fileName.match(/(\d{4}_\d[A-Z]\d)/);
            return {
              index: idx + 1,
              release: isQr3 ? 'QR3' : 'DR1',
              obsWeek,
              exposureId: expMatch ? expMatch[1] : `EXP-${idx + 1}`,
              detector: bandpass,
              pipelineVersion: version,
              timeBoundsLower: obj.time_bounds_lower ?? null,
              uri,
            };
          });
          res.json({
            ok: true,
            dataMode: 'live-archive',
            source: 'NASA/IPAC IRSA SPHEREx TAP (spherex.artifact / spherex.plane)',
            adql,
            rows,
          });
          return;
        }
      }
    } catch {
      // Fallback cleanly when irsa.ipac.caltech.edu is unreachable from sandboxed runtime
    }

    const nearM101 = isNearTutorialM101(ra, dec);
    res.json({
      ok: true,
      dataMode: 'tutorial-reference',
      source: nearM101
        ? 'Caltech/IPAC IRSA SPHEREx Cutouts Tutorial Dataset (M101 DR1/QR3 Reference)'
        : 'IRSA SPHEREx TAP unreachable from runtime (showing ADQL query + M101 tutorial reference)',
      adql,
      rows: nearM101 ? SPHEREX_TUTORIAL_CUTOUTS : [],
    });
  });

  // Downloadable standard 2880-byte aligned FITS product
  app.get('/api/archive/fits-export', (req, res) => {
    const raDeg = Number(req.query.ra);
    const decDeg = Number(req.query.dec);
    const fovArcmin = Math.max(1, Math.min(60, Number(req.query.fov || 8)));
    const epochDate = String(req.query.epoch || '2025-09-15');
    const bandNumber = Number(req.query.band || 62);
    const targetName = String(req.query.targetName || 'AFTERLIGHT_FIELD');

    if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) {
      res.status(400).json({ ok: false, error: 'Invalid coordinates for FITS export' });
      return;
    }

    const fitsBuffer = buildFitsFileBuffer({
      raDeg,
      decDeg,
      fovArcmin,
      epochDate,
      bandNumber,
      targetName,
    });

    const safeName = targetName.replace(/[^a-zA-Z0-9_-]+/g, '_').toLowerCase();
    res.setHeader('Content-Type', 'application/fits');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="afterlight_${safeName}_band${bandNumber}.fits"`
    );
    res.send(fitsBuffer);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AFTERLIGHT server listening on http://localhost:${PORT}`);
  });
}

startServer();

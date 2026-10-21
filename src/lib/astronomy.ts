export interface SkyCoordinates {
  raDeg: number;
  decDeg: number;
}

export interface ParsedCoordinateInput extends SkyCoordinates {
  raHms: string;
  decDms: string;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function normalizeRaDeg(raDeg: number): number {
  const mod = raDeg % 360;
  return mod < 0 ? mod + 360 : mod;
}

export function clampDecDeg(decDeg: number): number {
  return Math.max(-90, Math.min(90, decDeg));
}

/**
 * Parse a Right Ascension string in either decimal degrees ("133.795") or
 * sexagesimal HMS ("08h55m10.831s", "08:55:10.831", "08 55 10.831").
 */
export function parseRa(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pure decimal degrees
  if (/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    const val = Number(trimmed);
    if (!Number.isFinite(val)) return null;
    return normalizeRaDeg(val);
  }

  // Sexagesimal HMS (h/m/s, colons, or spaces)
  const match = trimmed.match(
    /^(\d{1,2})\s*[h:\s]\s*(\d{1,2})\s*[m:\s]\s*(\d{1,2}(?:\.\d+)?)\s*s?$/i
  );
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    !Number.isFinite(seconds) ||
    hours < 0 ||
    hours >= 24 ||
    minutes < 0 ||
    minutes >= 60 ||
    seconds < 0 ||
    seconds >= 60
  ) {
    return null;
  }

  return normalizeRaDeg((hours + minutes / 60 + seconds / 3600) * 15);
}

/**
 * Parse a Declination string in either decimal degrees ("-7.245") or
 * sexagesimal DMS ("-07d14m42.53s", "-07:14:42.53", "+04° 41' 36.1\"").
 */
export function parseDec(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pure decimal degrees
  if (/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
    const val = Number(trimmed);
    if (!Number.isFinite(val) || val < -90 || val > 90) return null;
    return val;
  }

  const match = trimmed.match(
    /^([+-])?\s*(\d{1,2})\s*[d°:\s]\s*(\d{1,2})\s*[m'′:\s]\s*(\d{1,2}(?:\.\d+)?)\s*[s"″]?$/i
  );
  if (!match) return null;

  const sign = match[1] === '-' ? -1 : 1;
  const deg = Number(match[2]);
  const arcmin = Number(match[3]);
  const arcsec = Number(match[4]);

  if (
    !Number.isFinite(deg) ||
    !Number.isFinite(arcmin) ||
    !Number.isFinite(arcsec) ||
    deg > 90 ||
    arcmin >= 60 ||
    arcsec >= 60
  ) {
    return null;
  }

  const decimal = sign * (deg + arcmin / 60 + arcsec / 3600);
  if (decimal < -90 || decimal > 90) return null;
  return decimal;
}

/**
 * Parse a combined coordinate string like "08h55m10.831s -07d14m42.53s"
 * or "133.795, -7.245" or "17:57:48.50 +04:41:36.1".
 */
export function parseCoordinatePair(query: string): ParsedCoordinateInput | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Comma or semicolon separated
  if (trimmed.includes(',') || trimmed.includes(';')) {
    const parts = trimmed.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      const ra = parseRa(parts[0]);
      const dec = parseDec(parts[1]);
      if (ra !== null && dec !== null) {
        return {
          raDeg: ra,
          decDeg: dec,
          raHms: formatRaHms(ra),
          decDms: formatDecDms(dec),
        };
      }
    }
  }

  // Space separated two tokens (e.g. "08h55m10.831s -07d14m42.53s" or "133.795 -7.245")
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 2) {
    const ra = parseRa(tokens[0]);
    const dec = parseDec(tokens[1]);
    if (ra !== null && dec !== null) {
      return {
        raDeg: ra,
        decDeg: dec,
        raHms: formatRaHms(ra),
        decDms: formatDecDms(dec),
      };
    }
  }

  // Six space-separated sexagesimal parts: "08 55 10.831 -07 14 42.53"
  if (tokens.length === 6) {
    const ra = parseRa(`${tokens[0]} ${tokens[1]} ${tokens[2]}`);
    const dec = parseDec(`${tokens[3]} ${tokens[4]} ${tokens[5]}`);
    if (ra !== null && dec !== null) {
      return {
        raDeg: ra,
        decDeg: dec,
        raHms: formatRaHms(ra),
        decDms: formatDecDms(dec),
      };
    }
  }

  return null;
}

export function formatRaHms(raDeg: number, precision = 2): string {
  const norm = normalizeRaDeg(raDeg);
  const totalHours = norm / 15;
  let hours = Math.floor(totalHours);
  const remMin = (totalHours - hours) * 60;
  let minutes = Math.floor(remMin);
  let seconds = (remMin - minutes) * 60;

  if (Number(seconds.toFixed(precision)) >= 60) {
    seconds = 0;
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes = 0;
    hours = (hours + 1) % 24;
  }

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = seconds.toFixed(precision).padStart(precision > 0 ? 3 + precision : 2, '0');
  return `${hh}h ${mm}m ${ss}s`;
}

export function formatDecDms(decDeg: number, precision = 2): string {
  const clamped = clampDecDeg(decDeg);
  const sign = clamped < 0 ? '-' : '+';
  const abs = Math.abs(clamped);
  let deg = Math.floor(abs);
  const remArcmin = (abs - deg) * 60;
  let arcmin = Math.floor(remArcmin);
  let arcsec = (remArcmin - arcmin) * 60;

  if (Number(arcsec.toFixed(precision)) >= 60) {
    arcsec = 0;
    arcmin += 1;
  }
  if (arcmin >= 60) {
    arcmin = 0;
    deg += 1;
  }

  const dd = String(deg).padStart(2, '0');
  const mm = String(arcmin).padStart(2, '0');
  const ss = arcsec.toFixed(precision).padStart(precision > 0 ? 3 + precision : 2, '0');
  return `${sign}${dd}° ${mm}' ${ss}"`;
}

/**
 * Great-circle angular separation between two sky positions, returned in arcseconds.
 */
export function angularSeparationArcsec(a: SkyCoordinates, b: SkyCoordinates): number {
  const ra1 = a.raDeg * DEG_TO_RAD;
  const dec1 = a.decDeg * DEG_TO_RAD;
  const ra2 = b.raDeg * DEG_TO_RAD;
  const dec2 = b.decDeg * DEG_TO_RAD;

  const dRa = ra2 - ra1;
  const sinDec1 = Math.sin(dec1);
  const cosDec1 = Math.cos(dec1);
  const sinDec2 = Math.sin(dec2);
  const cosDec2 = Math.cos(dec2);

  const y = Math.sqrt(
    Math.pow(cosDec2 * Math.sin(dRa), 2) +
      Math.pow(cosDec1 * sinDec2 - sinDec1 * cosDec2 * Math.cos(dRa), 2)
  );
  const x = sinDec1 * sinDec2 + cosDec1 * cosDec2 * Math.cos(dRa);
  const rad = Math.atan2(y, x);
  return rad * RAD_TO_DEG * 3600;
}

/**
 * Propagate J2000 coordinates from referenceEpochYear to targetEpochYear
 * using proper motion components (mas/yr, with pmRa already including cos(dec)).
 */
export function propagateProperMotion(
  base: SkyCoordinates,
  pmRaCosDecMasYr: number,
  pmDecMasYr: number,
  refEpochYear: number,
  targetEpochYear: number
): SkyCoordinates {
  const dtYears = targetEpochYear - refEpochYear;
  const cosDec = Math.max(0.05, Math.cos(base.decDeg * DEG_TO_RAD));
  const dRaDeg = (pmRaCosDecMasYr * dtYears) / (3_600_000 * cosDec);
  const dDecDeg = (pmDecMasYr * dtYears) / 3_600_000;

  return {
    raDeg: normalizeRaDeg(base.raDeg + dRaDeg),
    decDeg: clampDecDeg(base.decDeg + dDecDeg),
  };
}

/**
 * Simple TAN gnomonic projection from pixel offset (relative to center) to RA/Dec.
 * Astronomical east is left (-x increases RA), north is up (-y increases Dec).
 */
export function pixelToWcs(
  px: number,
  py: number,
  width: number,
  height: number,
  center: SkyCoordinates,
  fovArcmin: number
): SkyCoordinates {
  const fovDeg = fovArcmin / 60;
  const scaleDegPerPx = fovDeg / Math.min(width, height);
  const dxPx = px - width / 2;
  const dyPx = py - height / 2;

  const cosDec = Math.max(0.05, Math.cos(center.decDeg * DEG_TO_RAD));
  const raDeg = normalizeRaDeg(center.raDeg - (dxPx * scaleDegPerPx) / cosDec);
  const decDeg = clampDecDeg(center.decDeg - dyPx * scaleDegPerPx);
  return { raDeg, decDeg };
}

export function wcsToPixel(
  target: SkyCoordinates,
  width: number,
  height: number,
  center: SkyCoordinates,
  fovArcmin: number
): { x: number; y: number } {
  const fovDeg = fovArcmin / 60;
  const scaleDegPerPx = fovDeg / Math.min(width, height);
  const cosDec = Math.max(0.05, Math.cos(center.decDeg * DEG_TO_RAD));

  let dRa = target.raDeg - center.raDeg;
  if (dRa > 180) dRa -= 360;
  if (dRa < -180) dRa += 360;

  const dDec = target.decDeg - center.decDeg;

  return {
    x: width / 2 - (dRa * cosDec) / scaleDegPerPx,
    y: height / 2 - dDec / scaleDegPerPx,
  };
}

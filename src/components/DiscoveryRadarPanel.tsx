import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Radar } from 'lucide-react';
import { CelestialTarget, ObservationEpoch } from '../data/objects';
import { SkyCoordinates } from '../lib/astronomy';
import {
  detectMovingCandidates,
  MovingObjectCandidate,
  ReviewStatus,
} from '../lib/detection';
import { renderSkyBuffer } from '../lib/skyRenderer';

interface DiscoveryRadarPanelProps {
  center: SkyCoordinates;
  fovArcmin: number;
  epochs: ObservationEpoch[];
  bandNumber: number;
  target?: CelestialTarget | null;
  includeSyntheticMover?: boolean;
  onCandidatesUpdated?: (candidates: MovingObjectCandidate[]) => void;
  selectedCandidateId: string | null;
  onSelectCandidate: (candidate: MovingObjectCandidate | null) => void;
}

const RADAR_DIM = 256;

export const DiscoveryRadarPanel: React.FC<DiscoveryRadarPanelProps> = ({
  center,
  fovArcmin,
  epochs,
  bandNumber,
  target,
  includeSyntheticMover = false,
  onCandidatesUpdated,
  selectedCandidateId,
  onSelectCandidate,
}) => {
  const [epochAIdx, setEpochAIdx] = useState(0);
  const [epochBIdx, setEpochBIdx] = useState(Math.max(0, epochs.length - 1));
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ReviewStatus>>({});

  useEffect(() => {
    setEpochAIdx(0);
    setEpochBIdx(Math.max(0, epochs.length - 1));
  }, [epochs]);

  const epochA = epochs[epochAIdx] ?? epochs[0];
  const epochB = epochs[epochBIdx] ?? epochs[epochs.length - 1] ?? epochs[0];

  const detection = useMemo(() => {
    if (epochs.length < 2 || !epochA || !epochB || epochA.id === epochB.id) {
      return null;
    }

    const bufferA = renderSkyBuffer({
      width: RADAR_DIM,
      height: RADAR_DIM,
      center,
      fovArcmin,
      epochYear: epochA.yearDecimal,
      bandNumber,
      target,
      fluxMultiplier: epochA.fluxMultiplier,
      includeSyntheticMover,
    });

    const bufferB = renderSkyBuffer({
      width: RADAR_DIM,
      height: RADAR_DIM,
      center,
      fovArcmin,
      epochYear: epochB.yearDecimal,
      bandNumber,
      target,
      fluxMultiplier: epochB.fluxMultiplier,
      includeSyntheticMover,
    });

    return detectMovingCandidates({
      bufferA,
      bufferB,
      width: RADAR_DIM,
      height: RADAR_DIM,
      center,
      fovArcmin,
      epochADate: epochA.dateIso,
      epochBDate: epochB.dateIso,
      epochAYear: epochA.yearDecimal,
      epochBYear: epochB.yearDecimal,
      knownObjectName: target?.name,
    });
  }, [
    epochs.length,
    epochA,
    epochB,
    center,
    fovArcmin,
    bandNumber,
    target,
    includeSyntheticMover,
  ]);

  const candidatesWithStatus = useMemo(() => {
    if (!detection) return [];
    return detection.candidates.map((c) => ({
      ...c,
      reviewStatus: statusOverrides[c.candidateId] ?? c.reviewStatus,
    }));
  }, [detection, statusOverrides]);

  useEffect(() => {
    onCandidatesUpdated?.(candidatesWithStatus);
  }, [candidatesWithStatus, onCandidatesUpdated]);

  const selectedCandidate =
    candidatesWithStatus.find((c) => c.candidateId === selectedCandidateId) ??
    candidatesWithStatus[0] ??
    null;

  return (
    <section
      aria-label="Discovery Radar Moving Object Detection"
      className="border border-[#DADCE0] bg-white"
    >
      <div className="p-5 border-b border-[#DADCE0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#202124] flex items-center gap-2">
            <Radar className="w-4 h-4 text-[#0B3D91]" />
            <span>Discovery Radar · Moving-Object Candidate Pipeline</span>
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Automated point-source extraction, sigma-clipped centroiding, and cross-epoch astrometric displacement ranking.
          </p>
        </div>

        {epochs.length >= 2 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5">
              <span className="text-[#4B5563]">Epoch A:</span>
              <select
                aria-label="Discovery Radar Epoch A"
                value={epochAIdx}
                onChange={(e) => setEpochAIdx(Number(e.target.value))}
                className="border border-[#DADCE0] bg-white px-2 py-1 font-mono"
              >
                {epochs.map((ep, idx) => (
                  <option key={ep.id} value={idx}>
                    {ep.dateIso}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-[#4B5563]">Epoch B:</span>
              <select
                aria-label="Discovery Radar Epoch B"
                value={epochBIdx}
                onChange={(e) => setEpochBIdx(Number(e.target.value))}
                className="border border-[#DADCE0] bg-white px-2 py-1 font-mono"
              >
                {epochs.map((ep, idx) => (
                  <option key={ep.id} value={idx}>
                    {ep.dateIso}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* Scientific Verification Disclaimer */}
      <div className="px-5 py-3 bg-[#F5F6F7] border-b border-[#DADCE0] flex items-start gap-2.5 text-xs text-[#202124]">
        <AlertTriangle className="w-4 h-4 text-[#0B3D91] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Scientific Verification Notice:</strong> Positional offsets flagged by Discovery Radar
          are unconfirmed candidate detections requiring multi-epoch astrometric and spectroscopic
          verification. Image differences alone never constitute a confirmed planet or astronomical discovery.
        </p>
      </div>

      {!detection ? (
        <div className="p-6 text-sm text-[#4B5563]">
          Select two distinct observation epochs to execute cross-epoch point-source extraction and displacement analysis.
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Pipeline Extraction Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-[#DADCE0]">
            <div>
              <div className="text-xs text-[#4B5563]">Epoch A Sources</div>
              <div className="text-xl font-mono tabular-nums font-semibold text-[#202124] mt-0.5">
                {detection.epochASourceCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#4B5563]">Epoch B Sources</div>
              <div className="text-xl font-mono tabular-nums font-semibold text-[#202124] mt-0.5">
                {detection.epochBSourceCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#4B5563]">Static Astrometric Ties</div>
              <div className="text-xl font-mono tabular-nums font-semibold text-[#202124] mt-0.5">
                {detection.matchedStaticCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#4B5563]">Astrometric RMS</div>
              <div className="text-xl font-mono tabular-nums font-semibold text-[#0B3D91] mt-0.5">
                {detection.astrometricRmsArcsec.toFixed(3)}"
              </div>
            </div>
          </div>

          {/* Ranked Candidate Table */}
          {candidatesWithStatus.length === 0 ? (
            <div className="border border-[#DADCE0] bg-[#F5F6F7] p-5 text-sm text-[#4B5563]">
              No moving-object candidates above the displacement threshold (&gt; 1.5 px, SNR ≥ 5.5) were detected between{' '}
              <span className="font-mono">{epochA.dateIso}</span> and{' '}
              <span className="font-mono">{epochB.dateIso}</span>. Variable targets such as{' '}
              <span className="font-medium text-[#202124]">{target?.name || 'this region'}</span>{' '}
              may exhibit photometric brightness changes without measurable sky-plane displacement.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#DADCE0]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F5F6F7] border-b border-[#DADCE0] text-[#202124] font-semibold">
                    <th className="py-2.5 px-3">Candidate ID</th>
                    <th className="py-2.5 px-3">RA (J2000)</th>
                    <th className="py-2.5 px-3">Declination</th>
                    <th className="py-2.5 px-3">Observation Dates</th>
                    <th className="py-2.5 px-3">Est. Displacement</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Review Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DADCE0]">
                  {candidatesWithStatus.map((cand) => {
                    const isSelected = selectedCandidate?.candidateId === cand.candidateId;
                    return (
                      <tr
                        key={cand.candidateId}
                        onClick={() => onSelectCandidate(cand)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#0B3D91]/5' : 'hover:bg-[#F5F6F7]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#0B3D91]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCandidate(cand);
                            }}
                            className="underline decoration-dotted text-left"
                          >
                            {cand.candidateId}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-[#202124]">
                          {cand.raHms}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-[#202124]">
                          {cand.decDms}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-[#4B5563]">
                          {cand.epochADate} → {cand.epochBDate}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-[#202124]">
                          {cand.displacementArcsec.toFixed(2)}" ({cand.properMotionArcsecYr.toFixed(2)}"/yr)
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-[#202124]">
                          {Math.round(cand.confidence * 100)}%
                        </td>
                        <td className="py-2.5 px-3 text-[#202124]">{cand.reviewStatus}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected Candidate Inspection */}
          {selectedCandidate && (
            <div className="border border-[#DADCE0] bg-[#F5F6F7] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#202124]">
                    Candidate Inspection · {selectedCandidate.candidateId}
                  </h3>
                  <p className="text-xs text-[#4B5563] mt-0.5">
                    {selectedCandidate.classificationNote}
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 text-xs">
                  <span className="font-medium text-[#202124]">Review Status:</span>
                  <select
                    aria-label={`Review status for ${selectedCandidate.candidateId}`}
                    value={selectedCandidate.reviewStatus}
                    onChange={(e) =>
                      setStatusOverrides((prev) => ({
                        ...prev,
                        [selectedCandidate.candidateId]: e.target.value as ReviewStatus,
                      }))
                    }
                    className="bg-white border border-[#DADCE0] px-2.5 py-1 text-xs text-[#202124]"
                  >
                    <option value="Pending Review">Pending Review</option>
                    <option value="Under Inspection">Under Inspection</option>
                    <option value="Matched Known Object">Matched Known Object</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-[#DADCE0]">
                <div>
                  <span className="text-[#4B5563] block">Pixel Shift</span>
                  <span className="font-mono tabular-nums text-[#202124] font-medium">
                    {selectedCandidate.displacementPx} px
                  </span>
                </div>
                <div>
                  <span className="text-[#4B5563] block">Position Angle</span>
                  <span className="font-mono tabular-nums text-[#202124] font-medium">
                    {selectedCandidate.positionAngleDeg}° (E of N)
                  </span>
                </div>
                <div>
                  <span className="text-[#4B5563] block">Detection SNR (A / B)</span>
                  <span className="font-mono tabular-nums text-[#202124] font-medium">
                    {selectedCandidate.snrEpochA} / {selectedCandidate.snrEpochB}
                  </span>
                </div>
                <div>
                  <span className="text-[#4B5563] block">Est. Angular Rate</span>
                  <span className="font-mono tabular-nums text-[#202124] font-medium">
                    {selectedCandidate.properMotionArcsecYr.toFixed(3)} "/yr
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

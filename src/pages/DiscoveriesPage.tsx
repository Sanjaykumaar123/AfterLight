import React, { useState } from 'react';
import { CURATED_TARGETS } from '../data/objects';
import { MovingObjectCandidate } from '../lib/detection';
import { DiscoveryRadarPanel } from '../components/DiscoveryRadarPanel';
import { SkyCanvasViewer } from '../components/SkyCanvasViewer';

interface DiscoveriesPageProps {
  onOpenExplorerRadar: (targetId: string) => void;
}

export const DiscoveriesPage: React.FC<DiscoveriesPageProps> = ({
  onOpenExplorerRadar,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string>('wise-0855');
  const [candidates, setCandidates] = useState<MovingObjectCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const activeTarget =
    CURATED_TARGETS.find((t) => t.id === selectedTargetId) ?? CURATED_TARGETS[0];

  const bandNumber = activeTarget.id === 'wise-0855' ? 96 : 62;
  const latestEpoch = activeTarget.epochs[activeTarget.epochs.length - 1];

  return (
    <main className="bg-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="border-b border-[#DADCE0] pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#0B3D91]">
              Multi-Epoch Moving Object Pipeline
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#202124] tracking-tight">
              Discovery Radar &amp; Candidate Review
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#4B5563] leading-relaxed">
              Inspect automated cross-epoch point-source detections across monitored
              benchmark fields. High-proper-motion dwarfs produce high-confidence positional
              shifts, while variable stars isolate stationary photometric flux changes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenExplorerRadar(activeTarget.id)}
            className="px-4 py-2 bg-[#0B3D91] text-white text-xs font-semibold hover:bg-[#1A73B8] transition-colors whitespace-nowrap shrink-0 self-start"
          >
            Inspect in Observation Explorer
          </button>
        </div>

        {/* Field Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#202124] mr-2">
            Monitored Sky Region:
          </span>
          {CURATED_TARGETS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedTargetId(t.id);
                setSelectedCandidateId(null);
              }}
              className={`px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                selectedTargetId === t.id
                  ? 'bg-[#0B3D91] text-white border-[#0B3D91]'
                  : 'bg-white text-[#4B5563] border-[#DADCE0] hover:border-[#0B3D91]'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <SkyCanvasViewer
              center={{ raDeg: activeTarget.raDeg, decDeg: activeTarget.decDeg }}
              fovArcmin={activeTarget.defaultFovArcmin}
              epoch={latestEpoch}
              bandNumber={bandNumber}
              target={activeTarget}
              candidates={candidates}
              selectedCandidateId={selectedCandidateId}
              compact
            />
          </div>

          <div className="lg:col-span-7">
            <DiscoveryRadarPanel
              center={{ raDeg: activeTarget.raDeg, decDeg: activeTarget.decDeg }}
              fovArcmin={activeTarget.defaultFovArcmin}
              epochs={activeTarget.epochs}
              bandNumber={bandNumber}
              target={activeTarget}
              onCandidatesUpdated={setCandidates}
              selectedCandidateId={selectedCandidateId}
              onSelectCandidate={(c) => setSelectedCandidateId(c?.candidateId ?? null)}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

import React, { useEffect } from 'react';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { ObservationEpoch } from '../data/objects';

interface TimeMachinePanelProps {
  epochs: ObservationEpoch[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speedMultiplier: number;
  onChangeSpeed: (speed: number) => void;
}

export const TimeMachinePanel: React.FC<TimeMachinePanelProps> = ({
  epochs,
  activeIndex,
  onChangeIndex,
  isPlaying,
  onTogglePlay,
  speedMultiplier,
  onChangeSpeed,
}) => {
  const ordered = epochs;
  const activeEpoch = ordered[activeIndex] ?? ordered[0];
  const isSingleEpoch = ordered.length <= 1;

  useEffect(() => {
    if (!isPlaying || isSingleEpoch) return;
    const intervalMs = Math.max(250, Math.round(1200 / speedMultiplier));
    const timer = setInterval(() => {
      onChangeIndex((activeIndex + 1) % ordered.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, isSingleEpoch, speedMultiplier, activeIndex, ordered.length, onChangeIndex]);

  if (ordered.length === 0) {
    return (
      <div className="border border-[#DADCE0] bg-[#F5F6F7] p-6 text-sm text-[#4B5563]">
        No observation epochs are currently available for this sky coordinate.
      </div>
    );
  }

  return (
    <section
      aria-label="Cosmic Time Machine"
      className="border border-[#DADCE0] bg-white p-5 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-[#DADCE0]">
        <div>
          <h2 className="text-base font-semibold text-[#202124]">
            Cosmic Time Machine
          </h2>
          <p className="text-xs text-[#4B5563] mt-0.5">
            Step chronologically through aligned sky epochs to inspect proper motion and flux variability.
          </p>
        </div>
        <div className="text-xs font-mono tabular-nums text-[#0B3D91] font-medium">
          Frame {activeIndex + 1} of {ordered.length} · {activeEpoch.dateIso}
        </div>
      </div>

      {isSingleEpoch ? (
        <div
          role="status"
          className="border border-[#DADCE0] bg-[#F5F6F7] p-4 text-sm text-[#202124]"
        >
          Only one observation epoch ({activeEpoch.dateIso}) is currently available for this sky region.
          Additional epochs are required for multi-epoch time-lapse playback.
        </div>
      ) : (
        <>
          {/* Transport & Speed Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChangeIndex((activeIndex - 1 + ordered.length) % ordered.length)
                }
                aria-label="Previous observation"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] hover:border-[#0B3D91] whitespace-nowrap shrink-0"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause time machine' : 'Play time machine'}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#0B3D91] text-white hover:bg-[#1A73B8] transition-colors whitespace-nowrap shrink-0"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Play Sequence</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onChangeIndex((activeIndex + 1) % ordered.length)}
                aria-label="Next observation"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-[#DADCE0] text-[#202124] hover:border-[#0B3D91] whitespace-nowrap shrink-0"
              >
                <span>Next</span>
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#4B5563]">Playback Speed:</span>
              {[0.5, 1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onChangeSpeed(spd)}
                  className={`px-2.5 py-1.5 text-xs font-mono tabular-nums border whitespace-nowrap shrink-0 ${
                    speedMultiplier === spd
                      ? 'bg-[#0B3D91] text-white border-[#0B3D91]'
                      : 'bg-white text-[#202124] border-[#DADCE0] hover:border-[#0B3D91]'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>
          </div>

          {/* Chronological Scrubber */}
          <div className="space-y-2">
            <label htmlFor="epoch-timeline-slider" className="sr-only">
              Observation epoch timeline
            </label>
            <input
              id="epoch-timeline-slider"
              type="range"
              min={0}
              max={ordered.length - 1}
              step={1}
              value={activeIndex}
              onChange={(e) => onChangeIndex(Number(e.target.value))}
              className="w-full accent-[#0B3D91]"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ordered.map((ep, idx) => (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => onChangeIndex(idx)}
                  className={`text-left px-3 py-2 border text-xs transition-colors ${
                    idx === activeIndex
                      ? 'border-[#0B3D91] bg-[#F5F6F7] text-[#202124]'
                      : 'border-[#DADCE0] bg-white text-[#4B5563] hover:border-[#1A73B8]'
                  }`}
                >
                  <div className="font-mono tabular-nums font-semibold text-[#202124]">
                    {ep.dateIso}
                  </div>
                  <div className="truncate mt-0.5">{ep.wavelengthLabel}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Active Epoch Context */}
      <div className="pt-3 border-t border-[#DADCE0] text-xs text-[#4B5563] flex flex-wrap items-center justify-between gap-2">
        <span>
          <strong className="text-[#202124]">Active Epoch Notes:</strong> {activeEpoch.notes}
        </span>
        <span className="font-mono">{activeEpoch.dataProvenance}</span>
      </div>
    </section>
  );
};

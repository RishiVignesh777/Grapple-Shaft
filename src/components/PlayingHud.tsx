import { formatSpeedrunTime } from '../game/speedrunTimer';
import type { ZoneName } from '../game/types';

interface PlayingHudProps {
  muted: boolean;
  zoneLabel: ZoneName;
  zoneLabelVisible: boolean;
  checkpointBannerVisible: boolean;
  runTimeSeconds: number;
  shardsCollected: number;
  shardsTotal: number;
  onToggleMute: () => void;
  onPause: () => void;
}

export function PlayingHud({
  muted,
  zoneLabel,
  zoneLabelVisible,
  checkpointBannerVisible,
  runTimeSeconds,
  shardsCollected,
  shardsTotal,
  onToggleMute,
  onPause,
}: PlayingHudProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top perimeter cluster */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col items-start gap-2">
          <div
            className="border-2 border-[#2c4560] bg-[#1b2838]/90 px-3.5 py-2"
            style={{ boxShadow: '0 0 0 2px #0a0e14' }}
          >
            <div className="flex items-center gap-2.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                <rect x="0" y="0" width="14" height="14" fill="#0a0e14" />
                <rect x="1" y="1" width="12" height="12" fill="#2c4560" />
                <rect x="3" y="3" width="8" height="8" fill="#1b2838" />
                <rect x="4" y="5" width="6" height="3" fill="#39ff8f" />
              </svg>
              <span className="font-pixel text-xs font-bold tracking-wider text-[#27e0ff] sm:text-sm">
                GRAPPLE SHAFT
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              data-testid="speedrun-timer"
              aria-label="Run timer"
              className="flex h-8 items-center border-2 border-[#2c4560] bg-[#1b2838]/90 px-3"
              style={{ boxShadow: '0 0 0 2px #0a0e14' }}
            >
              <span className="font-code text-xs leading-none font-semibold tracking-wider text-[#39ff8f] tabular-nums sm:text-sm">
                {formatSpeedrunTime(runTimeSeconds)}
              </span>
            </div>

            <div
              data-testid="shard-counter"
              aria-label="Energy shards collected"
              className="flex h-8 items-center gap-1.5 border-2 border-[#2c4560] bg-[#1b2838]/90 px-3"
              style={{ boxShadow: '0 0 0 2px #0a0e14' }}
            >
              <svg
                width="10"
                height="12"
                viewBox="0 0 10 12"
                fill="none"
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                <rect x="4" y="1" width="2" height="10" fill="#27e0ff" />
                <rect x="2" y="3" width="6" height="6" fill="#27e0ff" />
                <rect x="1" y="5" width="8" height="2" fill="#27e0ff" />
                <rect x="3" y="3" width="2" height="3" fill="#ffffff" />
              </svg>
              <span className="font-code text-xs font-semibold tracking-wider text-[#27e0ff] tabular-nums sm:text-sm">
                SHARDS {shardsCollected}/{shardsTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Top-right utility controls */}
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="font-code hidden text-xs tracking-wider text-[#8ca1b8] sm:inline">
            P / Esc Pause · M Mute
          </span>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="flex h-10 w-10 cursor-pointer items-center justify-center border-2 border-[#2c4560] bg-[#1b2838]/95 text-[#27e0ff] transition-colors duration-150 hover:border-[#27e0ff] hover:bg-[#2c4560] focus-visible:outline-2 focus-visible:outline-[#39ff8f]"
            style={{ boxShadow: '0 0 0 2px #0a0e14' }}
          >
            {muted ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                <rect x="2" y="6" width="3" height="6" fill="currentColor" />
                <rect x="5" y="4" width="2" height="10" fill="currentColor" />
                <rect x="7" y="2" width="2" height="14" fill="currentColor" />
                <rect x="11" y="5" width="2" height="2" fill="#ff5a2b" />
                <rect x="15" y="5" width="2" height="2" fill="#ff5a2b" />
                <rect x="13" y="7" width="2" height="4" fill="#ff5a2b" />
                <rect x="11" y="11" width="2" height="2" fill="#ff5a2b" />
                <rect x="15" y="11" width="2" height="2" fill="#ff5a2b" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
                shapeRendering="crispEdges"
              >
                <rect x="2" y="6" width="3" height="6" fill="currentColor" />
                <rect x="5" y="4" width="2" height="10" fill="currentColor" />
                <rect x="7" y="2" width="2" height="14" fill="currentColor" />
                <rect x="11" y="6" width="2" height="6" fill="#39ff8f" />
                <rect x="14" y="4" width="2" height="10" fill="#39ff8f" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause game (P or Escape)"
            title="Pause (P / Esc)"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="flex h-10 w-10 cursor-pointer items-center justify-center border-2 border-[#2c4560] bg-[#1b2838]/95 text-[#39ff8f] transition-colors duration-150 hover:border-[#39ff8f] hover:bg-[#2c4560] focus-visible:outline-2 focus-visible:outline-[#39ff8f]"
            style={{ boxShadow: '0 0 0 2px #0a0e14' }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              shapeRendering="crispEdges"
            >
              <rect x="3" y="2" width="3" height="12" fill="currentColor" />
              <rect x="10" y="2" width="3" height="12" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Small on-screen zone entry banner (fades in/out) */}
      <div
        data-testid="zone-label"
        aria-live="polite"
        className={`pointer-events-none fixed left-1/2 top-28 -translate-x-1/2 text-center transition-opacity duration-500 sm:top-20 ${
          zoneLabelVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="border-b-2 border-[#39ff8f] bg-[#0a0e14]/75 px-4 py-1.5"
          style={{ boxShadow: '0 2px 12px rgba(10, 14, 20, 0.7)' }}
        >
          <span className="font-pixel text-xs font-bold tracking-[0.2em] text-[#39ff8f] sm:text-sm">
            {zoneLabel}
          </span>
        </div>
      </div>

      {/* Brief CHECKPOINT confirmation pop-up (fades in/out like zone labels) */}
      <div
        data-testid="checkpoint-label"
        aria-live="polite"
        className={`pointer-events-none fixed left-1/2 -translate-x-1/2 text-center transition-opacity duration-500 ${
          zoneLabelVisible ? 'top-40 sm:top-32' : 'top-28 sm:top-20'
        } ${checkpointBannerVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div
          className="border-b-2 border-[#39ff8f] bg-[#0a0e14]/75 px-4 py-1.5"
          style={{ boxShadow: '0 2px 12px rgba(10, 14, 20, 0.7)' }}
        >
          <span className="font-pixel text-xs font-bold tracking-[0.2em] text-[#39ff8f] sm:text-sm">
            CHECKPOINT
          </span>
        </div>
      </div>
    </div>
  );
}

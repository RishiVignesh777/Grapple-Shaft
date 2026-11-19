interface WinOverlayProps {
  onRestart: () => void;
}

export function WinOverlay({ onRestart }: WinOverlayProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="win-heading"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#0a0e14]/80 p-4"
    >
      <div
        className="w-full max-w-md border-2 border-[#39ff8f] bg-[#1b2838] p-8 text-center"
        style={{
          boxShadow:
            '0 0 0 3px #0a0e14, 0 0 32px rgba(57, 255, 143, 0.25)',
        }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
          className="mx-auto mb-4"
          shapeRendering="crispEdges"
        >
          <rect x="2" y="1" width="2" height="16" fill="#3d5e80" />
          <rect x="4" y="2" width="11" height="7" fill="#39ff8f" />
          <rect x="6" y="4" width="3" height="3" fill="#0a0e14" />
          <rect x="11" y="4" width="2" height="3" fill="#27e0ff" />
          <rect x="0" y="15" width="6" height="2" fill="#2c4560" />
        </svg>

        <h2
          id="win-heading"
          className="animate-title-glow font-pixel text-3xl font-bold tracking-wider text-[#39ff8f] sm:text-4xl"
        >
          FACILITY CLEARED
        </h2>

        <p className="font-ui mt-3 text-sm text-[#c6d7eb]">
          All facility sectors traversed. Core exit reached.
        </p>

        <button
          type="button"
          data-start="true"
          onClick={onRestart}
          className="animate-prompt-pulse font-pixel mt-7 cursor-pointer border-2 border-[#27e0ff] bg-[#0a0e14] px-6 py-3.5 text-sm font-bold tracking-wider text-[#27e0ff] transition-transform duration-150 hover:scale-[1.03] hover:border-[#39ff8f] hover:bg-[#2c4560] hover:text-[#39ff8f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39ff8f] active:scale-[0.98]"
          style={{
            boxShadow: '0 0 0 2px #0a0e14, 0 0 16px rgba(39, 224, 255, 0.2)',
          }}
        >
          Press SPACE to run it again
        </button>
      </div>
    </div>
  );
}

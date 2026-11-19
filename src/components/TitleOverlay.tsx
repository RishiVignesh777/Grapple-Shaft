interface TitleOverlayProps {
  onStart: () => void;
}

export function TitleOverlay({ onStart }: TitleOverlayProps) {
  return (
    <main
      aria-label="Start screen"
      className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-between px-6 py-10 sm:py-14"
      style={{
        background:
          'radial-gradient(circle at 50% 38%, rgba(10, 14, 20, 0.2) 0%, rgba(10, 14, 20, 0.72) 78%)',
      }}
    >
      {/* Upper-center calm negative space for title lockup & primary action */}
      <div className="pointer-events-auto mt-4 flex w-full max-w-2xl flex-col items-center text-center sm:mt-8">
        {/* Bespoke inline pixel-stepped SVG grapple emblem */}
        <svg
          width="48"
          height="32"
          viewBox="0 0 24 16"
          fill="none"
          aria-hidden="true"
          className="mb-4"
          shapeRendering="crispEdges"
        >
          <rect x="10" y="0" width="4" height="2" fill="#27e0ff" />
          <rect x="8" y="2" width="8" height="2" fill="#2c4560" />
          <rect x="11" y="4" width="2" height="6" fill="#39ff8f" />
          <rect x="4" y="6" width="4" height="2" fill="#27e0ff" />
          <rect x="16" y="6" width="4" height="2" fill="#27e0ff" />
          <rect x="2" y="8" width="2" height="4" fill="#39ff8f" />
          <rect x="20" y="8" width="2" height="4" fill="#39ff8f" />
          <rect x="9" y="10" width="6" height="4" fill="#1b2838" />
          <rect x="10" y="11" width="4" height="2" fill="#39ff8f" />
        </svg>

        <h1 className="animate-title-glow font-pixel text-4xl font-bold tracking-[0.08em] text-[#39ff8f] sm:text-6xl">
          GRAPPLE SHAFT
        </h1>

        <p className="font-ui mt-4 max-w-md text-sm font-medium tracking-wide text-[#c6d7eb] sm:text-base">
          Navigate deep sci-fi facility shafts with precision pixel grappling.
        </p>

        <button
          type="button"
          data-start="true"
          onClick={onStart}
          className="animate-prompt-pulse font-pixel mt-8 cursor-pointer border-2 border-[#27e0ff] bg-[#1b2838] px-7 py-3.5 text-sm font-bold tracking-wider text-[#27e0ff] transition-transform duration-150 hover:scale-[1.03] hover:bg-[#2c4560] hover:text-[#39ff8f] hover:border-[#39ff8f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39ff8f] active:scale-[0.98] sm:text-base"
          style={{
            boxShadow:
              '0 0 0 2px #0a0e14, 0 0 18px rgba(39, 224, 255, 0.25)',
          }}
        >
          Press SPACE to start
        </button>

        {/* Single flat control-hint line in calm dark negative space */}
        <p className="font-code mt-6 text-xs tracking-wider text-[#8ca1b8] sm:text-sm">
          Space / Enter Start · Esc Pause · M Mute
        </p>
      </div>
    </main>
  );
}

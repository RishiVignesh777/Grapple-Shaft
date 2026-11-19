interface PauseModalProps {
  onResume: () => void;
  onReturnTitle: () => void;
}

export function PauseModal({ onResume, onReturnTitle }: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-heading"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#0a0e14]/75 p-4"
    >
      <div
        className="w-full max-w-sm border-2 border-[#2c4560] bg-[#1b2838] p-6 text-center"
        style={{
          boxShadow: '0 0 0 3px #0a0e14, 0 16px 40px rgba(0, 0, 0, 0.7)',
        }}
      >
        <h2
          id="pause-heading"
          className="font-pixel text-2xl font-bold tracking-wider text-[#39ff8f]"
        >
          PAUSED
        </h2>
        <p className="font-ui mt-2 text-sm text-[#a6bbd1]">
          Facility shell loop suspended.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="font-pixel cursor-pointer border-2 border-[#39ff8f] bg-[#39ff8f] px-5 py-3 text-sm font-bold tracking-wide text-[#0a0e14] transition-colors duration-150 hover:bg-[#6effae] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27e0ff]"
          >
            Resume
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="font-pixel cursor-pointer border-2 border-[#2c4560] bg-[#0a0e14] px-5 py-3 text-sm font-bold tracking-wide text-[#27e0ff] transition-colors duration-150 hover:border-[#27e0ff] hover:bg-[#141d29] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39ff8f]"
          >
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}

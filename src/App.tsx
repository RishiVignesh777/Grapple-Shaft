import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { PauseModal } from './components/PauseModal';
import { PlayingHud } from './components/PlayingHud';
import { TitleOverlay } from './components/TitleOverlay';
import { soundEngine } from './game/sound';
import {
  resolveInitialScreenState,
  transitionGameState,
} from './game/stateMachine';
import type { GameScreenState } from './game/types';

export default function App() {
  const [screenState, setScreenState] = useState<GameScreenState>(() =>
    resolveInitialScreenState(
      typeof window !== 'undefined' ? window.location.search : '',
    ),
  );
  const [muted, setMuted] = useState<boolean>(false);
  const keysPressedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  const handleStart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysPressedRef.current.clear();
    soundEngine.playStartChime();
    setScreenState((prev) => transitionGameState(prev, 'START'));
  }, []);

  const handlePause = useCallback(() => {
    keysPressedRef.current.clear();
    soundEngine.playPauseToggle(true);
    setScreenState((prev) => transitionGameState(prev, 'PAUSE'));
  }, []);

  const handleResume = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysPressedRef.current.clear();
    soundEngine.playPauseToggle(false);
    setScreenState((prev) => transitionGameState(prev, 'RESUME'));
  }, []);

  const handleReturnTitle = useCallback(() => {
    keysPressedRef.current.clear();
    setScreenState((prev) => transitionGameState(prev, 'RETURN_TITLE'));
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      keysPressedRef.current.add(event.code);

      if (
        screenState === 'title' &&
        (event.code === 'Space' || event.code === 'Enter')
      ) {
        event.preventDefault();
        handleStart();
        return;
      }

      if (
        (screenState === 'playing' || screenState === 'paused') &&
        (event.code === 'Escape' || event.code === 'KeyP')
      ) {
        event.preventDefault();
        const nextPaused = screenState === 'playing';
        soundEngine.playPauseToggle(nextPaused);
        setScreenState((prev) => transitionGameState(prev, 'TOGGLE_PAUSE'));
        return;
      }

      if (event.code === 'KeyM') {
        event.preventDefault();
        handleToggleMute();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keysPressedRef.current.delete(event.code);
    };

    const clearHeldKeys = () => {
      keysPressedRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeldKeys);
    document.addEventListener('visibilitychange', clearHeldKeys);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeldKeys);
      document.removeEventListener('visibilitychange', clearHeldKeys);
    };
  }, [screenState, handleStart, handleToggleMute]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0e14]">
      <GameCanvas screenState={screenState} />

      {screenState === 'title' && <TitleOverlay onStart={handleStart} />}

      {screenState === 'playing' && (
        <PlayingHud
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
        />
      )}

      {screenState === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onReturnTitle={handleReturnTitle}
        />
      )}
    </div>
  );
}

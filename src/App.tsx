import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { PauseModal } from './components/PauseModal';
import { PlayingHud } from './components/PlayingHud';
import { TitleOverlay } from './components/TitleOverlay';
import { WinOverlay } from './components/WinOverlay';
import { soundEngine } from './game/sound';
import { loadBestTime, updateBestTimeOnWin } from './game/speedrunTimer';
import {
  resolveInitialScreenState,
  transitionGameState,
} from './game/stateMachine';
import type { GameScreenState, ZoneName } from './game/types';

export default function App() {
  const [screenState, setScreenState] = useState<GameScreenState>(() =>
    resolveInitialScreenState(
      typeof window !== 'undefined' ? window.location.search : '',
    ),
  );
  const [runId, setRunId] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [zoneLabel, setZoneLabel] = useState<ZoneName>('ACCESS CORRIDOR');
  const [zoneLabelVisible, setZoneLabelVisible] = useState<boolean>(false);
  const [runTimeSeconds, setRunTimeSeconds] = useState<number>(0);
  const [finalTimeSeconds, setFinalTimeSeconds] = useState<number>(0);
  const [bestTimeSeconds, setBestTimeSeconds] = useState<number | null>(() =>
    loadBestTime(),
  );
  const [isNewBest, setIsNewBest] = useState<boolean>(false);
  const keysPressedRef = useRef<Set<string>>(new Set());
  const zoneEnteredRef = useRef<boolean>(false);
  const zoneTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  const triggerZoneBanner = useCallback((zone: ZoneName) => {
    if (zoneTimerRef.current !== null) {
      window.clearTimeout(zoneTimerRef.current);
      zoneTimerRef.current = null;
    }
    setZoneLabel(zone);
    setZoneLabelVisible(true);
    zoneTimerRef.current = window.setTimeout(() => {
      setZoneLabelVisible(false);
      zoneTimerRef.current = null;
    }, 2400);
  }, []);

  useEffect(() => {
    if (screenState === 'playing' && !zoneEnteredRef.current) {
      zoneEnteredRef.current = true;
      const enterRaf = window.requestAnimationFrame(() => {
        triggerZoneBanner('ACCESS CORRIDOR');
      });
      return () => window.cancelAnimationFrame(enterRaf);
    }
    if (screenState === 'title') {
      zoneEnteredRef.current = false;
      setZoneLabelVisible(false);
      if (zoneTimerRef.current !== null) {
        window.clearTimeout(zoneTimerRef.current);
        zoneTimerRef.current = null;
      }
    }
  }, [screenState, triggerZoneBanner]);

  useEffect(() => {
    return () => {
      if (zoneTimerRef.current !== null) {
        window.clearTimeout(zoneTimerRef.current);
      }
    };
  }, []);

  const handleStart = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysPressedRef.current.clear();
    setRunTimeSeconds(0);
    setIsNewBest(false);
    soundEngine.playStartChime();
    setScreenState((prev) => transitionGameState(prev, 'START'));
  }, []);

  const handleWin = useCallback((completionSeconds: number) => {
    keysPressedRef.current.clear();
    setZoneLabelVisible(false);
    const result = updateBestTimeOnWin(completionSeconds);
    setRunTimeSeconds(result.currentTime);
    setFinalTimeSeconds(result.currentTime);
    setBestTimeSeconds(result.bestTime);
    setIsNewBest(result.isNewBest);
    setScreenState((prev) => transitionGameState(prev, 'WIN'));
  }, []);

  const handleRestartRun = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysPressedRef.current.clear();
    zoneEnteredRef.current = false;
    setRunTimeSeconds(0);
    setIsNewBest(false);
    setRunId((id) => id + 1);
    soundEngine.playStartChime();
    setScreenState((prev) => transitionGameState(prev, 'RESTART_RUN'));
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
    setRunTimeSeconds(0);
    setIsNewBest(false);
    setRunId((id) => id + 1);
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
        screenState === 'won' &&
        (event.code === 'Space' || event.code === 'Enter')
      ) {
        event.preventDefault();
        handleRestartRun();
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
  }, [screenState, handleStart, handleRestartRun, handleToggleMute]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0e14]">
      <GameCanvas
        screenState={screenState}
        runId={runId}
        onZoneEnter={triggerZoneBanner}
        onRunTimeChange={setRunTimeSeconds}
        onWin={handleWin}
      />

      {screenState === 'title' && <TitleOverlay onStart={handleStart} />}

      {screenState === 'playing' && (
        <PlayingHud
          muted={muted}
          zoneLabel={zoneLabel}
          zoneLabelVisible={zoneLabelVisible}
          runTimeSeconds={runTimeSeconds}
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

      {screenState === 'won' && (
        <WinOverlay
          finalTimeSeconds={finalTimeSeconds}
          bestTimeSeconds={bestTimeSeconds}
          isNewBest={isNewBest}
          onRestart={handleRestartRun}
        />
      )}
    </div>
  );
}

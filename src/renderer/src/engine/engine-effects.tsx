import { useEffect } from 'react';
import { useAutoReconnect } from '@/hooks/utils/use-auto-reconnect';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useIpcHandlers } from '@/hooks/utils/use-ipc-handlers';
import { audioManager } from '@/utils/audio-manager';

/**
 * Non-visual engine side effects. Mount exactly once, inside the provider tree, on every
 * screen — including screens that do not show the avatar.
 * useAudioTask() is deliberately NOT mounted here: WebSocketHandler already mounts it, and a
 * second mount makes `frontend-playback-complete` fire twice.
 */
export function EngineEffects(): null {
  useIpcHandlers();
  useInterrupt();
  useAutoReconnect(window.api === undefined);

  // No "reset to expression 0 on idle" here any more: the look context owns her face.
  // (Expression 0 is an arbitrary file — on Beach it is the colour preset.)

  // iOS: sound needs one user gesture. Any tap or key press unlocks the shared player.
  useEffect(() => {
    const unlock = () => audioManager.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  return null;
}

import { useEffect } from 'react';
import { useAiState, AiStateEnum } from '@/context/ai-state-context';
import { useLive2DConfig } from '@/context/live2d-config-context';
import { useLive2DExpression } from '@/hooks/canvas/use-live2d-expression';
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
  const { aiState } = useAiState();
  const { modelInfo } = useLive2DConfig();
  const { resetExpression } = useLive2DExpression();

  useIpcHandlers();
  useInterrupt();
  useAutoReconnect(window.api === undefined);

  useEffect(() => {
    if (aiState !== AiStateEnum.IDLE) return;
    const adapter = (window as any).getLAppAdapter?.();
    if (adapter) resetExpression(adapter, modelInfo);
  }, [aiState, modelInfo, resetExpression]);

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

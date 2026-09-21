import { useEffect } from 'react';
import { useAiState, AiStateEnum } from '@/context/ai-state-context';
import { useLive2DConfig } from '@/context/live2d-config-context';
import { useLive2DExpression } from '@/hooks/canvas/use-live2d-expression';
import { useInterrupt } from '@/hooks/utils/use-interrupt';
import { useIpcHandlers } from '@/hooks/utils/use-ipc-handlers';

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

  useEffect(() => {
    if (aiState !== AiStateEnum.IDLE) return;
    const adapter = (window as any).getLAppAdapter?.();
    if (adapter) resetExpression(adapter, modelInfo);
  }, [aiState, modelInfo, resetExpression]);

  return null;
}

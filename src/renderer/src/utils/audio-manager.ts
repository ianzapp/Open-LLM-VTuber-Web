// 44-byte WAV header + 2 silent 8-bit samples.
const SILENT_WAV = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA==';

/**
 * Global audio manager for handling audio playback and interruption
 * This ensures all components share the same audio reference
 */
export class AudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private currentModel: any | null = null;
  private player: HTMLAudioElement | null = null;
  private unlocked = false;
  private currentOnStop: (() => void) | null = null;
  private onStopAll: (() => void) | null = null;

  /** The one audio element every sentence plays through (iOS unlocks per element). */
  getPlayer(): HTMLAudioElement {
    if (!this.player) {
      this.player = new Audio();
      this.player.preload = 'auto';
      this.player.setAttribute('playsinline', '');
    }
    return this.player;
  }

  isUnlocked(): boolean { return this.unlocked; }

  /** Call from a user gesture. Plays a moment of silence so later play() calls are allowed. */
  unlock(): void {
    if (this.unlocked || this.currentAudio) return;
    const player = this.getPlayer();
    player.src = SILENT_WAV;
    player.play().then(() => {
      this.unlocked = true;
      // A real sentence may have taken the element over in the meantime: leave it alone.
      if (player.src === SILENT_WAV) player.pause();
    }).catch(() => { /* not a gesture after all; the next one tries again */ });
  }

  /** Real audio played: the element is certainly unlocked. */
  markUnlocked(): void { this.unlocked = true; }

  /** A real sentence hit NotAllowedError: the element is locked again (e.g. after backgrounding on iOS). */
  markLocked(): void { this.unlocked = false; }

  /**
   * Set a callback to run whenever audio stops (playback stop or interrupt).
   */
  setOnStopAll(cb: (() => void) | null): void { this.onStopAll = cb; }

  /**
   * Set the current playing audio
   */
  setCurrentAudio(audio: HTMLAudioElement, model: any, onStop?: () => void) {
    this.currentAudio = audio;
    this.currentModel = model;
    this.currentOnStop = onStop ?? null;
  }

  /**
   * Stop current audio playback and lip sync
   */
  stopCurrentAudioAndLipSync() {
    if (this.currentAudio) {
      console.log('[AudioManager] Stopping current audio and lip sync');
      const audio = this.currentAudio;

      // Stop audio playback
      audio.pause();
      // The shared player keeps its src: blanking it fires an async 'error' that could land on the next sentence.
      if (audio !== this.player) { audio.src = ''; audio.load(); }

      // Stop Live2D lip sync
      const model = this.currentModel;
      if (model && model._wavFileHandler) {
        try {
          // Release PCM data to stop lip sync calculation in update()
          model._wavFileHandler.releasePcmData();
          console.log('[AudioManager] Called _wavFileHandler.releasePcmData()');

          // Additional reset of state variables as fallback
          model._wavFileHandler._lastRms = 0.0;
          model._wavFileHandler._sampleOffset = 0;
          model._wavFileHandler._userTimeSeconds = 0.0;
          console.log('[AudioManager] Also reset _lastRms, _sampleOffset, _userTimeSeconds as fallback');
        } catch (e) {
          console.error('[AudioManager] Error stopping/resetting wavFileHandler:', e);
        }
      } else if (model) {
        console.warn('[AudioManager] Current model does not have _wavFileHandler to stop/reset.');
      } else {
        console.log('[AudioManager] No associated model found to stop lip sync.');
      }

      // Clear references
      this.currentAudio = null;
      this.currentModel = null;
      const onStop = this.currentOnStop;
      this.currentOnStop = null;
      onStop?.();
    } else {
      console.log('[AudioManager] No current audio playing to stop.');
    }
    this.onStopAll?.();
  }

  /**
   * Clear the current audio reference (called when audio ends naturally)
   */
  clearCurrentAudio(audio: HTMLAudioElement) {
    if (this.currentAudio === audio) {
      this.currentAudio = null;
      this.currentModel = null;
      this.currentOnStop = null;
    }
  }

  /**
   * Check if there's currently playing audio
   */
  hasCurrentAudio(): boolean {
    return this.currentAudio !== null;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

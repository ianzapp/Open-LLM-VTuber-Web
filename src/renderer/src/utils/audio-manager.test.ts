import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from './audio-manager';

class FakeAudio {
  src = '';
  preload = '';
  setAttribute = vi.fn();
  pause = vi.fn();
  load = vi.fn();
  play = vi.fn(() => Promise.resolve());
}

beforeEach(() => {
  (globalThis as any).Audio = FakeAudio;
});

describe('AudioManager', () => {
  it('getPlayer() returns the same element twice', () => {
    const manager = new AudioManager();
    const first = manager.getPlayer();
    const second = manager.getPlayer();
    expect(first).toBe(second);
  });

  it('unlock() sets the silent src, plays, and marks unlocked once resolved', async () => {
    const manager = new AudioManager();
    manager.unlock();
    const player = manager.getPlayer() as unknown as FakeAudio;
    expect(player.src).toContain('data:audio/wav;base64,');
    expect(player.play).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.isUnlocked()).toBe(true);
    expect(player.pause).toHaveBeenCalledTimes(1);

    // A second unlock() does not call play() again.
    manager.unlock();
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it('markLocked() makes unlock() repeatable', async () => {
    const manager = new AudioManager();
    manager.unlock();
    const player = manager.getPlayer() as unknown as FakeAudio;
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.isUnlocked()).toBe(true);

    manager.markLocked();
    expect(manager.isUnlocked()).toBe(false);

    manager.unlock();
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('unlock() does nothing while there is current audio', () => {
    const manager = new AudioManager();
    const player = manager.getPlayer();
    manager.setCurrentAudio(player, {});
    manager.unlock();
    expect((player as unknown as FakeAudio).play).not.toHaveBeenCalled();
  });

  it('if play() rejects, isUnlocked() stays false and nothing throws', async () => {
    const manager = new AudioManager();
    const player = manager.getPlayer() as unknown as FakeAudio;
    player.play = vi.fn(() => Promise.reject(new Error('nope')));
    expect(() => manager.unlock()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.isUnlocked()).toBe(false);
  });

  it('stopCurrentAudioAndLipSync() on the shared player keeps src, calls onStop once', () => {
    const manager = new AudioManager();
    const player = manager.getPlayer() as unknown as FakeAudio;
    const onStop = vi.fn();
    manager.setCurrentAudio(player as unknown as HTMLAudioElement, {}, onStop);
    manager.stopCurrentAudioAndLipSync();
    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.src).toBe('');
    expect(player.load).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(manager.hasCurrentAudio()).toBe(false);
  });

  it('stopCurrentAudioAndLipSync() on a non-shared element blanks src and calls load()', () => {
    const manager = new AudioManager();
    const other = new FakeAudio();
    other.src = 'data:audio/wav;base64,abc';
    manager.setCurrentAudio(other as unknown as HTMLAudioElement, {});
    manager.stopCurrentAudioAndLipSync();
    expect(other.pause).toHaveBeenCalledTimes(1);
    expect(other.src).toBe('');
    expect(other.load).toHaveBeenCalledTimes(1);
  });

  it('clearCurrentAudio(audio) drops the onStop so a later stop does not call it', () => {
    const manager = new AudioManager();
    const player = manager.getPlayer() as unknown as FakeAudio;
    const onStop = vi.fn();
    manager.setCurrentAudio(player as unknown as HTMLAudioElement, {}, onStop);
    manager.clearCurrentAudio(player as unknown as HTMLAudioElement);
    // Re-set current audio without an onStop, then stop it.
    manager.setCurrentAudio(player as unknown as HTMLAudioElement, {});
    manager.stopCurrentAudioAndLipSync();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('setOnStopAll() runs callback when stop is called (with and without current audio)', () => {
    const manager = new AudioManager();
    const player = manager.getPlayer() as unknown as FakeAudio;
    const onStopAll = vi.fn();
    manager.setOnStopAll(onStopAll);

    // Test with current audio
    manager.setCurrentAudio(player as unknown as HTMLAudioElement, {});
    manager.stopCurrentAudioAndLipSync();
    expect(onStopAll).toHaveBeenCalledTimes(1);

    // Test without current audio
    manager.stopCurrentAudioAndLipSync();
    expect(onStopAll).toHaveBeenCalledTimes(2);
  });

  it('setOnStopAll(null) disables the callback', () => {
    const manager = new AudioManager();
    const player = manager.getPlayer() as unknown as FakeAudio;
    const onStopAll = vi.fn();
    manager.setOnStopAll(onStopAll);
    manager.setOnStopAll(null);
    manager.setCurrentAudio(player as unknown as HTMLAudioElement, {});
    manager.stopCurrentAudioAndLipSync();
    expect(onStopAll).not.toHaveBeenCalled();
  });
});

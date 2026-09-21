import { afterEach, describe, expect, it, vi } from 'vitest';
import { notify, setNotifySink } from './notify';

afterEach(() => setNotifySink(null));

describe('notify', () => {
  it('delivers to the registered sink', () => {
    const sink = vi.fn();
    setNotifySink(sink);
    notify('error', 'boom', 'details');
    expect(sink).toHaveBeenCalledWith({ level: 'error', message: 'boom', description: 'details' });
  });

  it('falls back to the console when no sink is registered', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    notify('warning', 'careful');
    expect(spy).toHaveBeenCalledWith('[warning] careful');
    spy.mockRestore();
  });

  it('turns an undefined message into an empty string', () => {
    const sink = vi.fn();
    setNotifySink(sink);
    notify('error', undefined);
    expect(sink).toHaveBeenCalledWith({ level: 'error', message: '', description: undefined });
  });

  it('survives a throwing sink and logs the failure', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setNotifySink(() => { throw new Error('sink broke'); });
    expect(() => notify('info', 'x')).not.toThrow();
    expect(spy).toHaveBeenCalledWith('notify sink failed:', expect.any(Error));
    spy.mockRestore();
  });
});

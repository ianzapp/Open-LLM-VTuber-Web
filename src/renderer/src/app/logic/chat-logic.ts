export type UiMode = 'voice' | 'chat';

const MODE_KEY = 'companion.mode';

type ReadStore = Pick<Storage, 'getItem'>;
type WriteStore = Pick<Storage, 'setItem'>;

export function loadMode(storage: ReadStore): UiMode {
  try {
    return storage.getItem(MODE_KEY) === 'chat' ? 'chat' : 'voice';
  } catch {
    return 'voice';
  }
}

export function saveMode(storage: WriteStore, mode: UiMode): void {
  try {
    storage.setItem(MODE_KEY, mode);
  } catch {
    // private browsing / blocked storage: the mode just is not remembered
  }
}

/** Keep following new messages only while the reader is at (or near) the bottom. */
export function isNearBottom(scrollTop: number, clientHeight: number, scrollHeight: number, slack = 48): boolean {
  return scrollHeight - (scrollTop + clientHeight) <= slack;
}

/** Height of the on-screen keyboard, from window.innerHeight and the visual viewport. */
export function keyboardInset(innerHeight: number, vvHeight: number, vvOffsetTop: number): number {
  return Math.max(0, Math.round(innerHeight - vvHeight - vvOffsetTop));
}

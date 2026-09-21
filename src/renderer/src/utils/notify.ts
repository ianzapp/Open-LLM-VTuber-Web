export type NotifyLevel = 'info' | 'success' | 'warning' | 'error';

export interface Notice {
  level: NotifyLevel;
  message: string;
  description?: string;
}

type Sink = (notice: Notice) => void;

let sink: Sink | null = null;

/** The UI layer registers how notices are shown; the engine only calls notify(). */
export function setNotifySink(next: Sink | null): void {
  sink = next;
}

export function notify(level: NotifyLevel, message: string | undefined, description?: string): void {
  const notice: Notice = { level, message: message ?? '', description };
  if (!sink) {
    console.warn(`[${level}] ${notice.message}`);
    return;
  }
  try {
    sink(notice);
  } catch (error) {
    console.error('notify sink failed:', error);
  }
}

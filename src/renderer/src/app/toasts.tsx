import { useEffect, useState } from 'react';
import { setNotifySink, type Notice } from '@/utils/notify';

interface Shown extends Notice { id: number }

export function Toasts(): JSX.Element {
  const [items, setItems] = useState<Shown[]>([]);

  useEffect(() => {
    let next = 1;
    setNotifySink((notice) => {
      if (notice.level === 'success') return; // fires on every card tap / reconnect
      const id = next++;
      setItems((cur) => [...cur.slice(-2), { ...notice, id }]);
      // Problems stay long enough to be read; plain notices go quickly.
      const ttl = notice.level === 'info' ? 2500 : 12000;
      window.setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), ttl);
    });
    return () => setNotifySink(null);
  }, []);

  return (
    <div className="cm-toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="cm-toast" data-level={t.level}>
          {t.message}{t.description ? ` — ${t.description}` : ''}
        </div>
      ))}
    </div>
  );
}

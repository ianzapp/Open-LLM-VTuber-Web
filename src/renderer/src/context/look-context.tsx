import { createContext, useContext } from 'react';
import { useLookState, type LookApi } from '@/hooks/canvas/use-look';

const LookContext = createContext<LookApi | null>(null);

export function LookProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const value = useLookState();
  return <LookContext.Provider value={value}>{children}</LookContext.Provider>;
}

export function useLook(): LookApi {
  const context = useContext(LookContext);
  if (!context) throw new Error('useLook must be used within a LookProvider');
  return context;
}

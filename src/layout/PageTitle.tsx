import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { PageTitleContext } from './pageTitleContext';

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState<string | null>(null);
  const setTitle = useCallback((next: string | null) => {
    setTitleState(next);
  }, []);
  const value = useMemo(
    () => ({ title, setTitle }),
    [title, setTitle],
  );

  return (
    <PageTitleContext.Provider value={value}>
      {children}
    </PageTitleContext.Provider>
  );
}

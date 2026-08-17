import { useContext, useEffect } from 'react';
import { PageTitleContext } from './pageTitleContext';

export function usePageTitle(title: string | undefined): void {
  const setTitle = useContext(PageTitleContext)?.setTitle;

  useEffect(() => {
    if (!setTitle) {
      return;
    }
    setTitle(title ?? null);
    return () => setTitle(null);
  }, [setTitle, title]);
}

export function usePageTitleValue(): string | null {
  return useContext(PageTitleContext)?.title ?? null;
}

import { createContext } from 'react';

export interface PageTitleContextValue {
  title: string | null;
  setTitle: (title: string | null) => void;
}

export const PageTitleContext = createContext<PageTitleContextValue | null>(
  null,
);

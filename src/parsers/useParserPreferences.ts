import { useCallback, useState } from 'react';
import { getDisabledParserIds, setParserEnabled } from './preferences';
import { listParsers } from './registry';

export function useParserPreferences() {
  const [disabled, setDisabled] = useState(() => getDisabledParserIds());

  const setEnabled = useCallback((id: string, enabled: boolean) => {
    setParserEnabled(id, enabled);
    setDisabled(getDisabledParserIds());
  }, []);

  return {
    parsers: listParsers(),
    isEnabled: (id: string) => !disabled.has(id),
    setEnabled,
  };
}

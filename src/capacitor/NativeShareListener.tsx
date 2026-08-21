import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeShareIntent } from './shareIntent';
import { shareQueryToSearch } from './shareQuery';

export function NativeShareListener() {
  const navigate = useNavigate();

  useEffect(() => {
    return subscribeShareIntent((query) => {
      const search = shareQueryToSearch(query);
      navigate(search ? `/share?${search}` : '/share');
    });
  }, [navigate]);

  return null;
}

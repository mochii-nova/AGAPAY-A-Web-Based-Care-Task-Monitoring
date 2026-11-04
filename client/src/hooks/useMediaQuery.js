import { useEffect, useState } from 'react';

// true / false for a CSS media query, e.g. useMediaQuery('(max-width: 1100px)')
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

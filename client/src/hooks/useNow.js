import { useEffect, useState } from 'react';

// The current time, refreshed every minute (so countdowns stay correct)
export default function useNow(everyMs = 60000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);

  return now;
}

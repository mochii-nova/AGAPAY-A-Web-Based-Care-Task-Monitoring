import { useCallback, useRef, useState } from 'react';

// Busy state for a save button, so a double-click (or Enter pressed twice) can't save twice.
// const [saving, setSaving, startSaving] = useSaving();
//   if (!startSaving()) return;   // false while a save is already running; otherwise marks it as running
//   ... await the request ...
//   setSaving(false);             // in `finally`
// The running flag is checked straight away, before React has drawn the button as disabled.
export default function useSaving() {
  const running = useRef(false);
  const [saving, setState] = useState(false);
  const setSaving = useCallback((on) => {
    running.current = on;
    setState(on);
  }, []);
  const startSaving = useCallback(() => {
    if (running.current) return false;
    setSaving(true);
    return true;
  }, [setSaving]);
  return [saving, setSaving, startSaving];
}

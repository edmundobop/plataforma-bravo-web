import { useRef, useState, useCallback } from 'react';

export default function usePendingAction() {
  const lockRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(async (fn) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
      lockRef.current = false;
    }
  }, []);

  return { pending, run };
}


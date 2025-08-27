'use client';

import { useEffect } from 'react';

export default function ResizeBridge() {
  useEffect(() => {
    const send = () => {
      const h = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        window.innerHeight
      );
      window.parent?.postMessage({ type: 'declassifai:resize', height: h }, '*');
    };

    // Observe size changes
    const ro = new ResizeObserver(() => send());
    ro.observe(document.body);

    // Initial + fallback updates
    window.addEventListener('load', send);
    window.addEventListener('resize', send);
    const tick = setInterval(send, 1000);
    send();

    return () => {
      ro.disconnect();
      window.removeEventListener('load', send);
      window.removeEventListener('resize', send);
      clearInterval(tick);
    };
  }, []);

  // Nothing to render; it just bridges size to the parent
  return null;
}
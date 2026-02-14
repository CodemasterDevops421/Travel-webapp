'use client';

import { useEffect, useState } from 'react';

interface ConfigStatus {
  liteApiConfigured: boolean;
}

export function ConfigStatusBanner() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);

  useEffect(() => {
    fetch('/api/config-status')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ liteApiConfigured: false }));
  }, []);

  if (!status) return null;

  if (!status.liteApiConfigured) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-auto">
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm shadow-lg dark:border-yellow-700 dark:bg-yellow-900/50">
          <p className="font-medium text-yellow-800 dark:text-yellow-200">
            Demo Mode
          </p>
          <p className="text-yellow-700 dark:text-yellow-300">
            LiteAPI not configured. Showing sample data.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to search page with default index
    router.replace('/search?index=logs-events');
  }, [router]);

  return (
    <div className="p-8">
      <p className="text-muted-foreground">Redirecting to search...</p>
    </div>
  );
}

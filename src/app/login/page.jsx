'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
    else if (status === 'unauthenticated') router.replace('/?login=true');
  }, [status, router]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', 'dark');
    return () => {
      try {
        const stored = localStorage.getItem('theme-preference');
        if (stored === 'dark' || stored === 'light') root.setAttribute('data-theme', stored);
        else root.removeAttribute('data-theme');
      } catch {
        root.removeAttribute('data-theme');
      }
    };
  }, []);

  return (
    <div className="landing-loader">
      <div className="spinner" />
    </div>
  );
}

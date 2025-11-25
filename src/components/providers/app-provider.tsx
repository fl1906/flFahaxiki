'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { useEffect } from 'react';
import '@/lib/i18n';

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}
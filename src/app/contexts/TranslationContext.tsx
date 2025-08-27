"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface TranslationContextType {
  t: (key: string) => string;
  currentLanguage: string;
  changeLanguage: (language: 'ko' | 'en' | 'vi' | 'zh' | 'ja' | 'th' | 'fil') => void;
  getCurrentLanguage: () => string;
  getSupportedLanguages: () => string[];
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const useTranslationContext = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslationContext must be used within a TranslationProvider');
  }
  return context;
};

interface TranslationProviderProps {
  children: ReactNode;
}

export const TranslationProvider = ({ children }: TranslationProviderProps) => {
  const translation = useTranslation();

  return (
    <TranslationContext.Provider value={translation}>
      {children}
    </TranslationContext.Provider>
  );
};

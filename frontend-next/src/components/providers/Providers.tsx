"use client";

// Combined providers wrapper for the application
import React from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import DyslexiaProvider from '@/components/providers/DyslexiaProvider';
import { SimpleAuthProvider } from '@/components/providers/SimpleAuthProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DyslexiaProvider>
          <SimpleAuthProvider>
            {children}
          </SimpleAuthProvider>
        </DyslexiaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

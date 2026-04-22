"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from "@/lib/firebase";
import { useAuthStore, type Student, type Teacher } from "@/stores/authStore";

interface AuthContextType {
  currentUser: User | null;
  currentStudent: Student | null;
  currentTeacher: Teacher | null;
  loading: boolean;
  logout: () => Promise<void>;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentStudent, currentTeacher, loadFromLocalStorage } = useAuthStore();

  // Set up listener for auth state changes + load localStorage
  useEffect(() => {
    // Load localStorage auth data
    loadFromLocalStorage();

    // Set up Firebase listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [loadFromLocalStorage]);

  // Sign out function
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    currentUser,
    currentStudent,
    currentTeacher,
    loading,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

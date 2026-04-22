"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "framer-motion";
import { LogIn, ArrowLeft } from "lucide-react";

function StudentLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginStudent, currentStudent } = useAuthStore();

  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [joinCode, setJoinCode] = useState<string | null>(null);

  // Get join code from URL and set class code
  useEffect(() => {
    const code = searchParams.get("join");
    if (code) {
      setJoinCode(code);
      setClassCode(code.toUpperCase());
    }
  }, [searchParams]);

  // If already logged in, redirect
  useEffect(() => {
    if (currentStudent) {
      router.replace("/");
    }
  }, [currentStudent, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (classCode.length !== 6) {
      setError("Class code must be exactly 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      loginStudent(name.trim(), classCode.toUpperCase());
      // Redirect to home page
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full"
      >
        <div className="glass-card rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="text-center pt-8 pb-4 px-6">
            <Link href="/" className="inline-block mb-4">
              <div className="flex items-center justify-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-600 to-amber-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">N</span>
                </div>
                <span className="text-2xl font-black gradient-text">
                  NeuroLex
                </span>
              </div>
            </Link>

            <h1 className="text-3xl font-black text-foreground mt-6 mb-2">
              Student Login
            </h1>
            <p className="text-muted-foreground">
              {joinCode
                ? "Join the classroom"
                : "Enter your name and class code"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-8 space-y-5">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all bg-background text-foreground"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {/* Class Code Input - Only show if NOT joining via link */}
            {!joinCode && (
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Class Code
                </label>
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ABC123"
                  className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all bg-background text-foreground text-center font-semibold tracking-widest"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {classCode.length}/6 characters
                </p>
              </div>
            )}

            {/* Joined via link info */}
            {joinCode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
              >
                <p className="text-sm font-semibold text-emerald-700">
                  ✓ Class Code: <span className="font-mono">{classCode}</span>
                </p>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm font-semibold"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 font-semibold text-white rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Logging in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-5 h-5" />
                  {joinCode ? "Join Classroom" : "Join Class"}
                </span>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 bg-accent/50 border-t border-border">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function StudentLogin() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-violet-300 border-t-violet-600 rounded-full"
          />
        </div>
      }
    >
      <StudentLoginContent />
    </Suspense>
  );
}

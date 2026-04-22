"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "framer-motion";
import { LogIn, ArrowLeft } from "lucide-react";

export default function TeacherLogin() {
  const router = useRouter();
  const { loginTeacher, currentTeacher } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (currentTeacher) {
      router.replace("/");
    }
  }, [currentTeacher, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    setIsLoading(true);

    try {
      loginTeacher(name.trim(), email.trim());
      // Redirect to dashboard
      setTimeout(() => {
        router.push("/teacher-dashboard");
      }, 500);
    } catch (err: any) {
      setError(err.message || "An error occurred");
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
              Teacher Login
            </h1>
            <p className="text-muted-foreground">
              View and manage your class
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
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@school.com"
                className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent transition-all bg-background text-foreground"
                disabled={isLoading}
              />
            </div>

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
              className="w-full py-3 px-4 font-semibold text-white rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
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
                  Access Dashboard
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

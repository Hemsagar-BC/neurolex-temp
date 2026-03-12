// Dashboard page - main hub after login
// Shows welcome message with user name
// Quick action cards: Start New Lecture, Upload Audio, View History
// Recent lectures list (empty state if no lectures)
// Stats cards: Total lectures, Total hours recorded, This week count
// Uses grid layout, responsive design

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Silk from '../components/common/Silk';
import Button from '../components/common/Button';
import AudioUpload from '../components/lecture/AudioUpload';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sparkles } from 'lucide-react';
import { createLecture } from '../services/backendApi';

export default function Dashboard() {
  const { isDyslexicMode, toggleDyslexicMode, isDark } = useTheme();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Get user's first name from display name or email
  const getUserFirstName = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ')[0];
    }
    if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
    return 'Student';
  };

  const userName = getUserFirstName();

  // Handle audio upload completion
  const handleAudioUploadComplete = async (transcription) => {
    try {
      setShowUploadModal(false);

      if (!currentUser?.uid) {
        alert('Please log in to save your recording');
        return;
      }

      // Create lecture with transcription
      const lectureId = await createLecture(currentUser.uid, transcription);

      // Navigate to lecture page which will auto-process
      navigate(`/lecture?id=${lectureId}&autoProcess=true`);

    } catch (error) {
      console.error('Error saving uploaded audio transcription:', error);
      alert('Failed to save transcription. Please try again.');
    }
  };

  return (
    <div className="min-h-screen relative bg-black overflow-hidden">
      {/* Silk Background - Covers entire page */}
      {/* Dark base layer */}
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-black via-blue-950 to-slate-950 pointer-events-none z-0"></div>

      {/* Primary Silk layer - Bright Blue */}
      <div className="fixed inset-0 w-full h-full pointer-events-none opacity-60 z-0">
        <Silk
          speed={2}
          scale={1.2}
          color="#3B82F6"
          noiseIntensity={0.8}
          rotation={0.3}
        />
      </div>

      {/* Secondary Silk layer - Purple */}
      <div className="fixed inset-0 w-full h-full pointer-events-none opacity-40 z-0">
        <Silk
          speed={1.5}
          scale={1}
          color="#8B5CF6"
          noiseIntensity={1.2}
          rotation={-0.2}
        />
      </div>

      {/* Tertiary Silk layer - Cyan */}
      <div className="fixed inset-0 w-full h-full pointer-events-none opacity-30 z-0">
        <Silk
          speed={2.5}
          scale={0.8}
          color="#06B6D4"
          noiseIntensity={1}
          rotation={0.5}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar />

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
          {/* Welcome section with Dyslexic Mode Button */}
          <div className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                Welcome back, {userName}! 👋
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-100 drop-shadow-md">
                Ready to make learning easier today?
              </p>
            </div>

            {/* Dyslexic User Toggle Button */}
            <button
              onClick={toggleDyslexicMode}
              className={`
                flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base
                transition-all duration-300 transform hover:scale-105 shadow-lg flex-shrink-0 touch-target
                ${isDyslexicMode
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-500/50'
                  : 'bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 hover:bg-white/20'
                }
              `}
            >
              <Sparkles className={`w-4 sm:w-5 h-4 sm:h-5 ${isDyslexicMode ? 'animate-pulse' : ''}`} />
              <span className="whitespace-nowrap">{isDyslexicMode ? 'Dyslexic ON' : 'Dyslexic User'}</span>
            </button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Start New Lecture card */}
            <div className="group touch-target rounded-xl sm:rounded-2xl h-full">
              <Link to="/lecture" className="h-full block">
                <div className="bg-gradient-to-br from-blue-600/80 to-purple-600/80 backdrop-blur-sm border-2 border-white/20 text-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 h-full flex flex-col">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🎙️</div>
                  <h3 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Start New Lecture</h3>
                  <p className="text-sm sm:text-base text-white/90">Record with real-time transcription</p>
                </div>
              </Link>
            </div>

            {/* Upload Audio card */}
            <div
              onClick={() => setShowUploadModal(true)}
              className="bg-white/10 backdrop-blur-sm border-2 border-white/20 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 cursor-pointer group touch-target h-full flex flex-col"
            >
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform">📤</div>
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2">Upload Audio</h3>
              <p className="text-sm sm:text-base text-gray-100">Upload an existing audio file</p>
            </div>
          </div>

          {/* AI Features Grid */}
          <div className="mb-6 md:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 drop-shadow-lg">🧠 AI Learning Tools</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Reading Assistant */}
              <Link to="/reading" className="group">
                <div className="bg-gradient-to-br from-indigo-600/30 to-blue-600/30 backdrop-blur-sm border-2 border-indigo-400/30 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl hover:border-indigo-400/60 hover:scale-105 transition-all duration-300 h-full">
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📖</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">Reading Assistant</h3>
                  <p className="text-xs text-gray-300">Dyslexia-friendly reader with TTS</p>
                </div>
              </Link>

              {/* Handwriting Check */}
              <Link to="/handwriting" className="group">
                <div className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-sm border-2 border-purple-400/30 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl hover:border-purple-400/60 hover:scale-105 transition-all duration-300 h-full">
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">✍️</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">Handwriting Check</h3>
                  <p className="text-xs text-gray-300">AI detects writing errors</p>
                </div>
              </Link>

              {/* Content Generator */}
              <Link to="/generator" className="group">
                <div className="bg-gradient-to-br from-amber-600/30 to-orange-600/30 backdrop-blur-sm border-2 border-amber-400/30 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl hover:border-amber-400/60 hover:scale-105 transition-all duration-300 h-full">
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">✨</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">Content Generator</h3>
                  <p className="text-xs text-gray-300">Notes, flashcards, quizzes & more</p>
                </div>
              </Link>

              {/* Progress Analytics */}
              <Link to="/analytics" className="group">
                <div className="bg-gradient-to-br from-emerald-600/30 to-teal-600/30 backdrop-blur-sm border-2 border-emerald-400/30 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl hover:border-emerald-400/60 hover:scale-105 transition-all duration-300 h-full">
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">📊</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">Progress Analytics</h3>
                  <p className="text-xs text-gray-300">Track your learning journey</p>
                </div>
              </Link>

              {/* Dyslexia Screening */}
              <Link to="/onboarding" className="group">
                <div className="bg-gradient-to-br from-rose-600/30 to-pink-600/30 backdrop-blur-sm border-2 border-rose-400/30 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl hover:border-rose-400/60 hover:scale-105 transition-all duration-300 h-full">
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🧠</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">Dyslexia Screening</h3>
                  <p className="text-xs text-gray-300">Quick assessment & personalized tips</p>
                </div>
              </Link>

              {/* Therapy Games */}
              <Link to="/games" className="group">
                <div className="bg-gradient-to-br from-cyan-600/30 to-blue-600/30 backdrop-blur-sm border-2 border-cyan-400/30 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl hover:border-cyan-400/60 hover:scale-105 transition-all duration-300 h-full">
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🎮</div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">Therapy Games</h3>
                  <p className="text-xs text-gray-300">Fun adaptive games for reading & focus</p>
                </div>
              </Link>
            </div>
          </div>


        </div>
      </div>

      {/* Audio Upload Modal */}
      {showUploadModal && (
        <AudioUpload
          onUploadComplete={handleAudioUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      )}
    </div>
  );
}
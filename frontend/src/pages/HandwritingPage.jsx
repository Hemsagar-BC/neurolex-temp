// AI Handwriting Error Detection Page
// Students upload handwritten work → system detects dyslexia-related writing issues
// Uses Gemini vision API via backend for analysis

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    PenTool, Upload, ArrowLeft, CheckCircle, AlertTriangle,
    Camera, RefreshCw, FileImage, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function HandwritingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
            setResults(null);
            setError('');
        } else {
            setError('Please upload an image file (JPG, PNG, etc.)');
        }
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => setDragActive(false);

    const analyzeHandwriting = async () => {
        if (!image) return;
        setAnalyzing(true);
        setError('');
        setResults(null);

        try {
            const formData = new FormData();
            formData.append('file', image);
            if (user) formData.append('userId', user.uid);

            const response = await fetch(`${API_BASE_URL}/handwriting/analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Analysis failed. Please try again.');
            }

            const data = await response.json();
            setResults(data);
        } catch (err) {
            setError(err.message || 'Failed to analyze handwriting.');
        } finally {
            setAnalyzing(false);
        }
    };

    const reset = () => {
        setImage(null);
        setImagePreview(null);
        setResults(null);
        setError('');
    };

    const getErrorColor = (severity) => {
        switch (severity) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#22c55e';
            default: return '#8b5cf6';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2e] to-[#1a0a2e] text-white">
            {/* Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Dashboard</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <PenTool size={24} className="text-purple-400" />
                        <h1 className="text-xl font-bold">Handwriting Analysis</h1>
                    </div>
                    <div className="w-24" />
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Upload area */}
                    <div className="space-y-6">
                        {/* Info */}
                        <div className="rounded-2xl p-5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                            <div className="flex items-start gap-3">
                                <PenTool size={22} className="text-purple-400 mt-1 shrink-0" />
                                <div>
                                    <h2 className="text-lg font-semibold mb-1">AI Handwriting Check</h2>
                                    <p className="text-white/60 text-sm">
                                        Upload a photo of handwritten work. Our AI will detect dyslexia-related
                                        errors like letter reversals (b/d, p/q), spacing issues, and formation problems.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Upload zone */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${dragActive
                                ? 'border-purple-400 bg-purple-500/10'
                                : 'border-white/20 bg-white/5 hover:border-white/40'
                                }`}
                            style={{ minHeight: '250px' }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFile(e.target.files[0])}
                                className="hidden"
                            />

                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt="Handwriting preview"
                                    className="max-h-[300px] mx-auto rounded-lg object-contain"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-8">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                                        <FileImage size={32} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-white/80 font-medium">Drop an image here or click to upload</p>
                                        <p className="text-white/40 text-sm mt-1">JPG, PNG, or photo from camera</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <motion.button
                                onClick={analyzeHandwriting}
                                disabled={!image || analyzing}
                                className="flex-1 py-3 rounded-xl font-semibold transition-all disabled:opacity-30"
                                style={{
                                    background: image && !analyzing ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : '#333',
                                }}
                                whileHover={image && !analyzing ? { scale: 1.02 } : {}}
                                whileTap={image && !analyzing ? { scale: 0.98 } : {}}
                            >
                                {analyzing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 size={18} className="animate-spin" />
                                        Analyzing...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <PenTool size={18} />
                                        Analyze Handwriting
                                    </span>
                                )}
                            </motion.button>

                            {image && (
                                <button
                                    onClick={reset}
                                    className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            )}
                        </div>

                        {error && (
                            <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Right: Results */}
                    <div>
                        <AnimatePresence mode="wait">
                            {analyzing ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="rounded-2xl p-8 bg-white/5 border border-white/10 flex flex-col items-center justify-center"
                                    style={{ minHeight: '400px' }}
                                >
                                    <Loader2 size={48} className="text-purple-400 animate-spin mb-4" />
                                    <p className="text-white/60">Analyzing handwriting patterns...</p>
                                    <p className="text-white/40 text-sm mt-2">Checking for reversals, spacing, and formation...</p>
                                </motion.div>
                            ) : results ? (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    {/* Score */}
                                    <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-lg">Analysis Results</h3>
                                            <div
                                                className="px-3 py-1 rounded-full text-sm font-medium"
                                                style={{
                                                    backgroundColor: results.score >= 80 ? 'rgba(34, 197, 94, 0.2)' :
                                                        results.score >= 50 ? 'rgba(245, 158, 11, 0.2)' :
                                                            'rgba(239, 68, 68, 0.2)',
                                                    color: results.score >= 80 ? '#22c55e' :
                                                        results.score >= 50 ? '#f59e0b' : '#ef4444',
                                                }}
                                            >
                                                Score: {results.score}/100
                                            </div>
                                        </div>
                                        <p className="text-white/60 text-sm">{results.summary}</p>
                                    </div>

                                    {/* Errors */}
                                    {results.errors && results.errors.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium text-white/60">Detected Issues</h4>
                                            {results.errors.map((err, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="rounded-xl p-4 bg-white/5 border border-white/10"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <AlertTriangle
                                                            size={18}
                                                            style={{ color: getErrorColor(err.severity) }}
                                                            className="mt-0.5 shrink-0"
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm">{err.type}</div>
                                                            <div className="text-white/50 text-xs mt-1">{err.description}</div>
                                                            {err.suggestion && (
                                                                <div className="mt-2 text-xs text-indigo-300 bg-indigo-500/10 rounded-lg p-2">
                                                                    💡 {err.suggestion}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Recommendations */}
                                    {results.recommendations && (
                                        <div className="rounded-2xl p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                                            <div className="flex items-center gap-2 mb-3">
                                                <CheckCircle size={18} className="text-green-400" />
                                                <h4 className="font-medium text-sm">Recommendations</h4>
                                            </div>
                                            <ul className="space-y-2">
                                                {results.recommendations.map((rec, i) => (
                                                    <li key={i} className="text-sm text-white/60 flex items-start gap-2">
                                                        <span className="text-green-400 mt-1">•</span>
                                                        {rec}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="rounded-2xl p-8 bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center"
                                    style={{ minHeight: '400px' }}
                                >
                                    <PenTool size={48} className="text-white/20 mb-4" />
                                    <p className="text-white/40">Upload a handwriting image to see analysis results</p>
                                    <p className="text-white/30 text-sm mt-2">
                                        The AI will check for letter reversals, spacing, formation, and alignment
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

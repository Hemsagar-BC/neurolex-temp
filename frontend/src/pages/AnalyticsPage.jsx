// Personalized Progress Dashboard
// Charts for reading time, quiz scores, handwriting errors
// AI recommendations based on learning patterns

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3, ArrowLeft, BookOpen, PenTool, HelpCircle,
    TrendingUp, Clock, Target, Award, Loader2, Brain
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { getUserStats } from '../services/progressService';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const chartOptions = {
    responsive: true,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(15, 15, 30, 0.9)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: '#fff',
            cornerRadius: 8,
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } },
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } },
        },
    },
};

export default function AnalyticsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const data = await getUserStats(user.uid);
                setStats(data);
            } catch (err) {
                console.error('Failed to load stats:', err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, [user]);

    // Chart data generators
    const getReadingTimeData = () => {
        if (!stats?.readings?.length) return null;
        const sessions = [...stats.readings].reverse().slice(-10);
        return {
            labels: sessions.map((_, i) => `Session ${i + 1}`),
            datasets: [{
                label: 'Reading Time (min)',
                data: sessions.map(s => Math.round((s.readingTime || 0) / 60)),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#6366f1',
                pointRadius: 4,
            }],
        };
    };

    const getQuizData = () => {
        if (!stats?.quizzes?.length) return null;
        const quizzes = [...stats.quizzes].reverse().slice(-10);
        return {
            labels: quizzes.map((_, i) => `Quiz ${i + 1}`),
            datasets: [{
                label: 'Score %',
                data: quizzes.map(q => Math.round((q.score / q.totalQuestions) * 100)),
                backgroundColor: 'rgba(34, 197, 94, 0.6)',
                borderColor: '#22c55e',
                borderWidth: 1,
                borderRadius: 6,
            }],
        };
    };

    const getOverviewData = () => {
        return {
            labels: ['Reading', 'Quizzes', 'Handwriting'],
            datasets: [{
                data: [
                    stats?.totalReadingSessions || 0,
                    stats?.totalQuizzes || 0,
                    stats?.totalHandwritingUploads || 0,
                ],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(168, 85, 247, 0.7)',
                ],
                borderWidth: 0,
            }],
        };
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
                        <BarChart3 size={24} className="text-emerald-400" />
                        <h1 className="text-xl font-bold">Progress Analytics</h1>
                    </div>
                    <div className="w-24" />
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={40} className="text-indigo-400 animate-spin mb-4" />
                        <p className="text-white/50">Loading your progress data...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Stat cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                icon={<Clock size={20} />}
                                label="Total Reading Time"
                                value={`${Math.round((stats?.totalReadingTime || 0) / 60)} min`}
                                color="#6366f1"
                            />
                            <StatCard
                                icon={<Target size={20} />}
                                label="Avg Quiz Score"
                                value={`${stats?.avgQuizScore || 0}%`}
                                color="#22c55e"
                            />
                            <StatCard
                                icon={<BookOpen size={20} />}
                                label="Reading Sessions"
                                value={stats?.totalReadingSessions || 0}
                                color="#f59e0b"
                            />
                            <StatCard
                                icon={<PenTool size={20} />}
                                label="Handwriting Checks"
                                value={stats?.totalHandwritingUploads || 0}
                                color="#a855f7"
                            />
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Reading time trend */}
                            <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-indigo-400" />
                                    Reading Time Trend
                                </h3>
                                {getReadingTimeData() ? (
                                    <Line data={getReadingTimeData()} options={chartOptions} />
                                ) : (
                                    <EmptyState text="No reading sessions yet. Use the Reading Assistant to start tracking." />
                                )}
                            </div>

                            {/* Quiz scores */}
                            <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <HelpCircle size={18} className="text-green-400" />
                                    Quiz Scores
                                </h3>
                                {getQuizData() ? (
                                    <Bar data={getQuizData()} options={chartOptions} />
                                ) : (
                                    <EmptyState text="No quizzes taken yet. Generate quizzes from the Content Generator." />
                                )}
                            </div>

                            {/* Activity overview */}
                            <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-amber-400" />
                                    Activity Overview
                                </h3>
                                <div className="max-w-[250px] mx-auto">
                                    <Doughnut
                                        data={getOverviewData()}
                                        options={{
                                            ...chartOptions,
                                            scales: {},
                                            plugins: {
                                                ...chartOptions.plugins,
                                                legend: {
                                                    display: true,
                                                    position: 'bottom',
                                                    labels: { color: 'rgba(255,255,255,0.6)', padding: 16, font: { size: 12 } }
                                                },
                                            },
                                        }}
                                    />
                                </div>
                            </div>

                            {/* AI Recommendations */}
                            <div className="rounded-2xl p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Brain size={18} className="text-indigo-400" />
                                    AI Recommendations
                                </h3>
                                <div className="space-y-3">
                                    {getRecommendations(stats).map((rec, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-white/5"
                                        >
                                            <div className="mt-0.5">{rec.icon}</div>
                                            <div>
                                                <div className="text-sm font-medium">{rec.title}</div>
                                                <div className="text-xs text-white/50 mt-0.5">{rec.description}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 bg-white/5 border border-white/10"
        >
            <div className="flex items-center gap-2 mb-2" style={{ color }}>
                {icon}
                <span className="text-xs text-white/50">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
        </motion.div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="flex items-center justify-center py-12 text-white/30 text-sm text-center">
            {text}
        </div>
    );
}

function getRecommendations(stats) {
    const recs = [];

    if (!stats) {
        recs.push({
            icon: <BookOpen size={16} className="text-indigo-400" />,
            title: 'Start your learning journey',
            description: 'Begin with the Reading Assistant to get personalized insights.',
        });
        return recs;
    }

    if ((stats.totalReadingSessions || 0) < 3) {
        recs.push({
            icon: <BookOpen size={16} className="text-indigo-400" />,
            title: 'Build reading consistency',
            description: 'Try to complete at least 3 reading sessions this week for best results.',
        });
    }

    if ((stats.avgQuizScore || 0) < 70 && (stats.totalQuizzes || 0) > 0) {
        recs.push({
            icon: <Target size={16} className="text-amber-400" />,
            title: 'Review difficult topics',
            description: 'Your quiz scores suggest reviewing concepts before retrying quizzes.',
        });
    }

    if ((stats.totalHandwritingErrors || 0) > 5) {
        recs.push({
            icon: <PenTool size={16} className="text-purple-400" />,
            title: 'Practice letter formation',
            description: 'Focus on commonly reversed letters like b/d and p/q with tracing exercises.',
        });
    }

    if (recs.length === 0) {
        recs.push({
            icon: <Award size={16} className="text-green-400" />,
            title: 'Great progress!',
            description: 'You\'re doing well. Keep up the consistent practice!',
        });
    }

    recs.push({
        icon: <TrendingUp size={16} className="text-emerald-400" />,
        title: 'Try multi-modal learning',
        description: 'Generate flashcards and quizzes from your reading material for deeper understanding.',
    });

    return recs;
}

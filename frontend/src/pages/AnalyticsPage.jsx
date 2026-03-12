// Personalized Progress Dashboard — Real-time Firebase analytics
// Charts for reading time, quiz scores, handwriting errors, content generations, lectures
// All data syncs in real-time via Firestore onSnapshot listeners

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
    BarChart3, ArrowLeft, BookOpen, PenTool, HelpCircle,
    TrendingUp, Clock, Target, Award, Loader2, Brain,
    Wand2, Mic, FileText, Layers, Sparkles, AlertTriangle,
    Folder, Calendar, Trash2
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserStats } from '../services/progressService';
import { getUserLectures, deleteLecture } from '../services/backendApi';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
            beginAtZero: true,
        },
    },
};

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'bottom',
            labels: { color: 'rgba(255,255,255,0.6)', padding: 12, font: { size: 11 }, usePointStyle: true },
        },
        tooltip: {
            backgroundColor: 'rgba(15, 15, 30, 0.9)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: '#fff',
            cornerRadius: 8,
        },
    },
};

export default function AnalyticsPage() {
    const navigate = useNavigate();
    const { currentUser: user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permError, setPermError] = useState(false);
    const [lectures, setLectures] = useState([]);
    const [lecturesLoading, setLecturesLoading] = useState(true);

    // Real-time subscription
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setPermError(false);
        const unsubscribe = subscribeToUserStats(
            user.uid,
            (data) => {
                setStats(data);
                setLoading(false);
            },
            (error) => {
                console.error('Analytics permission error:', error);
                setPermError(true);
                setLoading(false);
                // Show empty state instead of infinite loading
                setStats({
                    readings: [], quizzes: [], handwriting: [], contentGens: [], lectures: [],
                    totalReadingTime: 0, avgQuizScore: 0, totalReadingSessions: 0,
                    totalQuizzes: 0, totalHandwritingUploads: 0, totalHandwritingErrors: 0,
                    totalContentGenerations: 0, totalLectures: 0, totalHours: 0,
                });
            }
        );

        return () => unsubscribe();
    }, [user]);

    // Fetch lectures from backend
    useEffect(() => {
        const fetchLectures = async () => {
            if (!user?.uid) { setLecturesLoading(false); return; }
            try {
                setLecturesLoading(true);
                const data = await getUserLectures(user.uid);
                const sorted = data.sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));
                setLectures(sorted.map((l, i) => ({ ...l, lectureNumber: i + 1 })));
            } catch (e) {
                console.error('Error fetching lectures:', e);
            } finally {
                setLecturesLoading(false);
            }
        };
        fetchLectures();
    }, [user]);

    const cleanupOldLectures = async () => {
        if (!user?.uid) return;
        if (!window.confirm('This will delete all lectures except the 6 most recent. Continue?')) return;
        try {
            setLecturesLoading(true);
            const all = await getUserLectures(user.uid);
            const sorted = all.sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));
            const toDelete = sorted.slice(6);
            if (toDelete.length === 0) { alert('You have 6 or fewer lectures.'); setLecturesLoading(false); return; }
            let count = 0;
            for (const l of toDelete) { try { await deleteLecture(l.id); count++; } catch { } }
            alert(`Deleted ${count} old lecture(s).`);
            const refreshed = await getUserLectures(user.uid);
            const reSorted = refreshed.sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));
            setLectures(reSorted.map((l, i) => ({ ...l, lectureNumber: i + 1 })));
        } catch (e) { console.error(e); alert('Failed to cleanup.'); } finally { setLecturesLoading(false); }
    };

    const formatLectureDate = (ts) => {
        if (!ts?._seconds) return 'Just now';
        const date = new Date(ts._seconds * 1000);
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    // ────────── chart data helpers ──────────

    const getReadingTimeData = () => {
        if (!stats?.readings?.length) return null;
        const sessions = [...stats.readings].reverse().slice(-10);
        return {
            labels: sessions.map((_, i) => `S${i + 1}`),
            datasets: [{
                label: 'Reading Time (min)',
                data: sessions.map(s => Math.round((s.readingTime || 0) / 60)),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
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
            labels: quizzes.map((_, i) => `Q${i + 1}`),
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

    const getHandwritingData = () => {
        if (!stats?.handwriting?.length) return null;
        const uploads = [...stats.handwriting].reverse().slice(-10);
        return {
            labels: uploads.map((_, i) => `H${i + 1}`),
            datasets: [{
                label: 'Score',
                data: uploads.map(h => h.score || 0),
                backgroundColor: 'rgba(168, 85, 247, 0.6)',
                borderColor: '#a855f7',
                borderWidth: 1,
                borderRadius: 6,
            }],
        };
    };

    const getOverviewData = () => {
        return {
            labels: ['Reading', 'Quizzes', 'Handwriting', 'Content Gen', 'Lectures'],
            datasets: [{
                data: [
                    stats?.totalReadingSessions || 0,
                    stats?.totalQuizzes || 0,
                    stats?.totalHandwritingUploads || 0,
                    stats?.totalContentGenerations || 0,
                    stats?.totalLectures || 0,
                ],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(168, 85, 247, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(6, 182, 212, 0.7)',
                ],
                borderWidth: 0,
            }],
        };
    };

    const totalActivities = (stats?.totalReadingSessions || 0) +
        (stats?.totalQuizzes || 0) +
        (stats?.totalHandwritingUploads || 0) +
        (stats?.totalContentGenerations || 0) +
        (stats?.totalLectures || 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2e] to-[#1a0a2e] text-white">
            {/* Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/10">
                <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="hidden sm:inline">Dashboard</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <BarChart3 size={22} className="text-emerald-400" />
                        <h1 className="text-lg sm:text-xl font-bold">Progress Analytics</h1>
                    </div>
                    {/* Live indicator */}
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-green-400 hidden sm:inline">Live</span>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20"
                        >
                            <Loader2 size={40} className="text-indigo-400 animate-spin mb-4" />
                            <p className="text-white/50">Loading your progress data...</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6 sm:space-y-8"
                        >
                            {/* ── Permission error banner ── */}
                            {permError && (
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm p-4 flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-amber-400 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="text-amber-300 font-semibold mb-1">Firestore permissions need to be updated</p>
                                        <p className="text-white/60 leading-relaxed">
                                            Analytics data can't be loaded because your Firestore security rules don't allow access.
                                            Go to <span className="text-amber-300">Firebase Console → Firestore Database → Rules</span> and
                                            update the rules to allow authenticated users to read/write their own data.
                                            Start using features like Reading, Quizzes, Handwriting, and Lectures to generate data.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Top stat cards ── */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                                <StatCard
                                    icon={<Mic size={18} />}
                                    label="Lectures"
                                    value={stats?.totalLectures || 0}
                                    color="#06b6d4"
                                />
                                <StatCard
                                    icon={<Clock size={18} />}
                                    label="Total Hours"
                                    value={`${stats?.totalHours || 0}h`}
                                    color="#8b5cf6"
                                />
                                <StatCard
                                    icon={<BookOpen size={18} />}
                                    label="Reading Sessions"
                                    value={stats?.totalReadingSessions || 0}
                                    color="#6366f1"
                                />
                                <StatCard
                                    icon={<Target size={18} />}
                                    label="Avg Quiz Score"
                                    value={`${stats?.avgQuizScore || 0}%`}
                                    color="#22c55e"
                                />
                                <StatCard
                                    icon={<PenTool size={18} />}
                                    label="Handwriting Checks"
                                    value={stats?.totalHandwritingUploads || 0}
                                    color="#a855f7"
                                />
                                <StatCard
                                    icon={<Wand2 size={18} />}
                                    label="Content Generated"
                                    value={stats?.totalContentGenerations || 0}
                                    color="#f59e0b"
                                />
                            </div>

                            {/* ── Quiz count + total activities row ── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="rounded-xl p-4 sm:p-5 bg-white/5 border border-white/10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                                        <HelpCircle size={22} className="text-green-400" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-bold text-green-400">{stats?.totalQuizzes || 0}</div>
                                        <div className="text-xs text-white/50">Quizzes Attempted</div>
                                    </div>
                                </div>
                                <div className="rounded-xl p-4 sm:p-5 bg-white/5 border border-white/10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                        <Sparkles size={22} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-bold text-indigo-400">{totalActivities}</div>
                                        <div className="text-xs text-white/50">Total Activities</div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Charts grid ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                {/* Reading time trend */}
                                <ChartCard
                                    title="Reading Time Trend"
                                    icon={<TrendingUp size={16} className="text-indigo-400" />}
                                >
                                    {getReadingTimeData() ? (
                                        <div className="h-48 sm:h-64">
                                            <Line data={getReadingTimeData()} options={chartOptions} />
                                        </div>
                                    ) : (
                                        <EmptyState text="No reading sessions yet. Use the Reading Assistant to start tracking." />
                                    )}
                                </ChartCard>

                                {/* Quiz scores */}
                                <ChartCard
                                    title="Quiz Scores"
                                    icon={<HelpCircle size={16} className="text-green-400" />}
                                >
                                    {getQuizData() ? (
                                        <div className="h-48 sm:h-64">
                                            <Bar data={getQuizData()} options={chartOptions} />
                                        </div>
                                    ) : (
                                        <EmptyState text="No quizzes taken yet. Generate quizzes from the Content Generator." />
                                    )}
                                </ChartCard>

                                {/* Handwriting scores */}
                                <ChartCard
                                    title="Handwriting Scores"
                                    icon={<PenTool size={16} className="text-purple-400" />}
                                >
                                    {getHandwritingData() ? (
                                        <div className="h-48 sm:h-64">
                                            <Bar data={getHandwritingData()} options={{
                                                ...chartOptions,
                                                scales: {
                                                    ...chartOptions.scales,
                                                    y: { ...chartOptions.scales.y, max: 100 },
                                                },
                                            }} />
                                        </div>
                                    ) : (
                                        <EmptyState text="No handwriting checks yet. Upload handwriting from the Handwriting page." />
                                    )}
                                </ChartCard>

                                {/* Activity overview */}
                                <ChartCard
                                    title="Activity Overview"
                                    icon={<BarChart3 size={16} className="text-amber-400" />}
                                >
                                    {totalActivities > 0 ? (
                                        <div className="h-48 sm:h-64 flex items-center justify-center">
                                            <div className="w-full max-w-[220px]">
                                                <Doughnut data={getOverviewData()} options={doughnutOptions} />
                                            </div>
                                        </div>
                                    ) : (
                                        <EmptyState text="Start using the tools to see your activity breakdown." />
                                    )}
                                </ChartCard>
                            </div>

                            {/* ── Recent activity feed ── */}
                            <RecentActivity stats={stats} />

                            {/* ── AI Recommendations ── */}
                            <ChartCard
                                title="AI Recommendations"
                                icon={<Brain size={16} className="text-indigo-400" />}
                                gradient
                            >
                                <div className="space-y-3">
                                    {getRecommendations(stats).map((rec, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-white/5"
                                        >
                                            <div className="mt-0.5 flex-shrink-0">{rec.icon}</div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium">{rec.title}</div>
                                                <div className="text-xs text-white/50 mt-0.5">{rec.description}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </ChartCard>

                            {/* ── Recent Lectures ── */}
                            <div className="rounded-2xl p-4 sm:p-6 bg-white/5 border border-white/10">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                                    <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                                        <Mic size={16} className="text-cyan-400" />
                                        Recent Lectures
                                    </h3>
                                    {lectures.length > 6 && (
                                        <button
                                            onClick={cleanupOldLectures}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 transition-all"
                                            disabled={lecturesLoading}
                                        >
                                            <Trash2 size={13} />
                                            Keep Top 6
                                        </button>
                                    )}
                                </div>

                                {lecturesLoading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 size={24} className="text-indigo-400 animate-spin" />
                                    </div>
                                ) : lectures.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="text-4xl mb-3">🎙️</div>
                                        <p className="text-white/40 text-sm mb-3">No lectures yet</p>
                                        <Link to="/lecture" className="inline-block px-5 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all">
                                            Record Your First Lecture
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {lectures.slice(0, 6).map((lecture) => (
                                            <Link
                                                key={lecture.id}
                                                to={`/lecture?id=${lecture.id}`}
                                                className="block group"
                                            >
                                                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-white/10 rounded-xl p-4 hover:border-cyan-400/40 hover:bg-white/[0.06] transition-all duration-200">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
                                                            <Folder size={18} className="text-cyan-300" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-sm font-semibold text-white truncate">Lecture {lecture.lectureNumber}</h4>
                                                            <div className="flex items-center gap-1 text-[10px] text-white/40">
                                                                <Calendar size={10} />
                                                                {formatLectureDate(lecture.createdAt)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-white/50 line-clamp-2 mb-2 min-h-[32px]">
                                                        {lecture.transcription?.substring(0, 80)}{lecture.transcription?.length > 80 ? '...' : ''}
                                                    </p>
                                                    {lecture.simpleText || lecture.summary ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                                            ✓ Processed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                            ⏳ Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ────────────── Sub-components ──────────────

function StatCard({ icon, label, value, color }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 sm:p-4 bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
        >
            <div className="flex items-center gap-2 mb-1.5" style={{ color }}>
                {icon}
                <span className="text-[10px] sm:text-xs text-white/50 truncate">{label}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold">{value}</div>
        </motion.div>
    );
}

function ChartCard({ title, icon, children, gradient }) {
    return (
        <div className={`rounded-2xl p-4 sm:p-6 border ${gradient ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20' : 'bg-white/5 border-white/10'}`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
                {icon}
                {title}
            </h3>
            {children}
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="flex items-center justify-center py-10 sm:py-12 text-white/30 text-xs sm:text-sm text-center px-4">
            {text}
        </div>
    );
}

function RecentActivity({ stats }) {
    // Combine all activities, sort by time
    const activities = [];

    const toTime = (ts) => {
        if (!ts) return 0;
        if (ts.seconds) return ts.seconds * 1000;
        if (ts.toDate) return ts.toDate().getTime();
        return 0;
    };

    const formatAgo = (ts) => {
        const ms = Date.now() - toTime(ts);
        const mins = Math.floor(ms / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    (stats?.readings || []).forEach(r => activities.push({
        icon: <BookOpen size={14} className="text-indigo-400" />,
        label: `Reading session — ${Math.round((r.readingTime || 0) / 60)} min`,
        time: toTime(r.createdAt),
        timeStr: formatAgo(r.createdAt),
    }));
    (stats?.quizzes || []).forEach(q => activities.push({
        icon: <HelpCircle size={14} className="text-green-400" />,
        label: `Quiz — ${q.score}/${q.totalQuestions} correct`,
        time: toTime(q.createdAt),
        timeStr: formatAgo(q.createdAt),
    }));
    (stats?.handwriting || []).forEach(h => activities.push({
        icon: <PenTool size={14} className="text-purple-400" />,
        label: `Handwriting check — score ${h.score || 0}`,
        time: toTime(h.createdAt),
        timeStr: formatAgo(h.createdAt),
    }));
    (stats?.contentGens || []).forEach(c => activities.push({
        icon: <Wand2 size={14} className="text-amber-400" />,
        label: `Content generated — ${(c.types || []).join(', ') || 'all'}`,
        time: toTime(c.createdAt),
        timeStr: formatAgo(c.createdAt),
    }));
    (stats?.lectures || []).forEach(l => activities.push({
        icon: <Mic size={14} className="text-cyan-400" />,
        label: 'Lecture recorded',
        time: toTime(l.createdAt),
        timeStr: formatAgo(l.createdAt),
    }));

    activities.sort((a, b) => b.time - a.time);
    const recent = activities.slice(0, 8);

    if (recent.length === 0) return null;

    return (
        <div className="rounded-2xl p-4 sm:p-6 bg-white/5 border border-white/10">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Clock size={16} className="text-white/50" />
                Recent Activity
            </h3>
            <div className="space-y-2">
                {recent.map((a, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                    >
                        <div className="flex-shrink-0">{a.icon}</div>
                        <span className="text-xs sm:text-sm text-white/70 truncate flex-1">{a.label}</span>
                        <span className="text-[10px] sm:text-xs text-white/30 flex-shrink-0">{a.timeStr}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function getRecommendations(stats) {
    const recs = [];

    if (!stats || ((stats.totalReadingSessions || 0) + (stats.totalQuizzes || 0) + (stats.totalHandwritingUploads || 0)) === 0) {
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

    if ((stats.totalContentGenerations || 0) > 0 && (stats.totalQuizzes || 0) === 0) {
        recs.push({
            icon: <HelpCircle size={16} className="text-green-400" />,
            title: 'Take a quiz!',
            description: 'You\'ve generated content but haven\'t attempted any quizzes yet. Test your knowledge!',
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
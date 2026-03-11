// Multi-Modal Learning Content Generator
// Input: text or PDF → Output: simplified notes, flashcards, quiz, mind map, audio

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Wand2, ArrowLeft, FileText, Upload, Loader2,
    BookOpen, Layers, Brain, HelpCircle, Volume2,
    ChevronLeft, ChevronRight, Check, X, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const TABS = [
    { id: 'notes', label: 'Simplified Notes', icon: FileText },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle },
    { id: 'mindmap', label: 'Mind Map', icon: Brain },
    { id: 'audio', label: 'Audio', icon: Volume2 },
];

export default function GeneratorPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [inputText, setInputText] = useState('');
    const [generating, setGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('notes');
    const [outputs, setOutputs] = useState(null);
    const [error, setError] = useState('');

    const handlePDFUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            try {
                const pdfjsLib = await import('pdfjs-dist');
                pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const pageText = content.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }

                setInputText(fullText.trim());
            } catch (err) {
                setError('Failed to read PDF. Please try pasting the text instead.');
            }
        } else if (file.type === 'text/plain') {
            const text = await file.text();
            setInputText(text);
        }
    };

    const generateContent = async () => {
        if (!inputText.trim()) return;
        setGenerating(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/content/transform`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: inputText,
                    userId: user?.uid || 'anonymous',
                }),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('AI service is busy (rate limit). Please wait 1-2 minutes and try again.');
                }
                throw new Error('Content generation failed');
            }

            const data = await response.json();
            setOutputs(data);
            setActiveTab('notes');
        } catch (err) {
            setError(err.message || 'Failed to generate content.');
        } finally {
            setGenerating(false);
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
                        <Wand2 size={24} className="text-amber-400" />
                        <h1 className="text-xl font-bold">Content Generator</h1>
                    </div>
                    <div className="w-24" />
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {!outputs ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-3xl mx-auto space-y-6"
                    >
                        {/* Info */}
                        <div className="rounded-2xl p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                            <div className="flex items-start gap-3">
                                <Wand2 size={22} className="text-amber-400 mt-1 shrink-0" />
                                <div>
                                    <h2 className="text-lg font-semibold mb-1">Transform Any Content</h2>
                                    <p className="text-white/60 text-sm">
                                        Paste text or upload a PDF, and AI will generate simplified notes,
                                        flashcards, quizzes, mind maps, and audio narration.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Input */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-white/60">Paste your content</label>
                                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer text-sm transition-colors">
                                    <Upload size={14} />
                                    Upload PDF / TXT
                                    <input
                                        type="file"
                                        accept=".pdf,.txt"
                                        onChange={handlePDFUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                rows={10}
                                placeholder="Paste lecture notes, textbook content, or any educational text..."
                                className="w-full rounded-xl p-4 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-amber-500 focus:outline-none resize-none"
                                style={{ fontSize: '16px', lineHeight: '1.6' }}
                            />
                            <div className="text-right text-xs text-white/30 mt-1">
                                {inputText.split(/\s+/).filter(w => w).length} words
                            </div>
                        </div>

                        {/* Generate button */}
                        <motion.button
                            onClick={generateContent}
                            disabled={!inputText.trim() || generating}
                            className="w-full py-4 rounded-xl font-semibold text-lg transition-all disabled:opacity-30"
                            style={{
                                background: inputText.trim() && !generating
                                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                    : '#333',
                            }}
                            whileHover={inputText.trim() && !generating ? { scale: 1.02 } : {}}
                            whileTap={inputText.trim() && !generating ? { scale: 0.98 } : {}}
                        >
                            {generating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 size={20} className="animate-spin" />
                                    Generating all formats...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Wand2 size={20} />
                                    Generate Learning Content
                                </span>
                            )}
                        </motion.button>

                        {error && (
                            <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                                {error}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        {/* Back & tabs */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setOutputs(null)}
                                className="flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
                            >
                                <ArrowLeft size={16} />
                                New content
                            </button>
                        </div>

                        {/* Tab bar */}
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab content */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                {activeTab === 'notes' && <NotesView content={outputs.simplifiedNotes} />}
                                {activeTab === 'flashcards' && <FlashcardView cards={outputs.flashcards} />}
                                {activeTab === 'quiz' && <QuizView questions={outputs.quiz} />}
                                {activeTab === 'mindmap' && <MindMapView data={outputs.mindMap} />}
                                {activeTab === 'audio' && <AudioView text={outputs.simplifiedNotes} />}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

// ---- Sub-components ----

function NotesView({ content }) {
    return (
        <div className="reading-content rounded-2xl p-6 bg-white/5 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText size={20} className="text-amber-400" />
                Simplified Notes
            </h3>
            <div className="text-white/80 whitespace-pre-wrap leading-relaxed">
                {content || 'No notes generated.'}
            </div>
        </div>
    );
}

function FlashcardView({ cards }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const parsedCards = typeof cards === 'string' ? parseFlashcards(cards) : (cards || []);

    const next = () => { setCurrentIndex((i) => Math.min(i + 1, parsedCards.length - 1)); setFlipped(false); };
    const prev = () => { setCurrentIndex((i) => Math.max(i - 1, 0)); setFlipped(false); };

    if (parsedCards.length === 0) {
        return <div className="text-white/40 text-center p-8">No flashcards generated.</div>;
    }

    return (
        <div className="space-y-4">
            <div className="text-center text-sm text-white/40">
                Card {currentIndex + 1} of {parsedCards.length}
            </div>
            <div
                onClick={() => setFlipped(!flipped)}
                className="relative mx-auto max-w-lg cursor-pointer"
                style={{ perspective: '1000px', minHeight: '200px' }}
            >
                <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full rounded-2xl"
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front */}
                    <div
                        className="rounded-2xl p-8 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-center"
                        style={{ backfaceVisibility: flipped ? 'hidden' : 'visible', minHeight: '200px', display: flipped ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
                    >
                        <div className="text-xs text-indigo-300 mb-3">QUESTION</div>
                        <div className="text-lg font-medium">{parsedCards[currentIndex]?.front}</div>
                        <div className="text-xs text-white/30 mt-4">Click to flip</div>
                    </div>
                    {/* Back */}
                    <div
                        className="rounded-2xl p-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 text-center"
                        style={{ backfaceVisibility: !flipped ? 'hidden' : 'visible', minHeight: '200px', display: !flipped ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
                    >
                        <div className="text-xs text-green-300 mb-3">ANSWER</div>
                        <div className="text-lg font-medium">{parsedCards[currentIndex]?.back}</div>
                        <div className="text-xs text-white/30 mt-4">Click to flip back</div>
                    </div>
                </motion.div>
            </div>
            <div className="flex justify-center gap-3">
                <button onClick={prev} disabled={currentIndex === 0} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 transition-colors hover:bg-white/10">
                    <ChevronLeft size={18} />
                </button>
                <button onClick={next} disabled={currentIndex === parsedCards.length - 1} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 transition-colors hover:bg-white/10">
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}

function QuizView({ questions }) {
    const [answers, setAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const parsedQuestions = typeof questions === 'string' ? parseQuiz(questions) : (questions || []);

    const handleAnswer = (qi, ai) => {
        if (showResults) return;
        setAnswers({ ...answers, [qi]: ai });
    };

    const score = parsedQuestions.reduce((acc, q, i) => {
        return acc + (answers[i] === q.correct ? 1 : 0);
    }, 0);

    if (parsedQuestions.length === 0) {
        return <div className="text-white/40 text-center p-8">No quiz generated.</div>;
    }

    return (
        <div className="space-y-6">
            {parsedQuestions.map((q, qi) => (
                <div key={qi} className="rounded-xl p-5 bg-white/5 border border-white/10">
                    <div className="font-medium mb-3">{qi + 1}. {q.question}</div>
                    <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                            const selected = answers[qi] === oi;
                            const isCorrect = q.correct === oi;
                            let borderColor = 'border-white/10';
                            let bgColor = 'bg-white/5';

                            if (showResults && isCorrect) {
                                borderColor = 'border-green-500/50';
                                bgColor = 'bg-green-500/10';
                            } else if (showResults && selected && !isCorrect) {
                                borderColor = 'border-red-500/50';
                                bgColor = 'bg-red-500/10';
                            } else if (selected) {
                                borderColor = 'border-indigo-500/50';
                                bgColor = 'bg-indigo-500/10';
                            }

                            return (
                                <button
                                    key={oi}
                                    onClick={() => handleAnswer(qi, oi)}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${borderColor} ${bgColor}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-white/40">{String.fromCharCode(65 + oi)}</span>
                                        <span className="text-sm">{opt}</span>
                                        {showResults && isCorrect && <Check size={16} className="ml-auto text-green-400" />}
                                        {showResults && selected && !isCorrect && <X size={16} className="ml-auto text-red-400" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {!showResults ? (
                <button
                    onClick={() => setShowResults(true)}
                    disabled={Object.keys(answers).length < parsedQuestions.length}
                    className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-30"
                    style={{ background: Object.keys(answers).length >= parsedQuestions.length ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#333' }}
                >
                    Check Answers
                </button>
            ) : (
                <div className="text-center">
                    <div className="text-2xl font-bold mb-1">
                        {score}/{parsedQuestions.length}
                    </div>
                    <div className="text-white/50 text-sm">
                        {score === parsedQuestions.length ? '🎉 Perfect!' : score >= parsedQuestions.length / 2 ? '👍 Good job!' : '📚 Keep practicing!'}
                    </div>
                    <button
                        onClick={() => { setAnswers({}); setShowResults(false); }}
                        className="mt-3 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-colors"
                    >
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            )}
        </div>
    );
}

function MindMapView({ data }) {
    const content = typeof data === 'string' ? data : '';

    // Parse mind map text into a tree visualization
    const lines = content.split('\n').filter(l => l.trim());

    return (
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Brain size={20} className="text-amber-400" />
                Mind Map
            </h3>
            <div className="font-mono text-sm text-white/80 whitespace-pre-wrap leading-loose">
                {lines.map((line, i) => {
                    const isMain = !line.startsWith('├') && !line.startsWith('└') && !line.startsWith('│') && !line.startsWith('  ');
                    return (
                        <div key={i} className={isMain ? 'text-amber-300 font-semibold text-lg mb-2' : 'text-white/70 ml-2'}>
                            {line}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AudioView({ text }) {
    const [playing, setPlaying] = useState(false);
    const [rate, setRate] = useState(0.85);

    const handlePlay = () => {
        if (playing) {
            window.speechSynthesis.cancel();
            setPlaying(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.onend = () => setPlaying(false);
        window.speechSynthesis.speak(utterance);
        setPlaying(true);
    };

    return (
        <div className="rounded-2xl p-6 bg-white/5 border border-white/10 text-center">
            <h3 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                <Volume2 size={20} className="text-amber-400" />
                Audio Narration
            </h3>
            <p className="text-white/50 text-sm mb-6">
                Listen to the content read aloud at a comfortable pace
            </p>

            <div className="flex items-center justify-center gap-4 mb-4">
                <span className="text-sm text-white/40">Speed:</span>
                {[0.5, 0.75, 0.85, 1.0, 1.25].map((r) => (
                    <button
                        key={r}
                        onClick={() => setRate(r)}
                        className={`px-3 py-1 rounded-lg text-sm transition-all ${rate === r ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white/5 text-white/50 border border-white/10'
                            }`}
                    >
                        {r}x
                    </button>
                ))}
            </div>

            <motion.button
                onClick={handlePlay}
                className="px-8 py-4 rounded-xl font-semibold text-lg"
                style={{
                    background: playing ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                {playing ? (
                    <span className="flex items-center gap-2"><Volume2 size={20} /> Stop</span>
                ) : (
                    <span className="flex items-center gap-2"><Volume2 size={20} /> Play Audio</span>
                )}
            </motion.button>
        </div>
    );
}

// ---- Helpers ----

function parseFlashcards(text) {
    const cards = [];
    const lines = text.split('\n').filter(l => l.trim());
    let current = null;

    for (const line of lines) {
        const cleaned = line.replace(/^\d+[\.\)]\s*/, '').trim();
        if (cleaned.toLowerCase().startsWith('q:') || cleaned.toLowerCase().startsWith('front:') || cleaned.toLowerCase().startsWith('question:')) {
            if (current && current.front) cards.push(current);
            current = { front: cleaned.replace(/^(q|front|question):\s*/i, ''), back: '' };
        } else if (cleaned.toLowerCase().startsWith('a:') || cleaned.toLowerCase().startsWith('back:') || cleaned.toLowerCase().startsWith('answer:')) {
            if (current) current.back = cleaned.replace(/^(a|back|answer):\s*/i, '');
        }
    }
    if (current && current.front) cards.push(current);

    // Fallback: split by double newline chunks
    if (cards.length === 0) {
        const chunks = text.split(/\n\n+/);
        for (let i = 0; i < chunks.length - 1; i += 2) {
            cards.push({ front: chunks[i].trim(), back: (chunks[i + 1] || '').trim() });
        }
    }

    return cards;
}

function parseQuiz(text) {
    const questions = [];
    const blocks = text.split(/\n(?=\d+[\.\)])/);

    for (const block of blocks) {
        const lines = block.split('\n').filter(l => l.trim());
        if (lines.length < 3) continue;

        const question = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
        const options = [];
        let correct = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            const optMatch = line.match(/^[A-Da-d][\.\)]\s*(.*)/);
            if (optMatch) {
                const isCorrect = line.includes('✓') || line.includes('*') || line.toLowerCase().includes('(correct)');
                if (isCorrect) correct = options.length;
                options.push(optMatch[1].replace(/[✓*]|\(correct\)/gi, '').trim());
            }
        }

        if (options.length >= 2) {
            questions.push({ question, options, correct });
        }
    }

    return questions;
}

// Floating Accessibility Toolbar
// Provides quick toggles for dyslexia-friendly settings on every page

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, Type, Minus, Plus, Sun, Moon,
    Ruler, Focus, X, Accessibility, RotateCcw,
    Palette
} from 'lucide-react';
import useDyslexiaStore from '../../stores/dyslexiaStore';

const OVERLAYS = [
    { value: 'none', label: 'None', color: 'transparent' },
    { value: 'cream', label: 'Cream', color: '#FFF8DC' },
    { value: 'blue', label: 'Blue', color: '#E6F3FF' },
    { value: 'green', label: 'Green', color: '#E8F5E9' },
    { value: 'pink', label: 'Pink', color: '#FCE4EC' },
    { value: 'yellow', label: 'Yellow', color: '#FFFDE7' },
];

export default function AccessibilityToolbar() {
    const {
        dyslexicFont, toggleDyslexicFont,
        fontSize, setFontSize,
        letterSpacing, setLetterSpacing,
        wordSpacing, setWordSpacing,
        lineHeight, setLineHeight,
        colorOverlay, setColorOverlay,
        highContrast, toggleHighContrast,
        focusMode, toggleFocusMode,
        readingRuler, toggleReadingRuler,
        toolbarOpen, toggleToolbar,
        resetAll,
    } = useDyslexiaStore();

    const panelRef = useRef(null);

    // Close toolbar when clicking outside
    useEffect(() => {
        if (!toolbarOpen) return;
        const handleClickOutside = (e) => {
            // Don't close if clicking the toggle button or inside the panel
            if (
                panelRef.current && !panelRef.current.contains(e.target) &&
                !e.target.closest('[data-a11y-toggle]')
            ) {
                toggleToolbar();
            }
        };
        // Delay to avoid the opening click from immediately closing
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [toolbarOpen, toggleToolbar]);

    return (
        <>
            {/* Floating toggle button */}
            <motion.button
                onClick={toggleToolbar}
                data-a11y-toggle
                className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    minWidth: '56px',
                    minHeight: '56px',
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Accessibility Settings"
            >
                {toolbarOpen ? <X size={24} /> : <Accessibility size={24} />}
            </motion.button>

            {/* Color overlay */}
            {colorOverlay !== 'none' && (
                <div
                    className="fixed inset-0 pointer-events-none z-[9990]"
                    style={{
                        backgroundColor: OVERLAYS.find(o => o.value === colorOverlay)?.color || 'transparent',
                        opacity: 0.15,
                    }}
                />
            )}

            {/* Toolbar panel */}
            <AnimatePresence>
                {toolbarOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-24 right-6 z-[9999] w-80 rounded-2xl shadow-2xl"
                        style={{
                            background: 'rgba(15, 15, 30, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: 'white',
                            maxHeight: 'calc(100vh - 120px)',
                            overflowY: 'auto',
                        }}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Accessibility size={20} className="text-indigo-400" />
                                <span className="font-semibold text-lg">Accessibility</span>
                            </div>
                            <button
                                onClick={resetAll}
                                className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors"
                                style={{ minHeight: 'auto', minWidth: 'auto' }}
                                title="Reset all settings"
                            >
                                <RotateCcw size={14} />
                                Reset
                            </button>
                        </div>

                        <div className="p-4 space-y-5">
                            {/* Font Toggle */}
                            <ToggleRow
                                icon={<Type size={18} />}
                                label="OpenDyslexic Font"
                                active={dyslexicFont}
                                onToggle={toggleDyslexicFont}
                            />

                            {/* Font Size */}
                            <SliderRow
                                icon={<Type size={18} />}
                                label={`Font Size: ${fontSize}px`}
                                value={fontSize}
                                min={14}
                                max={28}
                                step={1}
                                onChange={setFontSize}
                            />

                            {/* Letter Spacing */}
                            <SliderRow
                                icon={<Minus size={18} />}
                                label={`Letter Spacing: ${letterSpacing}`}
                                value={letterSpacing}
                                min={0}
                                max={5}
                                step={0.5}
                                onChange={setLetterSpacing}
                            />

                            {/* Word Spacing */}
                            <SliderRow
                                icon={<Minus size={18} />}
                                label={`Word Spacing: ${wordSpacing}`}
                                value={wordSpacing}
                                min={0}
                                max={10}
                                step={1}
                                onChange={setWordSpacing}
                            />

                            {/* Line Height */}
                            <SliderRow
                                icon={<Minus size={18} />}
                                label={`Line Height: ${lineHeight}`}
                                value={lineHeight}
                                min={1.2}
                                max={3.0}
                                step={0.1}
                                onChange={(v) => setLineHeight(parseFloat(v))}
                            />

                            {/* High Contrast */}
                            <ToggleRow
                                icon={<Sun size={18} />}
                                label="High Contrast"
                                active={highContrast}
                                onToggle={toggleHighContrast}
                            />

                            {/* Reading Ruler */}
                            <ToggleRow
                                icon={<Ruler size={18} />}
                                label="Reading Ruler"
                                active={readingRuler}
                                onToggle={toggleReadingRuler}
                            />

                            {/* Focus Mode */}
                            <ToggleRow
                                icon={<Focus size={18} />}
                                label="Focus Mode"
                                active={focusMode}
                                onToggle={toggleFocusMode}
                            />

                            {/* Color Overlay */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Palette size={18} className="text-indigo-400" />
                                    <span className="text-sm text-white/80">Color Overlay</span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {OVERLAYS.map((o) => (
                                        <button
                                            key={o.value}
                                            onClick={() => setColorOverlay(o.value)}
                                            className="w-8 h-8 rounded-full border-2 transition-transform"
                                            style={{
                                                backgroundColor: o.value === 'none' ? '#333' : o.color,
                                                borderColor: colorOverlay === o.value ? '#818cf8' : 'transparent',
                                                transform: colorOverlay === o.value ? 'scale(1.2)' : 'scale(1)',
                                                minHeight: '32px',
                                                minWidth: '32px',
                                            }}
                                            title={o.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Toggle row component
function ToggleRow({ icon, label, active, onToggle }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-indigo-400">{icon}</span>
                <span className="text-sm text-white/80">{label}</span>
            </div>
            <button
                onClick={onToggle}
                className="relative w-11 h-6 rounded-full transition-colors"
                style={{
                    backgroundColor: active ? '#6366f1' : '#374151',
                    minHeight: '24px',
                    minWidth: '44px',
                }}
            >
                <motion.div
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
                    animate={{ left: active ? '22px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </button>
        </div>
    );
}

// Slider row component
function SliderRow({ icon, label, value, min, max, step, onChange }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-indigo-400">{icon}</span>
                <span className="text-sm text-white/80">{label}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
                style={{ minHeight: '20px' }}
            />
        </div>
    );
}

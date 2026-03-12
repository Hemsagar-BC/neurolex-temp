// ReadingRuler - horizontal highlight bar that follows the mouse
// Helps dyslexic readers track their current line

import React, { useRef, useEffect } from 'react';
import useDyslexiaStore from '../../stores/dyslexiaStore';

export default function ReadingRuler() {
    const { readingRuler, rulerHeight } = useDyslexiaStore();
    const rulerRef = useRef(null);
    const rafRef = useRef(null);
    const mouseYRef = useRef(-200);

    useEffect(() => {
        if (!readingRuler) return;

        const update = () => {
            if (rulerRef.current) {
                // Position ruler so cursor sits near the top of the highlight band
                rulerRef.current.style.transform = `translateY(${mouseYRef.current - 4}px)`;
            }
            rafRef.current = requestAnimationFrame(update);
        };

        const handleMouseMove = (e) => {
            mouseYRef.current = e.clientY;
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        rafRef.current = requestAnimationFrame(update);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [readingRuler]);

    if (!readingRuler) return null;

    return (
        <div
            ref={rulerRef}
            className="reading-ruler"
            style={{
                top: 0,
                height: `${rulerHeight || 40}px`,
                willChange: 'transform',
            }}
        />
    );
}

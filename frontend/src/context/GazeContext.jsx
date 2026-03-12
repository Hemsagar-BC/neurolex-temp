/**
 * GazeContext — Manages the entire WebGazer.js lifecycle for gaze tracking.
 *
 * Provides:
 *   gazeAvailable   — true if webcam permission was granted
 *   gazeActive      — true if WebGazer is currently tracking
 *   currentGazeRef  — ref with latest {x,y} (avoids re-renders)
 *   isCalibrated    — whether calibration has been completed this session
 *   startGaze()     — request webcam + initialise WebGazer
 *   stopGaze()      — tear down WebGazer
 *   setCalibrated() — mark calibration state
 *   videoElementRef — ref to the <video> element for camera preview
 *   faceCanvasRef   — ref to the face overlay <canvas> for eye-pin drawing
 *
 * Gaze coordinates are dispatched as a custom DOM event 'gazeupdate'
 * so child components can subscribe without triggering React re-renders.
 *
 * Usage: wrap only the pages that need gaze tracking with <GazeProvider>.
 */

import React, {
    createContext,
    useContext,
    useState,
    useRef,
    useCallback,
    useEffect,
} from 'react';

// --------------- Context ---------------

const GazeContext = createContext(null);

// --------------- Constants ---------------

/** Minimum ms between processed gaze samples (~30 Hz) */
const THROTTLE_MS = 33;
/** Number of samples for rolling-average smoothing (smaller = more responsive) */
const SMOOTH_WINDOW = 5;
/** Exponential moving average alpha (0–1). Higher = more responsive. */
const EMA_ALPHA = 0.45;
/** Maximum allowed jump in px per frame. Must allow normal saccades (200-400px). */
const MAX_JUMP_PX = 350;

/**
 * Local path to webgazer.js served from Vite's public/ directory.
 */
const WEBGAZER_LOCAL = '/webgazer.js';

/** Cache so we only inject the script once */
let _webgazerPromise = null;

/**
 * Load WebGazer from a local <script> tag (served from public/).
 */
function loadWebGazerLocal() {
    if (_webgazerPromise) return _webgazerPromise;

    if (window.webgazer) {
        _webgazerPromise = Promise.resolve(window.webgazer);
        return _webgazerPromise;
    }

    _webgazerPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = WEBGAZER_LOCAL;
        script.async = true;
        script.onload = () => {
            if (window.webgazer) {
                resolve(window.webgazer);
            } else {
                reject(new Error('WebGazer script loaded but window.webgazer not found'));
            }
        };
        script.onerror = () => {
            _webgazerPromise = null;
            reject(new Error('Failed to load WebGazer from local public/'));
        };
        document.head.appendChild(script);
    });

    return _webgazerPromise;
}

// --------------- Provider ---------------

/**
 * GazeProvider — wrap around any route/page that needs eye tracking.
 * Does NOT initialise the webcam or WebGazer on mount; call startGaze() explicitly.
 */
export function GazeProvider({ children }) {
    const [gazeAvailable, setGazeAvailable] = useState(true);
    const [gazeActive, setGazeActive] = useState(false);
    const [isCalibrated, setIsCalibrated] = useState(() => {
        try {
            return sessionStorage.getItem('gazeCalibrated') === 'true';
        } catch {
            return false;
        }
    });

    /** Latest smoothed gaze point — exposed as a ref to avoid re-renders */
    const currentGazeRef = useRef(null);

    /** Refs to WebGazer's injected DOM elements (for camera preview / eye-pin drawing) */
    const videoElementRef = useRef(null);
    const faceCanvasRef = useRef(null);

    /** Internal refs */
    const webgazerRef = useRef(null);
    const lastProcessedRef = useRef(0);
    const smoothBufferRef = useRef([]);
    const emaRef = useRef(null);            // { x, y } — exponential moving average state
    const activeRef = useRef(false);

    useEffect(() => {
        activeRef.current = gazeActive;
    }, [gazeActive]);

    const handleSetCalibrated = useCallback((value) => {
        setIsCalibrated(value);
        try {
            sessionStorage.setItem('gazeCalibrated', String(value));
        } catch { /* noop */ }
    }, []);

    // -------- Heavy-duty gaze listener (throttled + EMA + jump-clamp + rolling avg) --------

    const gazeListener = useCallback((data, _clock) => {
        if (!data || !activeRef.current) return;

        const now = performance.now();
        if (now - lastProcessedRef.current < THROTTLE_MS) return;
        lastProcessedRef.current = now;

        let x = data.x;
        let y = data.y;

        // ---- 1. Jump clamp: reject sudden large jumps ----
        if (emaRef.current) {
            const dx = x - emaRef.current.x;
            const dy = y - emaRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > MAX_JUMP_PX) {
                // Clamp to max jump distance in the direction of movement
                const scale = MAX_JUMP_PX / dist;
                x = emaRef.current.x + dx * scale;
                y = emaRef.current.y + dy * scale;
            }
        }

        // ---- 2. Rolling average buffer ----
        const buf = smoothBufferRef.current;
        buf.push({ x, y });
        if (buf.length > SMOOTH_WINDOW) buf.shift();

        const len = buf.length;
        const avg = buf.reduce(
            (acc, pt) => ({ x: acc.x + pt.x / len, y: acc.y + pt.y / len }),
            { x: 0, y: 0 }
        );

        // ---- 3. Exponential moving average on top of rolling average ----
        if (!emaRef.current) {
            emaRef.current = { x: avg.x, y: avg.y };
        } else {
            emaRef.current = {
                x: EMA_ALPHA * avg.x + (1 - EMA_ALPHA) * emaRef.current.x,
                y: EMA_ALPHA * avg.y + (1 - EMA_ALPHA) * emaRef.current.y,
            };
        }

        const smoothed = {
            x: Math.round(emaRef.current.x),
            y: Math.round(emaRef.current.y),
        };

        currentGazeRef.current = smoothed;

        window.dispatchEvent(
            new CustomEvent('gazeupdate', { detail: smoothed })
        );
    }, []);

    // -------- startGaze --------

    const startGaze = useCallback(async () => {
        if (activeRef.current && webgazerRef.current) return true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach((t) => t.stop());
        } catch {
            console.warn('[GazeContext] Webcam access denied.');
            setGazeAvailable(false);
            return false;
        }

        try {
            const webgazer = await loadWebGazerLocal();

            // Use ridge regression for better accuracy
            if (webgazer.setRegression) {
                webgazer.setRegression('ridge');
            }

            // Show video & face overlay so we can grab those DOM elements,
            // then we'll reposition them into our own PiP preview
            webgazer.showVideoPreview(true);
            webgazer.showPredictionPoints(false);
            webgazer.showFaceOverlay(true);
            webgazer.showFaceFeedbackBox(true);

            webgazer.setGazeListener(gazeListener);
            await webgazer.begin();

            // Hide the default gaze dot
            webgazer.showPredictionPoints(false);
            const wgGazeDot = document.getElementById('webgazerGazeDot');
            if (wgGazeDot) wgGazeDot.style.display = 'none';

            // Grab references to the WebGazer-created DOM elements
            const wgVideoContainer = document.getElementById('webgazerVideoContainer');
            const wgVideo = document.getElementById('webgazerVideoFeed');
            const wgFaceCanvas = document.getElementById('webgazerFaceOverlay');
            const wgFaceFeedback = document.getElementById('webgazerFaceFeedbackBox');

            // Store refs so CameraPreview can use them
            videoElementRef.current = wgVideo || null;
            faceCanvasRef.current = wgFaceCanvas || null;

            // Hide the default WebGazer container (we'll render our own PiP)
            if (wgVideoContainer) {
                wgVideoContainer.style.position = 'fixed';
                wgVideoContainer.style.top = '-9999px';
                wgVideoContainer.style.left = '-9999px';
                wgVideoContainer.style.width = '320px';
                wgVideoContainer.style.height = '240px';
                wgVideoContainer.style.opacity = '0';
                wgVideoContainer.style.pointerEvents = 'none';
            }
            // Also hide feedback box
            if (wgFaceFeedback) wgFaceFeedback.style.display = 'none';

            webgazerRef.current = webgazer;
            setGazeAvailable(true);
            setGazeActive(true);
            return true;
        } catch (err) {
            console.error('[GazeContext] Failed to initialise WebGazer:', err);
            setGazeAvailable(false);
            return false;
        }
    }, [gazeListener]);

    // -------- stopGaze --------

    const stopGaze = useCallback(() => {
        try {
            if (webgazerRef.current) {
                webgazerRef.current.end();
                webgazerRef.current = null;
            }
        } catch (err) {
            console.warn('[GazeContext] Error stopping WebGazer:', err);
        }
        smoothBufferRef.current = [];
        emaRef.current = null;
        currentGazeRef.current = null;
        videoElementRef.current = null;
        faceCanvasRef.current = null;
        setGazeActive(false);
    }, []);

    // -------- Cleanup on unmount --------

    useEffect(() => {
        return () => {
            try {
                if (webgazerRef.current) {
                    webgazerRef.current.end();
                    webgazerRef.current = null;
                }
            } catch { /* noop */ }
        };
    }, []);

    // -------- Context value --------

    const value = {
        gazeAvailable,
        gazeActive,
        currentGazeRef,
        isCalibrated,
        startGaze,
        stopGaze,
        setCalibrated: handleSetCalibrated,
        webgazerRef,
        /** DOM refs for camera preview / eye-pin overlay */
        videoElementRef,
        faceCanvasRef,
    };

    return <GazeContext.Provider value={value}>{children}</GazeContext.Provider>;
}

// --------------- Hook ---------------

export function useGaze() {
    const ctx = useContext(GazeContext);
    if (!ctx) {
        throw new Error('useGaze must be used within a <GazeProvider>');
    }
    return ctx;
}

export default GazeContext;

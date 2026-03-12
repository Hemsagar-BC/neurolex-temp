import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GameWrapper from "../../components/games/GameWrapper";
import GameResult from "../../components/games/GameResult";
import useGameSession from "../../hooks/useGameSession";
import { getDifficultyConfig } from "../../utils/difficultyEngine";

const STORAGE_KEY = "clap_trap_difficulty";
const TOTAL_ROUNDS = 8;
const SYLLABLES = ["ba", "ta", "da", "ka", "pa", "ma", "na", "la"];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function timingWindow(level) {
  // ±200ms at level 1 → ±80ms at level 5
  return 200 - (level - 1) * 30;
}

function generateSequence(length) {
  const seq = [];
  for (let i = 0; i < length; i++) {
    seq.push(i === length - 1 ? "CLAP!" : pickRandom(SYLLABLES));
  }
  return seq;
}

/* ── Web Audio ── */
let audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function scheduleBeep(ctx, time, freq = 880, dur = 0.06) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.18, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + dur);
}

export default function ClapTrap() {
  const [difficulty, setDifficulty] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Math.max(1, Math.min(5, Number(saved))) : 1;
  });
  const [phase, setPhase] = useState("ready");
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState([]);
  const [beatIdx, setBeatIdx] = useState(-1);
  const [roundState, setRoundState] = useState("waiting"); // waiting | playing | feedback
  const [feedback, setFeedback] = useState(null); // "perfect"|"good"|"missed"
  const [clapPressed, setClapPressed] = useState(false);
  const [resultData, setResultData] = useState(null);

  const clapTimeRef = useRef(null);
  const beatTimesRef = useRef([]);
  const rafRef = useRef(null);
  const startTimeRef = useRef(0);
  const roundStartRef = useRef(0);

  const config = useMemo(() => getDifficultyConfig("clap_trap", difficulty), [difficulty]);
  const session = useGameSession("clap_trap", "test-user");

  const bpm = config.bpm;
  const seqLength = config.sequenceLength;
  const window_ = timingWindow(difficulty);

  /* ── Start game ── */
  const startGame = useCallback(async () => {
    setRoundIdx(0);
    setScore(0);
    setFeedback(null);
    setResultData(null);
    setClapPressed(false);
    setPhase("playing");
    await session.startSession(difficulty);
    startRound(0);
  }, [difficulty, session, seqLength, bpm]);

  /* ── Start a round ── */
  const startRound = useCallback(
    (idx) => {
      const seq = generateSequence(seqLength);
      setSequence(seq);
      setBeatIdx(-1);
      setRoundState("playing");
      setFeedback(null);
      setClapPressed(false);
      clapTimeRef.current = null;
      roundStartRef.current = Date.now();

      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();

      const beatInterval = 60 / bpm;
      const now = ctx.currentTime + 0.15; // small lookahead
      const times = [];

      for (let i = 0; i < seq.length; i++) {
        const t = now + i * beatInterval;
        times.push(t);
        // Schedule metronome beep — lower pitch for normal beats, higher for clap beat
        const isClap = i === seq.length - 1;
        scheduleBeep(ctx, t, isClap ? 1200 : 880, 0.06);
      }

      beatTimesRef.current = times;
      startTimeRef.current = now;

      // Drive beat index via rAF for visual sync
      const tick = () => {
        const ct = ctx.currentTime;
        let current = -1;
        for (let i = times.length - 1; i >= 0; i--) {
          if (ct >= times[i] - 0.02) {
            current = i;
            break;
          }
        }
        setBeatIdx(current);

        const lastBeat = times[times.length - 1];
        if (ct < lastBeat + beatInterval + 0.3) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Round ended
          evaluateRound(idx);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [seqLength, bpm]
  );

  /* ── Player claps ── */
  const handleClap = useCallback(() => {
    if (roundState !== "playing" || clapPressed) return;
    setClapPressed(true);
    const ctx = getCtx();
    clapTimeRef.current = ctx.currentTime;
  }, [roundState, clapPressed]);

  /* ── Evaluate round ── */
  const evaluateRound = useCallback(
    (idx) => {
      cancelAnimationFrame(rafRef.current);
      const clapBeatTime = beatTimesRef.current[beatTimesRef.current.length - 1];
      const clapTime = clapTimeRef.current;
      const rt = Date.now() - roundStartRef.current;

      let result;
      if (clapTime == null) {
        result = "missed";
        session.recordAttempt(false, rt);
      } else {
        const diff = Math.abs(clapTime - clapBeatTime) * 1000; // ms
        const perfectWindow = window_ * 0.5;
        if (diff <= perfectWindow) {
          result = "perfect";
          setScore((s) => s + 25);
          session.recordAttempt(true, rt);
        } else if (diff <= window_) {
          result = "good";
          setScore((s) => s + 10);
          session.recordAttempt(true, rt);
        } else {
          result = "missed";
          session.recordAttempt(false, rt);
        }
      }

      setFeedback(result);
      setRoundState("feedback");

      setTimeout(() => {
        const next = idx + 1;
        if (next >= TOTAL_ROUNDS) {
          finishGame();
        } else {
          setRoundIdx(next);
          startRound(next);
        }
      }, 1400);
    },
    [window_, session]
  );

  /* ── Finish game ── */
  const finishGame = useCallback(async () => {
    setPhase("result");
    const result = await session.endSession();
    const next = result?.nextDifficulty ?? difficulty;
    localStorage.setItem(STORAGE_KEY, String(next));
    setResultData({
      score,
      accuracy: session.accuracy,
      avgReactionTime: session.avgReactionTime,
      nextDifficulty: next,
      currentDifficulty: difficulty,
    });
  }, [session, difficulty, score]);

  /* ── Cleanup ── */
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const handlePlayAgain = useCallback(() => {
    if (resultData) setDifficulty(resultData.nextDifficulty);
    setPhase("ready");
  }, [resultData]);

  const handleGoHome = useCallback(() => window.history.back(), []);

  /* ── Ready ── */
  if (phase === "ready") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <span className="text-7xl mb-4 block">👏</span>
          <h1 className="text-4xl font-black text-white mb-2">Clap Trap</h1>
          <p className="text-white/50 mb-1">Level: {config.label}</p>
          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-1">
            <p className="text-white/40 text-sm">🎵 BPM: {bpm} · Beats: {seqLength} · Rounds: {TOTAL_ROUNDS}</p>
            <p className="text-white/40 text-sm">Press CLAP on the final beat!</p>
            <p className="text-white/40 text-sm">Timing window: ±{window_}ms</p>
          </div>
          <button onClick={startGame} className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-colors">
            Start →
          </button>
        </motion.div>
      </div>
    );
  }

  /* ── Result ── */
  if (phase === "result" && resultData) {
    return (
      <GameResult
        score={resultData.score}
        accuracy={resultData.accuracy}
        avgReactionTime={resultData.avgReactionTime}
        nextDifficulty={resultData.nextDifficulty}
        currentDifficulty={resultData.currentDifficulty}
        onPlayAgain={handlePlayAgain}
        onGoHome={handleGoHome}
        gameType="clap_trap"
      />
    );
  }

  /* ── Playing ── */
  const isClap = beatIdx === sequence.length - 1;

  return (
    <GameWrapper title="Clap Trap" difficulty={difficulty} timeLimit={0} onTimeUp={() => {}} onExit={handleGoHome} score={score}>
      {/* Round counter */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-3">
        <span className="text-white/40 text-sm">Round {roundIdx + 1}/{TOTAL_ROUNDS}</span>
        <span className="text-rose-400/80 text-sm font-medium">{bpm} BPM</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
        {/* Pulse circle */}
        <motion.div
          animate={
            beatIdx >= 0
              ? {
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 1, 0.6],
                }
              : { scale: 1, opacity: 0.3 }
          }
          transition={
            beatIdx >= 0
              ? { duration: 60 / bpm * 0.8, ease: "easeInOut" }
              : {}
          }
          key={beatIdx}
          className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full ${
            isClap ? "bg-rose-500/40 ring-4 ring-rose-400" : "bg-cyan-500/30 ring-2 ring-cyan-500/40"
          }`}
        />

        {/* Sequence dots */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
          {sequence.map((syl, i) => {
            const isPast = i < beatIdx;
            const isCurrent = i === beatIdx;
            const isUpcoming = i > beatIdx;
            const isClapBeat = i === sequence.length - 1;

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <motion.div
                  animate={
                    isCurrent
                      ? { scale: [1, 1.4, 1], transition: { duration: 0.3, repeat: 0 } }
                      : { scale: 1 }
                  }
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                    isPast
                      ? "bg-white/20 text-white/40"
                      : isCurrent
                      ? isClapBeat
                        ? "bg-rose-500 text-white shadow-lg shadow-rose-500/40"
                        : "bg-cyan-500 text-white shadow-lg shadow-cyan-500/40"
                      : isUpcoming
                      ? "bg-white/5 text-white/20 ring-1 ring-white/10"
                      : "bg-white/5 text-white/20"
                  }`}
                >
                  {isClapBeat ? "👏" : "♪"}
                </motion.div>
                <span
                  className={`text-[10px] sm:text-xs font-medium ${
                    isCurrent ? (isClapBeat ? "text-rose-400" : "text-cyan-400") : "text-white/30"
                  }`}
                >
                  {syl}
                </span>
              </div>
            );
          })}
        </div>

        {/* CLAP button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleClap}
          disabled={roundState !== "playing" || clapPressed}
          className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full text-3xl font-black transition-all duration-150 ${
            clapPressed
              ? feedback === "perfect"
                ? "bg-green-600 text-white ring-4 ring-green-400"
                : feedback === "good"
                ? "bg-yellow-500 text-white ring-4 ring-yellow-400"
                : "bg-white/10 text-white/40"
              : "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 cursor-pointer shadow-lg shadow-rose-600/30"
          }`}
        >
          {clapPressed ? (feedback === "perfect" ? "✓" : feedback === "good" ? "~" : "👏") : "👏"}
          <span className="block text-base font-bold mt-1">CLAP</span>
        </motion.button>

        {/* Feedback */}
        <AnimatePresence>
          {roundState === "feedback" && feedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {feedback === "perfect" && (
                <p className="text-green-400 text-2xl font-black">Perfect! +25 🎯</p>
              )}
              {feedback === "good" && (
                <p className="text-yellow-400 text-2xl font-black">Good! +10 👍</p>
              )}
              {feedback === "missed" && (
                <p className="text-red-400 text-2xl font-black">Missed 😕</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameWrapper>
  );
}
/**
 * Web Speech API utility for text-to-speech
 * Child-friendly voice with clear pronunciation
 */

export const speakWelcome = (studentName: string) => {
  try {
    // Check if browser supports Web Speech API
    const SpeechSynthesisUtterance =
      window.SpeechSynthesisUtterance ||
      (window as any).webkitSpeechSynthesisUtterance;

    if (!SpeechSynthesisUtterance) {
      console.warn("Web Speech API not supported");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis?.cancel();

    const text = `Welcome ${studentName}! Let's learn!`;
    const utterance = new SpeechSynthesisUtterance(text);

    // Configure for child-friendly speech
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.2; // Slightly higher pitch
    utterance.volume = 1;

    // Try to use a female voice for friendliness
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(
      (v) => v.name.toLowerCase().includes("female") ||
             v.name.toLowerCase().includes("woman") ||
             v.name.toLowerCase().includes("karen")
    );

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Text-to-speech error:", error);
  }
};

/**
 * Load available voices (call after page load)
 */
export const loadVoices = () => {
  try {
    window.speechSynthesis?.getVoices();
  } catch {
    // Silently fail if not available
  }
};

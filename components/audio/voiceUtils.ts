/**
 * Web Speech Audio Utilities for Socratic Voice Co-Pilot
 * Provides natural speech synthesis and browser-native speech recognition.
 */

export function cleanTextForSpeech(rawText: string): string {
  if (!rawText) return "";

  let cleaned = rawText
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, " [code snippet omitted] ")
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove headers, bold, italics, bullets
    .replace(/^#+\s+/gm, "")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Clean up excessive whitespace
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export function speakSocraticQuestion(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): SpeechSynthesisUtterance | null {
  if (!isSpeechSynthesisSupported()) {
    callbacks?.onError?.("Speech synthesis not supported in this browser.");
    return null;
  }

  stopSpeaking();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return null;

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Attempt to select a clear, natural English voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Natural") ||
        v.name.includes("Google") ||
        v.name.includes("Samantha") ||
        v.name.includes("Zira") ||
        v.name.includes("Daniel"))
  ) || voices.find((v) => v.lang.startsWith("en"));

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onstart = () => callbacks?.onStart?.();
  utterance.onend = () => callbacks?.onEnd?.();
  utterance.onerror = (e) => callbacks?.onError?.(e);

  try {
    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (err) {
    callbacks?.onError?.(err);
    return null;
  }
}


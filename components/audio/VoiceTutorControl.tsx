"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Square, Mic } from "lucide-react";
import {
  speakSocraticQuestion,
  stopSpeaking,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from "./voiceUtils";

// -------------------------------------------------------------
// 1. Message Audio Speaker (Speaks individual tutor turn aloud)
// -------------------------------------------------------------
interface MessageAudioSpeakerProps {
  text: string;
}

export const MessageAudioSpeaker: React.FC<MessageAudioSpeakerProps> = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isSpeechSynthesisSupported());
  }, []);

  if (!isSupported) return null;

  const handleToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakSocraticQuestion(text, {
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isSpeaking ? "Stop speaking" : "Listen to Socratic question"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 8px",
        borderRadius: "14px",
        background: isSpeaking ? "#FEE2E2" : "#F3F4F6",
        border: `1px solid ${isSpeaking ? "#FCA5A5" : "#E5E7EB"}`,
        color: isSpeaking ? "#DC2626" : "#4B5563",
        fontSize: "11px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {isSpeaking ? (
        <Square size={11} fill="currentColor" />
      ) : (
        <Volume2 size={12} />
      )}
      <span>{isSpeaking ? "Stop" : "Listen"}</span>
      {isSpeaking && (
        <span
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#DC2626",
            animation: "pulse 1s infinite",
          }}
        />
      )}
    </button>
  );
};

// -------------------------------------------------------------
// 2. Voice Dictation Mic (Speech-to-Text for learner input)
// -------------------------------------------------------------
interface VoiceDictationMicProps {
  onTranscript: (spokenText: string) => void;
  disabled?: boolean;
}

export const VoiceDictationMic: React.FC<VoiceDictationMicProps> = ({
  onTranscript,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  const toggleListening = () => {
    if (disabled || !supported) return;

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        if (event.results[current].isFinal) {
          onTranscript(transcript);
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[VoiceDictation] Error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("[VoiceDictation] Failed to initialize recognition:", err);
      setIsListening(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? "Listening... click to stop" : "Speak your answer (Speech-to-Text)"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        background: isListening ? "#EF4444" : "#F3F4F6",
        border: `1px solid ${isListening ? "#DC2626" : "#D1D5DB"}`,
        color: isListening ? "#FFFFFF" : "#374151",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        boxShadow: isListening ? "0 0 10px rgba(239, 68, 68, 0.5)" : "none",
      }}
    >
      {isListening ? (
        <Square size={15} fill="currentColor" />
      ) : (
        <Mic size={16} />
      )}
    </button>
  );
};

// -------------------------------------------------------------
// 3. Voice Session Header Toggle (Auto-Speak Switch)
// -------------------------------------------------------------
interface VoiceSessionHeaderToggleProps {
  autoSpeak: boolean;
  onToggle: (nextState: boolean) => void;
}

export const VoiceSessionHeaderToggle: React.FC<VoiceSessionHeaderToggleProps> = ({
  autoSpeak,
  onToggle,
}) => {
  return (
    <button
      type="button"
      onClick={() => onToggle(!autoSpeak)}
      title="Toggle auto-speaking tutor questions"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "6px",
        background: autoSpeak ? "#ECFDF5" : "transparent",
        border: `1px solid ${autoSpeak ? "#10B981" : "var(--rule-2)"}`,
        color: autoSpeak ? "#065F46" : "var(--muted)",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {autoSpeak ? (
        <Volume2 size={13} style={{ color: "#059669" }} />
      ) : (
        <VolumeX size={13} />
      )}
      <span>{autoSpeak ? "Voice Mode: ON" : "Voice Mode: OFF"}</span>
    </button>
  );
};

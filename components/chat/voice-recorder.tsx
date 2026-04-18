/// <reference lib="dom" />
"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

// Map next-intl locale -> BCP-47 tag accepted by the SpeechRecognition / TTS APIs.
// Browsers reject bare 'en'/'fr' for some engines; pin a region for predictability.
function localeToBCP47(locale: string): string {
  switch (locale) {
    case "fr": return "fr-FR";
    case "en": return "en-US";
    default:   return locale; // forward through (caller may pass already-tagged value)
  }
}

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
}

export function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const locale = useLocale();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }, []);

  function toggle() {
    if (!supported) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR() as any;
    recognition.lang = localeToBCP47(locale);
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "Arrêter l'enregistrement" : "Dicter (STT)"}
      className={cn(
        "p-2 transition-colors",
        listening
          ? "text-[var(--danger)] animate-[pulse-dot_1s_ease-in-out_infinite]"
          : "text-[var(--text-muted)] hover:text-white"
      )}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}

interface TTSButtonProps {
  text: string;
}

export function TTSButton({ text }: TTSButtonProps) {
  const locale = useLocale();
  const [speaking, setSpeaking] = useState(false);

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = localeToBCP47(locale);
    utter.rate = 1.0;
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
  }

  return (
    <button
      onClick={toggle}
      title={speaking ? "Arrêter la lecture" : "Lire à voix haute"}
      className={cn(
        "p-1 transition-colors",
        speaking ? "text-[var(--success)]" : "text-[var(--text-muted)] hover:text-white"
      )}
    >
      {speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
    </button>
  );
}

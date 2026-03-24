"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TranscriptMessage } from "./transcript-sidebar";

interface TextViewProps {
  messages: TranscriptMessage[];
  stream: MediaStream | null;
  onSendText: (text: string) => void;
}

export function TextView({ messages, stream, onSendText }: TextViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setInput("");
  }

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Camera PiP */}
      <div className="absolute right-4 top-4 z-10 overflow-hidden rounded-lg border-2 border-neutral-border shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-28 w-36 bg-black object-cover"
          aria-label="Your camera feed"
        />
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <p className="py-16 text-center text-sm text-text-secondary">
            The exam will begin shortly. Questions will appear here.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            className={cn(
              "flex",
              msg.speaker === "ai" ? "justify-start" : "justify-end",
            )}
          >
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.speaker === "ai"
                  ? "rounded-tl-sm bg-blue-50 text-blue-900"
                  : "rounded-tr-sm bg-primary text-white",
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Text input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-neutral-border bg-white px-4 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your response…"
          className="flex-1 rounded-lg border border-neutral-border bg-neutral-bg px-4 py-2.5 text-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Type your response"
        />
        <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send response">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

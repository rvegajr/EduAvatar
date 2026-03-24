"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TranscriptMessage } from "./transcript-sidebar";

interface TextViewProps {
  messages: TranscriptMessage[];
  onSendText: (text: string) => void;
  videoStream: MediaStream | null;
}

export function TextView({
  messages,
  onSendText,
  videoStream,
}: TextViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, onSendText]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="absolute right-4 top-4 z-10 overflow-hidden rounded-lg border-2 border-neutral-border shadow-lg">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          width={160}
          height={120}
          className="bg-black object-cover"
          style={{ width: 160, height: 120 }}
          aria-label="Your camera feed"
        />
      </div>

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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex items-end gap-2 border-t border-neutral-border bg-white px-4 py-3"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response… (Shift+Enter for new line)"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-neutral-border bg-neutral-bg px-4 py-2.5 text-sm leading-relaxed placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Type your response"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim()}
          aria-label="Send response"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

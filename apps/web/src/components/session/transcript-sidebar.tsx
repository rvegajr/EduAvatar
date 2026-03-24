"use client";

import { useEffect, useRef, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TranscriptMessage {
  speaker: "ai" | "student";
  text: string;
  timestamp: number;
}

interface TranscriptSidebarProps {
  messages: TranscriptMessage[];
}

export function TranscriptSidebar({ messages }: TranscriptSidebarProps) {
  const [open, setOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  return (
    <aside
      className={cn(
        "flex flex-col border-l border-neutral-border bg-white transition-all duration-300",
        open ? "w-80" : "w-12",
      )}
      aria-label="Transcript"
    >
      <div className="flex items-center justify-between border-b border-neutral-border p-3">
        {open && <h2 className="text-sm font-semibold text-text-primary">Transcript</h2>}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded-md p-1 text-text-secondary hover:bg-neutral-bg transition-colors"
          aria-label={open ? "Collapse transcript" : "Expand transcript"}
        >
          {open ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-xs text-text-secondary text-center py-8">
              The conversation transcript will appear here.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={`${msg.timestamp}-${i}`}
              className={cn(
                "rounded-lg px-3 py-2 text-sm leading-relaxed",
                msg.speaker === "ai"
                  ? "bg-blue-50 text-blue-900"
                  : "bg-neutral-bg text-text-primary",
              )}
            >
              <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide opacity-60">
                {msg.speaker === "ai" ? "Examiner" : "You"}
              </span>
              {msg.text}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

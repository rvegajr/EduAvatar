"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Wifi, WifiOff, Coffee } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/use-socket";
import { useMedia } from "@/hooks/use-media";
import { LockdownOverlay } from "@/components/lockdown/lockdown-overlay";
import { TimerDisplay } from "@/components/session/timer-display";
import {
  TranscriptSidebar,
  type TranscriptMessage,
} from "@/components/session/transcript-sidebar";
import { AvatarView } from "@/components/session/avatar-view";
import { AudioView } from "@/components/session/audio-view";
import { TextView } from "@/components/session/text-view";
import { Button } from "@/components/ui/button";

type Modality = "avatar" | "audio" | "text";

interface TimerInfo {
  maxTimeSeconds: number | null;
  startedAt: string;
}

interface SessionConfig {
  modality: Modality;
  lockdownEnabled: boolean;
  allowBreaks: boolean;
  timerInfo: TimerInfo | null;
}

export default function ExamSessionPage() {
  const { examId } = useParams<{ examId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("sid") ?? "";

  const { socket, connected, emit, on, off } = useSocket(sessionId);
  const {
    stream,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    error: mediaError,
  } = useMedia({ audio: true, video: true });

  const [modality, setModality] = useState<Modality>("avatar");
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [questionAudio, setQuestionAudio] = useState<string | null>(null);
  const [timerInfo, setTimerInfo] = useState<TimerInfo>({
    maxTimeSeconds: null,
    startedAt: "",
  });
  const [breakStatus, setBreakStatus] = useState<
    "none" | "confirming" | "active" | "denied"
  >("none");
  const [allowBreaks, setAllowBreaks] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [timerVisible, setTimerVisible] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [silencePrompt, setSilencePrompt] = useState<string | null>(null);
  const [lockdownEnabled, setLockdownEnabled] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((msg: string, duration = 5000) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function loadSession() {
      try {
        const config = await api.get<SessionConfig>(
          `/sessions/${sessionId}/config`,
        );
        if (cancelled) return;
        setModality(config.modality);
        setLockdownEnabled(config.lockdownEnabled);
        setAllowBreaks(config.allowBreaks);
        if (config.timerInfo) setTimerInfo(config.timerInfo);
      } catch {
        const savedModality = sessionStorage.getItem(
          `exam:${sessionId}:modality`,
        );
        if (savedModality && !cancelled)
          setModality(savedModality as Modality);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!socket) return;

    function handleQuestionAsk(data: {
      questionText: string;
      audioUrl?: string;
      isFollowup: boolean;
    }) {
      setMessages((prev) => [
        ...prev,
        { speaker: "ai", text: data.questionText, timestamp: Date.now() },
      ]);
      setCurrentQuestion(data.questionText);
      setSpeaking(true);

      if (data.audioUrl && modality !== "text") {
        setQuestionAudio(data.audioUrl);
      }

      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
      speakingTimerRef.current = setTimeout(() => setSpeaking(false), 8000);
    }

    function handleTimerStart(data: {
      maxTimeSeconds: number;
      startedAt: string;
    }) {
      setTimerInfo({
        maxTimeSeconds: data.maxTimeSeconds,
        startedAt: data.startedAt,
      });
    }

    function handleTimeReminder(data: { remainingSeconds: number }) {
      const mins = Math.floor(data.remainingSeconds / 60);
      const label =
        data.remainingSeconds <= 120
          ? `${data.remainingSeconds} seconds remaining`
          : `${mins} minute${mins !== 1 ? "s" : ""} remaining`;
      showToast(label, 6000);
    }

    function handleSilenceEscalate(data: { message: string }) {
      setSilencePrompt(data.message);
    }

    function handleBreakAskConfirm() {
      setBreakStatus("confirming");
    }

    function handleBreakApproved() {
      setBreakStatus("active");
    }

    function handleBreakDenied() {
      setBreakStatus("denied");
      showToast("Break request denied. The exam will continue.", 3000);
      setTimeout(() => setBreakStatus("none"), 3000);
    }

    function handleSessionEnd(data: { reason: string }) {
      setSessionEnded(true);
      showToast(`Exam ended: ${data.reason}`);
      setTimeout(() => router.push(`/exam/${examId}/complete`), 2000);
    }

    function handleViseme() {
      setSpeaking(true);
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
      speakingTimerRef.current = setTimeout(() => setSpeaking(false), 300);
    }

    function handleError(data: { message: string }) {
      showToast(`Error: ${data.message}`, 8000);
    }

    type AnyHandler = (...args: never[]) => void;

    on("question:ask" as never, handleQuestionAsk as AnyHandler);
    on("timer:start" as never, handleTimerStart as AnyHandler);
    on("time:reminder" as never, handleTimeReminder as AnyHandler);
    on("silence:escalate" as never, handleSilenceEscalate as AnyHandler);
    on("break:ask_confirm" as never, handleBreakAskConfirm as AnyHandler);
    on("break:approved" as never, handleBreakApproved as AnyHandler);
    on("break:denied" as never, handleBreakDenied as AnyHandler);
    on("session:end" as never, handleSessionEnd as AnyHandler);
    on("avatar:viseme" as never, handleViseme as AnyHandler);
    on("error" as never, handleError as AnyHandler);

    return () => {
      off("question:ask" as never, handleQuestionAsk as AnyHandler);
      off("timer:start" as never, handleTimerStart as AnyHandler);
      off("time:reminder" as never, handleTimeReminder as AnyHandler);
      off("silence:escalate" as never, handleSilenceEscalate as AnyHandler);
      off("break:ask_confirm" as never, handleBreakAskConfirm as AnyHandler);
      off("break:approved" as never, handleBreakApproved as AnyHandler);
      off("break:denied" as never, handleBreakDenied as AnyHandler);
      off("session:end" as never, handleSessionEnd as AnyHandler);
      off("avatar:viseme" as never, handleViseme as AnyHandler);
      off("error" as never, handleError as AnyHandler);

      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    };
  }, [socket, on, off, modality, examId, router, showToast]);

  const handleAudioChunk = useCallback(
    (chunk: ArrayBuffer) => {
      emit("audio:chunk" as never, { sessionId, chunk } as never);
    },
    [emit, sessionId],
  );

  const handleSendText = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        { speaker: "student", text, timestamp: Date.now() },
      ]);
      emit("response:text" as never, { sessionId, text } as never);
    },
    [emit, sessionId],
  );

  const handleBreakRequest = useCallback(() => {
    emit("break:request" as never, { sessionId } as never);
  }, [emit, sessionId]);

  const handleBreakConfirm = useCallback(
    (confirmed: boolean) => {
      emit(
        "break:confirm" as never,
        { sessionId, confirmed } as never,
      );
      if (!confirmed) setBreakStatus("none");
    },
    [emit, sessionId],
  );

  return (
    <LockdownOverlay
      enabled={lockdownEnabled}
      sessionId={sessionId}
      socket={
        socket
          ? { emit: (e: string, d: unknown) => socket.emit(e as never, d as never) }
          : null
      }
    >
      <div className="flex h-screen flex-col bg-neutral-bg">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-neutral-border bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <Wifi className="h-3.5 w-3.5" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                <WifiOff className="h-3.5 w-3.5" />
                Reconnecting…
              </span>
            )}
          </div>

          <TimerDisplay
            maxTimeSeconds={timerInfo.maxTimeSeconds}
            startedAt={timerInfo.startedAt}
            visible={timerVisible}
            onToggleVisibility={() => setTimerVisible((v) => !v)}
          />
        </header>

        {/* Main content + sidebar */}
        <div className="flex flex-1 overflow-hidden">
          <main className="relative flex flex-1 flex-col overflow-hidden p-4">
            {modality === "avatar" && (
              <AvatarView
                stream={stream}
                onAudioChunk={handleAudioChunk}
                questionAudio={questionAudio}
                speaking={speaking}
              />
            )}
            {modality === "audio" && (
              <AudioView
                stream={stream}
                onAudioChunk={handleAudioChunk}
                questionAudio={questionAudio}
                speaking={speaking}
              />
            )}
            {modality === "text" && (
              <TextView
                messages={messages}
                onSendText={handleSendText}
                videoStream={stream}
              />
            )}

            {/* Break button */}
            {allowBreaks && (
              <div className="absolute bottom-4 left-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBreakRequest}
                  disabled={breakStatus !== "none"}
                  className="gap-1.5"
                >
                  <Coffee className="h-4 w-4" />
                  Break
                </Button>
              </div>
            )}
          </main>

          <TranscriptSidebar
            messages={messages}
            open={transcriptOpen}
            onToggle={() => setTranscriptOpen((o) => !o)}
          />
        </div>

        {/* Toast notification */}
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl transition-all duration-300",
            toast
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0 pointer-events-none",
          )}
          role="status"
        >
          {toast}
        </div>

        {/* Silence escalation prompt */}
        {silencePrompt && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
              <p className="mb-4 text-sm text-text-primary">{silencePrompt}</p>
              <Button size="sm" onClick={() => setSilencePrompt(null)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Break confirmation dialog */}
        {breakStatus === "confirming" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 max-w-sm rounded-xl bg-white p-6 text-center shadow-2xl">
              <Coffee className="mx-auto mb-3 h-8 w-8 text-amber-500" />
              <h3 className="mb-2 text-lg font-semibold text-text-primary">
                Take a Break?
              </h3>
              <p className="mb-5 text-sm text-text-secondary">
                The exam timer will continue during your break. You may need to
                verify your identity when you return.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBreakConfirm(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={() => handleBreakConfirm(true)}>
                  Take Break
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Break active overlay */}
        {breakStatus === "active" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 max-w-sm rounded-xl bg-white p-8 text-center shadow-2xl">
              <Coffee className="mx-auto mb-4 h-10 w-10 text-amber-500" />
              <h3 className="mb-2 text-xl font-bold text-text-primary">
                Break Active
              </h3>
              <p className="mb-6 text-sm text-text-secondary">
                Take your time. The exam will resume when you return.
              </p>
              <Button onClick={() => setBreakStatus("none")}>
                I&apos;m Back
              </Button>
            </div>
          </div>
        )}

        {/* Session ended overlay */}
        {sessionEnded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 max-w-sm rounded-xl bg-white p-8 text-center shadow-2xl">
              <h3 className="mb-2 text-xl font-bold text-text-primary">
                Exam Complete
              </h3>
              <p className="text-sm text-text-secondary">Redirecting…</p>
            </div>
          </div>
        )}

        {/* Media error banner */}
        {mediaError && (
          <div className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-center bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            {mediaError}
          </div>
        )}
      </div>
    </LockdownOverlay>
  );
}

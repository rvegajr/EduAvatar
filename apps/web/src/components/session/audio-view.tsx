"use client";

import { useEffect, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioViewProps {
  stream: MediaStream | null;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onAudioChunk: (chunk: Blob) => void;
  aiSpeaking: boolean;
}

export function AudioView({
  stream,
  audioEnabled,
  onToggleAudio,
  onAudioChunk,
  aiSpeaking,
}: AudioViewProps) {
  const aiCanvasRef = useRef<HTMLCanvasElement>(null);
  const studentCanvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // AI waveform placeholder (simulated when speaking)
  useEffect(() => {
    const canvas = aiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    let frame = 0;

    function draw() {
      frame++;
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w * window.devicePixelRatio;
      canvas!.height = h * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const barCount = 40;
      const barW = w / barCount;
      const mid = h / 2;

      for (let i = 0; i < barCount; i++) {
        const amp = aiSpeaking
          ? (Math.sin(frame * 0.1 + i * 0.4) * 0.5 + 0.5) * mid * 0.9
          : 2;
        ctx.fillStyle = aiSpeaking ? "hsl(217, 91%, 60%)" : "hsl(217, 20%, 80%)";
        ctx.fillRect(i * barW + 1, mid - amp, barW - 2, amp * 2);
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [aiSpeaking]);

  // Student audio waveform
  useEffect(() => {
    if (!stream) return;
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);

    const canvas = studentCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let raf: number;

    function draw() {
      raf = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w * window.devicePixelRatio;
      canvas!.height = h * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const barW = (w / bufferLength) * 2;
      const mid = h / 2;
      let x = (w - barW * bufferLength) / 2;

      for (let i = 0; i < bufferLength; i++) {
        const amp = (dataArray[i] / 255) * mid * 0.9;
        ctx.fillStyle = `hsl(152, 68%, ${45 + (dataArray[i] / 255) * 15}%)`;
        ctx.fillRect(x, mid - amp, barW - 1, amp * 2);
        x += barW;
      }
    }
    draw();
    return () => {
      cancelAnimationFrame(raf);
      audioCtx.close();
    };
  }, [stream]);

  // Recording
  const startRecording = useCallback(() => {
    if (!stream || recorderRef.current?.state === "recording") return;
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) onAudioChunk(e.data);
    };
    recorder.start(250);
    recorderRef.current = recorder;
  }, [stream, onAudioChunk]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    if (audioEnabled && stream) startRecording();
    else stopRecording();
    return stopRecording;
  }, [audioEnabled, stream, startRecording, stopRecording]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <div className="w-full max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
          {aiSpeaking ? "Examiner is speaking" : "Listening"}
        </p>
        <canvas
          ref={aiCanvasRef}
          className="h-32 w-full rounded-xl bg-slate-900"
          aria-label="Examiner audio visualization"
        />
      </div>

      <div className="w-full max-w-2xl">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-text-secondary">
          Your microphone
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleAudio}
            className={cn(
              "shrink-0 rounded-full p-3 transition-colors",
              audioEnabled
                ? "bg-primary text-white hover:bg-primary-hover"
                : "bg-red-100 text-red-600 hover:bg-red-200",
            )}
            aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <canvas
            ref={studentCanvasRef}
            className="h-16 flex-1 rounded-lg bg-neutral-bg"
            aria-label="Your audio input level"
          />
        </div>
      </div>
    </div>
  );
}

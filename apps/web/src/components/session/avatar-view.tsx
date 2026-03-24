"use client";

import { useEffect, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarViewProps {
  stream: MediaStream | null;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onAudioChunk: (chunk: Blob) => void;
  speaking: boolean;
}

export function AvatarView({
  stream,
  audioEnabled,
  onToggleAudio,
  onAudioChunk,
  speaking,
}: AvatarViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const animFrameRef = useRef<number>(0);

  // Three.js-style animated sphere placeholder on 2D canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let frame = 0;

    function draw() {
      frame++;
      const w = canvas!.width;
      const h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.22;
      const pulse = speaking ? Math.sin(frame * 0.08) * 12 : Math.sin(frame * 0.02) * 4;
      const radius = baseRadius + pulse;

      const grad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
      grad.addColorStop(0, "#93c5fd");
      grad.addColorStop(0.7, "#3b82f6");
      grad.addColorStop(1, "#1e3a8a");

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(draw);
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [speaking]);

  // Audio waveform visualization
  useEffect(() => {
    if (!stream) return;
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const waveCanvas = waveCanvasRef.current;
    if (!waveCanvas) return;
    const ctx = waveCanvas.getContext("2d")!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let raf: number;
    function drawWave() {
      raf = requestAnimationFrame(drawWave);
      analyser.getByteFrequencyData(dataArray);
      const w = waveCanvas!.offsetWidth;
      const h = waveCanvas!.offsetHeight;
      waveCanvas!.width = w * window.devicePixelRatio;
      waveCanvas!.height = h * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const barW = (w / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barH = (dataArray[i] / 255) * h;
        ctx.fillStyle = `hsl(217, 91%, ${50 + (dataArray[i] / 255) * 20}%)`;
        ctx.fillRect(x, h - barH, barW - 1, barH);
        x += barW;
      }
    }
    drawWave();

    return () => {
      cancelAnimationFrame(raf);
      audioCtx.close();
    };
  }, [stream]);

  // Audio recording -> chunks
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
    if (audioEnabled && stream) {
      startRecording();
    } else {
      stopRecording();
    }
    return stopRecording;
  }, [audioEnabled, stream, startRecording, stopRecording]);

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      <div className="relative flex aspect-square w-full max-w-lg items-center justify-center rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          aria-label="AI Avatar"
          role="img"
          style={{ width: "100%", height: "100%" }}
        />
        {speaking && (
          <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            Speaking
          </span>
        )}
      </div>

      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleAudio}
            className={cn(
              "rounded-full p-3 transition-colors",
              audioEnabled
                ? "bg-primary text-white hover:bg-primary-hover"
                : "bg-red-100 text-red-600 hover:bg-red-200",
            )}
            aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {audioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          <canvas
            ref={waveCanvasRef}
            className="h-12 flex-1 rounded-lg bg-neutral-bg"
            aria-label="Your audio input level"
          />
        </div>
      </div>
    </div>
  );
}

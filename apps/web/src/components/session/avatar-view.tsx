"use client";

import { useEffect, useRef, useCallback } from "react";

interface AvatarViewProps {
  stream: MediaStream | null;
  onAudioChunk: (chunk: ArrayBuffer) => void;
  questionAudio: string | null;
  speaking: boolean;
}

export function AvatarView({
  stream,
  onAudioChunk,
  questionAudio,
  speaking,
}: AvatarViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

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
      const float = Math.sin(frame * 0.02) * 6;
      const pulse = speaking ? Math.sin(frame * 0.08) * 14 : 0;
      const radius = baseRadius + float + pulse;

      if (speaking) {
        const glow = ctx.createRadialGradient(
          cx,
          cy + float * 0.5,
          radius,
          cx,
          cy + float * 0.5,
          radius * 1.6,
        );
        glow.addColorStop(0, "rgba(59,130,246,0.25)");
        glow.addColorStop(1, "rgba(59,130,246,0)");
        ctx.beginPath();
        ctx.arc(cx, cy + float * 0.5, radius * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      const grad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3 + float * 0.5,
        radius * 0.1,
        cx,
        cy + float * 0.5,
        radius,
      );
      grad.addColorStop(0, "#93c5fd");
      grad.addColorStop(0.7, "#3b82f6");
      grad.addColorStop(1, "#1e3a8a");

      ctx.beginPath();
      ctx.arc(cx, cy + float * 0.5, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        cx - radius * 0.25,
        cy - radius * 0.25 + float * 0.5,
        radius * 0.12,
        0,
        Math.PI * 2,
      );
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

  useEffect(() => {
    if (!stream) return;
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

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
      ctx.setTransform(
        window.devicePixelRatio,
        0,
        0,
        window.devicePixelRatio,
        0,
        0,
      );
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

  useEffect(() => {
    if (!questionAudio) return;
    const audio = new Audio(questionAudio);
    audioElRef.current = audio;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [questionAudio]);

  const startRecording = useCallback(() => {
    if (!stream || recorderRef.current?.state === "recording") return;
    const recorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });
    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        const buffer = await e.data.arrayBuffer();
        onAudioChunk(buffer);
      }
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
    if (stream) startRecording();
    else stopRecording();
    return stopRecording;
  }, [stream, startRecording, stopRecording]);

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
        <canvas
          ref={waveCanvasRef}
          className="h-12 w-full rounded-lg bg-neutral-bg"
          aria-label="Your audio input level"
        />
      </div>
    </div>
  );
}

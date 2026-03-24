"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AudioViewProps {
  stream: MediaStream | null;
  onAudioChunk: (chunk: ArrayBuffer) => void;
  questionAudio: string | null;
  speaking: boolean;
}

const BAR_COUNT = 7;

export function AudioView({
  stream,
  onAudioChunk,
  questionAudio,
  speaking,
}: AudioViewProps) {
  const studentCanvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

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
      ctx.setTransform(
        window.devicePixelRatio,
        0,
        0,
        window.devicePixelRatio,
        0,
        0,
      );
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

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => i);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes eq-bounce {
              0%, 100% { transform: scaleY(0.08); }
              50% { transform: scaleY(1); }
            }
          `,
        }}
      />

      <div className="w-full max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
          {speaking ? "Examiner is speaking" : "Listening"}
        </p>
        <div className="flex h-40 items-center justify-center gap-2 rounded-xl bg-slate-900 p-6">
          {bars.map((i) => (
            <div
              key={i}
              className={cn(
                "w-3 rounded-full origin-center",
                speaking ? "bg-blue-400" : "bg-slate-600",
              )}
              style={{
                height: "100%",
                animation: speaking
                  ? `eq-bounce ${0.5 + i * 0.12}s ease-in-out ${i * 0.07}s infinite`
                  : "none",
                transform: speaking ? undefined : "scaleY(0.06)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-text-secondary">
          Your microphone
        </p>
        <canvas
          ref={studentCanvasRef}
          className="h-16 w-full rounded-lg bg-neutral-bg"
          aria-label="Your audio input level"
        />
      </div>
    </div>
  );
}

"use client";

import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";

export interface VideoPlayerHandle {
  seekTo: (timeMs: number) => void;
}

interface VideoPlayerProps {
  src: string;
  onTimeUpdate: (currentTimeMs: number) => void;
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ src, onTimeUpdate }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [rate, setRate] = useState<number>(1);

    useImperativeHandle(ref, () => ({
      seekTo(timeMs: number) {
        if (videoRef.current) {
          videoRef.current.currentTime = timeMs / 1000;
          videoRef.current.play().catch(() => {});
        }
      },
    }));

    const handleTimeUpdate = useCallback(() => {
      if (videoRef.current) {
        onTimeUpdate(videoRef.current.currentTime * 1000);
      }
    }, [onTimeUpdate]);

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.playbackRate = rate;
      }
    }, [rate]);

    return (
      <div className="flex flex-col gap-2">
        <video
          ref={videoRef}
          src={src}
          controls
          onTimeUpdate={handleTimeUpdate}
          className="w-full rounded-lg bg-black"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-text-secondary">Speed:</span>
          {PLAYBACK_RATES.map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                rate === r
                  ? "bg-primary text-white"
                  : "bg-neutral-100 text-text-secondary hover:bg-neutral-200"
              )}
            >
              {r}x
            </button>
          ))}
        </div>
      </div>
    );
  }
);

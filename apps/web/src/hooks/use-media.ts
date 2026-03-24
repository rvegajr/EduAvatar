"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseMediaOptions {
  audio: boolean;
  video: boolean;
}

export function useMedia(options: UseMediaOptions) {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(options.audio);
  const [videoEnabled, setVideoEnabled] = useState(options.video);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function acquire() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: options.audio,
          video: options.video,
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof DOMException
              ? err.name === "NotAllowedError"
                ? "Permission denied. Please allow camera and microphone access."
                : `Device error: ${err.message}`
              : "Failed to access media devices.",
          );
        }
      }
    }

    if (options.audio || options.video) {
      acquire();
    }

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [options.audio, options.video]);

  const toggleAudio = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks();
    if (tracks?.length) {
      const next = !tracks[0].enabled;
      tracks.forEach((t) => (t.enabled = next));
      setAudioEnabled(next);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    const tracks = streamRef.current?.getVideoTracks();
    if (tracks?.length) {
      const next = !tracks[0].enabled;
      tracks.forEach((t) => (t.enabled = next));
      setVideoEnabled(next);
    }
  }, []);

  return { stream, audioEnabled, videoEnabled, toggleAudio, toggleVideo, error };
}

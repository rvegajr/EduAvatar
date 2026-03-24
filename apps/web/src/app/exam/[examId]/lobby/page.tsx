"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Mic,
  MonitorSmartphone,
  RefreshCw,
  User,
  Video,
  MessageSquareText,
  AudioLines,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";

/* ---------- Types ---------- */

type Modality = "avatar" | "audio" | "text";

interface ExamInfo {
  id: string;
  title: string;
  description?: string;
  settings: {
    idCheckEnabled: boolean;
    timeLimit: number | null;
    allowBreaks: boolean;
  };
}

type LobbyStep = "consent" | "setup" | "id-check" | "ready";

/* ---------- Helpers ---------- */

function resolveSteps(idCheckEnabled: boolean): LobbyStep[] {
  const steps: LobbyStep[] = ["consent", "setup"];
  if (idCheckEnabled) steps.push("id-check");
  steps.push("ready");
  return steps;
}

function stepLabel(step: LobbyStep): string {
  switch (step) {
    case "consent":
      return "Consent";
    case "setup":
      return "Setup";
    case "id-check":
      return "Verification";
    case "ready":
      return "Ready";
  }
}

/* ---------- Component ---------- */

export default function ExamLobbyPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();

  /* --- data --- */
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ExamInfo>(`/exams/${examId}`)
      .then(setExam)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load exam"))
      .finally(() => setLoading(false));
  }, [examId]);

  /* --- wizard state --- */
  const steps = useMemo(
    () => resolveSteps(exam?.settings.idCheckEnabled ?? false),
    [exam],
  );
  const [stepIdx, setStepIdx] = useState(0);
  const currentStep = steps[stepIdx] ?? "consent";

  const goNext = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => setStepIdx((i) => Math.max(i - 1, 0));

  /* --- step 1: consent --- */
  const [consented, setConsented] = useState(false);

  /* --- step 2: setup --- */
  const [modality, setModality] = useState<Modality>("avatar");
  const [micWorking, setMicWorking] = useState(false);
  const [camWorking, setCamWorking] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const micLevelRef = useRef<HTMLDivElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const testCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      mediaStreamRef.current = stream;
      setCamWorking(true);
    } catch {
      setCamWorking(false);
    }
  }, []);

  const testMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      setMicWorking(true);

      let raf: number;
      function animate() {
        raf = requestAnimationFrame(animate);
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const pct = Math.min(100, (avg / 128) * 100);
        if (micLevelRef.current) {
          micLevelRef.current.style.width = `${pct}%`;
        }
      }
      animate();

      // Auto-cleanup after 10s
      setTimeout(() => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
      }, 10000);
    } catch {
      setMicWorking(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* --- step 3: ID check --- */
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const idVideoRef = useRef<HTMLVideoElement>(null);
  const idStreamRef = useRef<MediaStream | null>(null);
  const [idCameraActive, setIdCameraActive] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<"id" | "face">("id");

  const startIdCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (idVideoRef.current) idVideoRef.current.srcObject = stream;
      idStreamRef.current = stream;
      setIdCameraActive(true);
    } catch {
      /* noop */
    }
  }, []);

  const capturePhoto = useCallback(() => {
    const video = idVideoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    if (captureTarget === "id") setIdPhoto(dataUrl);
    else setFacePhoto(dataUrl);
  }, [captureTarget]);

  useEffect(() => {
    return () => {
      idStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* --- step 4: ready --- */
  const [showTimer, setShowTimer] = useState(true);

  const handleBeginExam = async () => {
    try {
      const session = await api.post<{ sessionId: string }>(`/exams/${examId}/sessions`, {
        modality,
        showTimer,
        idPhoto,
        facePhoto,
      });
      router.push(`/exam/${examId}/session?sid=${session.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start exam");
    }
  };

  /* --- loading / error --- */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status">
          <span className="sr-only">Loading exam…</span>
        </div>
      </main>
    );
  }

  if (error || !exam) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-bg px-4">
        <p className="text-sm text-red-600">{error ?? "Exam not found."}</p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-neutral-bg px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        <nav className="mb-8 flex items-center justify-center gap-2" aria-label="Lobby steps">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  i < stepIdx
                    ? "bg-green-100 text-green-700"
                    : i === stepIdx
                      ? "bg-primary text-white"
                      : "bg-neutral-border text-text-secondary",
                )}
                aria-current={i === stepIdx ? "step" : undefined}
              >
                {i < stepIdx ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:inline",
                  i === stepIdx ? "text-text-primary" : "text-text-secondary",
                )}
              >
                {stepLabel(step)}
              </span>
              {i < steps.length - 1 && (
                <div className="mx-1 h-px w-8 bg-neutral-border" />
              )}
            </div>
          ))}
        </nav>

        {/* Step content */}
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            {/* ---- STEP 1: Consent ---- */}
            {currentStep === "consent" && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-text-primary">
                  {exam.title}
                </h1>
                {exam.description && (
                  <p className="text-sm text-text-secondary">{exam.description}</p>
                )}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                  This exam will be recorded. Your camera and microphone will be
                  active throughout. By proceeding, you consent to recording.
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consented}
                    onChange={(e) => setConsented(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-border text-primary focus:ring-primary"
                    aria-label="I consent to recording"
                  />
                  <span className="text-sm text-text-primary">
                    I have read and agree to the recording terms above.
                  </span>
                </label>
                {!consented && (
                  <p className="text-xs text-text-secondary" role="alert">
                    Consent is required to take this exam.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button onClick={goNext} disabled={!consented}>
                    Continue
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ---- STEP 2: Modality + Device Setup ---- */}
            {currentStep === "setup" && (
              <div className="space-y-8">
                <div>
                  <h2 className="mb-4 text-lg font-semibold text-text-primary">
                    Choose Your Exam Modality
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {([
                      { key: "avatar" as Modality, label: "Avatar", desc: "Interact with an AI avatar", icon: User },
                      { key: "audio" as Modality, label: "Audio", desc: "Voice-only conversation", icon: AudioLines },
                      { key: "text" as Modality, label: "Text", desc: "Text-based chat exam", icon: MessageSquareText },
                    ]).map(({ key, label, desc, icon: Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setModality(key)}
                        className={cn(
                          "flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all",
                          modality === key
                            ? "border-primary bg-blue-50 shadow-sm"
                            : "border-neutral-border bg-white hover:border-neutral-300",
                        )}
                        aria-pressed={modality === key}
                      >
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-full",
                            modality === key ? "bg-primary text-white" : "bg-neutral-bg text-text-secondary",
                          )}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold text-text-primary">{label}</span>
                        <span className="text-xs text-text-secondary">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="mb-4 text-lg font-semibold text-text-primary">
                    Device Check
                  </h2>

                  {/* Camera preview */}
                  <div className="mb-4 overflow-hidden rounded-lg border border-neutral-border bg-black">
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      className="mx-auto h-48 w-full max-w-sm object-cover"
                      aria-label="Camera preview"
                    />
                  </div>

                  {/* Mic level */}
                  <div className="mb-4">
                    <p className="mb-1.5 text-xs font-medium text-text-secondary">
                      Microphone Level
                    </p>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-bg">
                      <div
                        ref={micLevelRef}
                        className="h-full rounded-full bg-green-500 transition-[width] duration-75"
                        style={{ width: "0%" }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" size="sm" onClick={testMicrophone}>
                      <Mic className="mr-1.5 h-4 w-4" />
                      Test Microphone
                    </Button>
                    <Button variant="outline" size="sm" onClick={testCamera}>
                      <Camera className="mr-1.5 h-4 w-4" />
                      Test Camera
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <span className={cn("flex items-center gap-1", micWorking ? "text-green-600" : "text-text-secondary")}>
                      {micWorking ? <Check className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                      Microphone {micWorking ? "working" : "not tested"}
                    </span>
                    <span className={cn("flex items-center gap-1", camWorking ? "text-green-600" : "text-text-secondary")}>
                      {camWorking ? <Check className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                      Camera {camWorking ? "working" : "not tested"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={goBack}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={goNext} disabled={!micWorking || !camWorking}>
                    Continue
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ---- STEP 3: ID Verification ---- */}
            {currentStep === "id-check" && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-text-primary">
                  Identity Verification
                </h2>
                <p className="text-sm text-text-secondary">
                  Please capture a photo of your student ID and a photo of your face.
                </p>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* ID Card */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-text-primary">Student ID</p>
                    {idPhoto ? (
                      <div className="relative">
                        <img
                          src={idPhoto}
                          alt="Captured student ID"
                          className="w-full rounded-lg border border-neutral-border"
                        />
                        <button
                          type="button"
                          onClick={() => setIdPhoto(null)}
                          className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-text-secondary hover:bg-white"
                          aria-label="Retake ID photo"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCaptureTarget("id");
                          startIdCamera();
                        }}
                        className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-border text-text-secondary hover:border-primary hover:text-primary transition-colors"
                        aria-label="Open camera to capture student ID"
                      >
                        <MonitorSmartphone className="h-8 w-8" />
                        <span className="text-xs font-medium">Capture ID</span>
                      </button>
                    )}
                  </div>

                  {/* Face */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-text-primary">Your Face</p>
                    {facePhoto ? (
                      <div className="relative">
                        <img
                          src={facePhoto}
                          alt="Captured face"
                          className="w-full rounded-lg border border-neutral-border"
                        />
                        <button
                          type="button"
                          onClick={() => setFacePhoto(null)}
                          className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-text-secondary hover:bg-white"
                          aria-label="Retake face photo"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCaptureTarget("face");
                          startIdCamera();
                        }}
                        className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-border text-text-secondary hover:border-primary hover:text-primary transition-colors"
                        aria-label="Open camera to capture face photo"
                      >
                        <User className="h-8 w-8" />
                        <span className="text-xs font-medium">Capture Face</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live camera preview for captures */}
                {idCameraActive && (!idPhoto || !facePhoto) && (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-lg border border-neutral-border bg-black">
                      <video
                        ref={idVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="mx-auto h-48 w-full max-w-sm object-cover"
                        aria-label="Camera preview for ID verification"
                      />
                    </div>
                    <div className="flex justify-center">
                      <Button onClick={capturePhoto}>
                        <Camera className="mr-1.5 h-4 w-4" />
                        Capture {captureTarget === "id" ? "ID Photo" : "Face Photo"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={goBack}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={goNext} disabled={!idPhoto || !facePhoto}>
                    Continue
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ---- STEP 4: Ready ---- */}
            {currentStep === "ready" && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-bold text-text-primary">
                  You&apos;re ready to begin!
                </h2>

                {exam.settings.timeLimit && (
                  <div className="space-y-3">
                    <p className="text-sm text-text-secondary">
                      Time limit:{" "}
                      <span className="font-semibold text-text-primary">
                        {exam.settings.timeLimit} minutes
                      </span>
                    </p>
                    <div className="flex justify-center">
                      <Toggle
                        checked={showTimer}
                        onChange={setShowTimer}
                        label="Show timer during exam"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-4 pt-2">
                  <Button variant="ghost" onClick={goBack}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button size="lg" onClick={handleBeginExam}>
                    Begin Exam
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

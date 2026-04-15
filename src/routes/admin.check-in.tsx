import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, RefreshCw, ScanLine } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { formatDateRangeLabel, formatTimeRangeLabel } from "#/features/events/display";
import { canAccessAdminApp } from "#/features/admin/auth";
import { checkInTicket, type CheckInResult } from "#/lib/api/tickets";
import { useAuthSession } from "#/lib/auth";

type Detector = {
  detect: (image: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

function canUseBarcodeDetector() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

function createQrDetector(): Detector | null {
  if (!canUseBarcodeDetector()) {
    return null;
  }

  try {
    // @ts-expect-error - BarcodeDetector is not in TS lib by default.
    return new window.BarcodeDetector({ formats: ["qr_code"] }) as Detector;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/admin/check-in")({
  component: AdminCheckInPage,
});

function AdminCheckInPage() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const accessToken = session?.access_token ?? "";

  const [code, setCode] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lastResult, setLastResult] = useState<CheckInResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const detector = useMemo(() => createQrDetector(), []);
  const barcodeSupported = Boolean(detector);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (!canAccessAdminApp(session)) {
      navigate({ to: "/" });
    }
  }, [navigate, session]);

  const checkInMutation = useMutation({
    mutationFn: async (ticketCode: string) => {
      if (!accessToken) {
        throw new Error("Please log in again.");
      }
      return checkInTicket(accessToken, ticketCode);
    },
    onSuccess: (result) => {
      setLastResult(result);
      const statusLabel = result.already_checked
        ? "Already checked in"
        : "Checked in";
      toast.success(statusLabel, {
        description: `${result.ticket.ticket_type_name} - ${result.ticket.event_title}`,
      });
    },
    onError: (error) => {
      toast.error("Unable to check in ticket", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  useEffect(() => {
    async function stopCamera() {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    async function startCamera() {
      setCameraError(null);

      if (!barcodeSupported) {
        setCameraError("QR scanning is not supported in this browser. Use manual entry.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        streamRef.current = stream;
        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const scan = async () => {
          if (!videoRef.current || !detector) {
            return;
          }

          try {
            const results = await detector.detect(videoRef.current);
            const rawValue =
              results.find((value) => typeof value.rawValue === "string")?.rawValue ??
              "";

            const normalized = String(rawValue ?? "").trim();
            if (normalized) {
              setCode(normalized);
              setIsCameraOpen(false);
              checkInMutation.mutate(normalized);
              return;
            }
          } catch {
            // Ignore intermittent detector errors.
          }

          animationRef.current = requestAnimationFrame(scan);
        };

        animationRef.current = requestAnimationFrame(scan);
      } catch (error) {
        setCameraError(
          error instanceof Error
            ? error.message
            : "Unable to access camera. Check browser permissions.",
        );
      }
    }

    if (isCameraOpen) {
      void startCamera();
    } else {
      void stopCamera();
    }

    return () => {
      void stopCamera();
    };
  }, [barcodeSupported, checkInMutation, detector, isCameraOpen]);

  if (!session || !canAccessAdminApp(session)) {
    return (
      <Card className="rounded-[2rem]">
        <CardContent className="p-8 text-sm text-muted-foreground">
          Preparing check-in tools...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-border/70 bg-card/90">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Ticket check-in
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold text-foreground">
                Scan a QR code
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                Use your camera to scan a ticket QR code, or paste the code manually.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-background"
              onClick={() => {
                setLastResult(null);
                setCode("");
              }}
            >
              <RefreshCw className="size-4" />
              Reset
            </Button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-background/60 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Camera scanner
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {barcodeSupported
                      ? "Point your camera at the QR code."
                      : "QR scanning not supported here - use manual entry."}
                  </p>
                </div>
                <Button
                  type="button"
                  className="rounded-full"
                  disabled={!barcodeSupported}
                  onClick={() => setIsCameraOpen((value) => !value)}
                >
                  <Camera className="size-4" />
                  {isCameraOpen ? "Stop" : "Start"}
                </Button>
              </div>

              {cameraError ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
                  {cameraError}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/70">
                <div className="aspect-video w-full bg-muted/20">
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-background/60 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Manual entry
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Paste the ticket code if you don&apos;t have camera access.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Ticket code"
                  className="h-12 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                <Button
                  type="button"
                  className="w-full rounded-full"
                  disabled={checkInMutation.isPending || code.trim().length === 0}
                  onClick={() => checkInMutation.mutate(code.trim())}
                >
                  <ScanLine className="size-4" />
                  {checkInMutation.isPending ? "Checking..." : "Check in ticket"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {lastResult ? (
        <Card className="rounded-[2rem] border-border/70 bg-card/90">
          <CardContent className="space-y-5 p-6 sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Result
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {lastResult.already_checked ? "Already checked in" : "Entry confirmed"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lastResult.ticket.ticket_type_name} - {lastResult.ticket.event_title}
                </p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {lastResult.ticket.checked_in_at
                  ? `Checked in ${new Date(lastResult.ticket.checked_in_at).toLocaleTimeString()}`
                  : "Valid"}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Session
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {formatDateRangeLabel(
                    lastResult.ticket.session_starts_at,
                    lastResult.ticket.session_ends_at,
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatTimeRangeLabel(
                    lastResult.ticket.session_starts_at,
                    lastResult.ticket.session_ends_at,
                  )}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Order
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {lastResult.ticket.order_number}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Code {lastResult.ticket.code}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}


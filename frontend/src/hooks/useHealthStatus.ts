import { useCallback, useEffect, useState } from "react";

export type HealthStatus = "checking" | "connected" | "error";

async function measureHealthLatency(signal?: AbortSignal): Promise<number> {
  const startedAt = performance.now();
  const response = await fetch("/health", { signal });
  if (!response.ok) throw new Error("Health check failed");
  return Math.round(performance.now() - startedAt);
}

export function useHealthStatus() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const checkHealth = useCallback(async () => {
    setStatus("checking");
    setLatencyMs(null);

    try {
      setLatencyMs(await measureHealthLatency());
      setStatus("connected");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    measureHealthLatency(controller.signal)
      .then((latency) => {
        setLatencyMs(latency);
        setStatus("connected");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });

    return () => controller.abort();
  }, []);

  return { status, latencyMs, checkHealth };
}

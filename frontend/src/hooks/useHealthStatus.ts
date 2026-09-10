import { useCallback, useEffect, useState } from "react";

export type HealthStatus = "checking" | "connected" | "error";

export function useHealthStatus() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const checkHealth = useCallback(async () => {
    setStatus("checking");
    setLatencyMs(null);
    const startedAt = performance.now();

    try {
      const response = await fetch("/health");
      if (!response.ok) throw new Error("Health check failed");

      setLatencyMs(Math.round(performance.now() - startedAt));
      setStatus("connected");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  return { status, latencyMs, checkHealth };
}

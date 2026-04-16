"use client";

import { useState, useEffect } from "react";
import { browserBackendFetch } from "@/lib/backend-client";

/**
 * Hook to fetch the current user's plan from the backend.
 * Returns { plan, loading }.
 * Defaults to "free" if the backend is unreachable.
 */
export function usePlan() {
  const [plan, setPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPlan() {
      try {
        const res = await browserBackendFetch("/api/billing/plan");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setPlan(data.plan || "free");
          }
        }
      } catch {
        // Default to free if backend is unreachable
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPlan();
    return () => { cancelled = true; };
  }, []);

  return { plan, loading };
}

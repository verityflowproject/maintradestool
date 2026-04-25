'use client';

import { useEffect, useState } from 'react';
import type { PlanState } from '@/lib/planState';

export interface PlanStateResponse extends PlanState {
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  subscriptionPlan: 'monthly' | 'annual' | null;
}

interface Cache {
  data: PlanStateResponse;
  fetchedAt: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes
let cache: Cache | null = null;
let inflight: Promise<PlanStateResponse> | null = null;

async function fetchPlanState(): Promise<PlanStateResponse> {
  if (inflight) return inflight;

  inflight = fetch('/api/user/plan-state')
    .then(async (res) => {
      if (!res.ok) throw new Error('Failed to fetch plan state');
      const data = (await res.json()) as PlanStateResponse;
      cache = { data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function revalidatePlanState(): void {
  cache = null;
}

export function usePlanState(): {
  state: PlanStateResponse | null;
  loading: boolean;
  refresh: () => void;
} {
  const [state, setState] = useState<PlanStateResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
      setState(cache.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPlanState()
      .then((data) => setState(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    loading,
    refresh: () => {
      revalidatePlanState();
      load();
    },
  };
}

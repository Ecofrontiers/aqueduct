/**
 * Load static Hedera data from public/data/ JSON files.
 * This provides Actions + Orgs without requiring Supabase write access.
 * When Supabase is wired, these merge with live data.
 */

import { useState, useEffect } from "react";
import type { Action, Org } from "../types";

interface StaticHederaData {
  actions: Action[];
  orgs: Org[];
  loading: boolean;
}

export function useStaticHederaData(): StaticHederaData {
  const [actions, setActions] = useState<Action[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [actionsRes, orgsRes] = await Promise.all([
          fetch("/data/hedera-actions.json"),
          fetch("/data/hedera-orgs.json"),
        ]);

        if (cancelled) return;

        if (actionsRes.ok) {
          const data = await actionsRes.json();
          setActions(data);
        }

        if (orgsRes.ok) {
          const data = await orgsRes.json();
          setOrgs(data);
        }
      } catch (err) {
        console.warn("Failed to load static Hedera data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { actions, orgs, loading };
}

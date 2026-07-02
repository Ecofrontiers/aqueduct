/**
 * custody-store.ts — the persistence layer for in-flight cross-custodian RE-ROUTES.
 *
 * A re-route (e.g. an eBay-bought slab shipped to a vault to be tokenized) is PHYSICAL and
 * MULTI-DAY — it cannot complete inside one loop run (ROUTES §5.1). The orchestrator stages the
 * exit list behind it; this store is the "state module" the adapter comments defer to. It holds
 * each open leg's move handle PLUS the resume context (cost basis, oracle mark, exit venue/price)
 * so a LATER run can poll the move and, on arrival/mint, advance the staged list to live on the
 * exit venue — re-opening the position from the persisted basis (no fabricated P&L).
 *
 * Honesty: a leg stays `awaiting-shipment`/`in-transit`/`received`/`processing` until something
 * REAL records arrival (a tracker, the vault's mint confirmation, or an operator confirmation via
 * `recordArrival`). The store NEVER advances a move to `completed` on its own — no fabricated mint.
 *
 * Two backings ship: `InMemoryCustodyStore` (default; persists across runLoop calls in one
 * process — enough for the long-lived web server) and `FileCustodyStore` (a JSON file; persists
 * across process restarts for a real bare-metal agent loop,).
 */

import type { CustodyDestination, CustodyMoveHandle, Marketplace } from "./adapters/index.ts";

/** The status set mirrors CustodyMoveHandle.status (the physical-move lifecycle). */
export type RerouteStatus = CustodyMoveHandle["status"];

/** One in-flight re-route leg + everything needed to RESUME the staged list when it completes. */
export interface RerouteLeg {
  moveId: string;
  productId: string;
  name?: string;
  grade: string;
  grader: string;
  // ── the staged exit waiting on the other side of the move ──
  exitMarketplace: Marketplace;
  fromCustody: CustodyDestination;
  toCustody: CustodyDestination;
  listAtUsd: number;
  projectedExitFeesUsd: number;
  // ── P&L resume context (the position must re-open from the SAME basis, not be re-derived) ──
  costBasisUsd: number;
  basisIsLive: boolean;
  oracleValueUsd: number;
  oracleTier: string;
  oracleFreshness: string;
  oracleUrl?: string;
  certHash?: string;
  // ── live move state ──
  status: RerouteStatus;
  trackingNumber?: string;
  nextCheckpoint?: string;
  /** The tokenized asset id once the slab has arrived + minted at the exit custody (listable). */
  tokenId?: string;
  openedAt: string;
  /** Set once the staged list has been advanced (live or honestly-staged) — the leg is then closed. */
  resolvedListingId?: string;
}

export interface CustodyMoveStore {
  /** Persist a newly-initiated re-route leg (idempotent on moveId). */
  open(leg: RerouteLeg): void;
  /** Fetch one leg by moveId. */
  get(moveId: string): RerouteLeg | null;
  /** Every leg that has NOT yet been resolved (advanced to a list) — what a resume run polls. */
  listOpen(): RerouteLeg[];
  /** Merge a partial update (status/tracking/checkpoint refresh). */
  update(moveId: string, patch: Partial<RerouteLeg>): void;
  /**
   * Record a REAL arrival/mint (a tracker, the vault scan, or an operator confirmation). Sets
   * status=`completed` and the listable `tokenId`. This is the ONLY way a leg becomes completable
   * — the store never fabricates it.
   */
  recordArrival(moveId: string, info?: { tokenId?: string }): void;
  /** Mark the leg resolved (its staged list has been advanced) — drops it from listOpen(). */
  resolve(moveId: string, resolvedListingId?: string): void;
}

/** In-memory store — persists across runLoop calls within one process (the web-server case). */
export class InMemoryCustodyStore implements CustodyMoveStore {
  private readonly legs = new Map<string, RerouteLeg>();

  open(leg: RerouteLeg): void {
    if (!this.legs.has(leg.moveId)) this.legs.set(leg.moveId, { ...leg });
  }
  get(moveId: string): RerouteLeg | null {
    const l = this.legs.get(moveId);
    return l ? { ...l } : null;
  }
  listOpen(): RerouteLeg[] {
    return [...this.legs.values()].filter((l) => !l.resolvedListingId && l.status !== "failed").map((l) => ({ ...l }));
  }
  update(moveId: string, patch: Partial<RerouteLeg>): void {
    const l = this.legs.get(moveId);
    if (l) this.legs.set(moveId, { ...l, ...patch });
  }
  recordArrival(moveId: string, info?: { tokenId?: string }): void {
    const l = this.legs.get(moveId);
    if (l) this.legs.set(moveId, { ...l, status: "completed", tokenId: info?.tokenId ?? l.tokenId });
  }
  resolve(moveId: string, resolvedListingId?: string): void {
    const l = this.legs.get(moveId);
    if (l) this.legs.set(moveId, { ...l, resolvedListingId: resolvedListingId ?? `resolved:${moveId}` });
  }
}

/**
 * File-backed store — a JSON file that survives process restarts (the bare-metal agent loop).
 * Small N (open legs), so read-modify-write per op is fine. Falls back to empty on a missing
 * file; never throws on a read miss.
 */
export class FileCustodyStore implements CustodyMoveStore {
  private readonly path: string;
  private readonly fs: typeof import("fs");

  constructor(path: string, fsImpl?: typeof import("fs")) {
    this.path = path;
    // Lazy require keeps this module importable in non-Node contexts (tests use InMemory).
    this.fs = fsImpl ?? (globalThis as unknown as { require?: (m: string) => typeof import("fs") }).require?.("fs")!;
    if (!this.fs) throw new Error("FileCustodyStore needs a Node fs module (pass fsImpl or run under Node).");
  }

  private read(): Record<string, RerouteLeg> {
    try {
      const txt = this.fs.readFileSync(this.path, "utf-8");
      return txt ? (JSON.parse(txt) as Record<string, RerouteLeg>) : {};
    } catch {
      return {};
    }
  }
  private write(all: Record<string, RerouteLeg>): void {
    this.fs.writeFileSync(this.path, JSON.stringify(all, null, 2));
  }

  open(leg: RerouteLeg): void {
    const all = this.read();
    if (!all[leg.moveId]) {
      all[leg.moveId] = leg;
      this.write(all);
    }
  }
  get(moveId: string): RerouteLeg | null {
    return this.read()[moveId] ?? null;
  }
  listOpen(): RerouteLeg[] {
    return Object.values(this.read()).filter((l) => !l.resolvedListingId && l.status !== "failed");
  }
  update(moveId: string, patch: Partial<RerouteLeg>): void {
    const all = this.read();
    if (all[moveId]) {
      all[moveId] = { ...all[moveId], ...patch };
      this.write(all);
    }
  }
  recordArrival(moveId: string, info?: { tokenId?: string }): void {
    const all = this.read();
    if (all[moveId]) {
      all[moveId] = { ...all[moveId], status: "completed", tokenId: info?.tokenId ?? all[moveId].tokenId };
      this.write(all);
    }
  }
  resolve(moveId: string, resolvedListingId?: string): void {
    const all = this.read();
    if (all[moveId]) {
      all[moveId] = { ...all[moveId], resolvedListingId: resolvedListingId ?? `resolved:${moveId}` };
      this.write(all);
    }
  }
}

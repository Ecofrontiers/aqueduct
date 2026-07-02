/**
 * custody-store.test.ts — the re-route persistence layer (in-memory + file-backed).
 *
 * Proves: open/get/listOpen/update/recordArrival/resolve semantics, the "never fabricate a
 * completion" rule (a leg stays in-flight until recordArrival), and that the file store survives
 * a fresh instance over the SAME backing (the cross-process continuation primitive).
 */
import { InMemoryCustodyStore, FileCustodyStore, type RerouteLeg } from "../lib/custody-store.ts";
import { ok, eq, section } from "./assert.ts";

function leg(moveId: string): RerouteLeg {
  return {
    moveId,
    productId: "base4-15",
    grade: "8",
    grader: "PSA",
    exitMarketplace: "beezie",
    fromCustody: "psa-vault",
    toCustody: "onchain-base",
    listAtUsd: 100,
    projectedExitFeesUsd: 8,
    costBasisUsd: 42,
    basisIsLive: false,
    oracleValueUsd: 100,
    oracleTier: "pc_sold",
    oracleFreshness: "fresh",
    status: "awaiting-shipment",
    openedAt: "2026-06-24T00:00:00.000Z",
  };
}

/** A tiny in-memory fs shim (readFileSync/writeFileSync) for the FileCustodyStore. */
function fakeFs(): typeof import("fs") {
  const files = new Map<string, string>();
  return {
    readFileSync: (p: string) => {
      if (!files.has(String(p))) throw new Error("ENOENT");
      return files.get(String(p))!;
    },
    writeFileSync: (p: string, data: string) => {
      files.set(String(p), String(data));
    },
  } as unknown as typeof import("fs");
}

function runStoreContract(make: () => InMemoryCustodyStore | FileCustodyStore, tag: string): void {
  section(`custody-store [${tag}]: open/get/listOpen + the no-fabricated-completion rule`);
  const store = make();
  store.open(leg("m1"));
  store.open(leg("m1")); // idempotent — a second open does not duplicate
  eq(store.listOpen().length, 1, `${tag}: open is idempotent on moveId`);
  ok(store.get("m1")?.status === "awaiting-shipment", `${tag}: a fresh leg is in-flight (not completed)`);
  eq(store.get("missing"), null, `${tag}: get() of an unknown moveId is null`);

  store.update("m1", { status: "in-transit", trackingNumber: "1Z999" });
  eq(store.get("m1")?.status, "in-transit", `${tag}: update advances status`);
  eq(store.get("m1")?.trackingNumber, "1Z999", `${tag}: update merges fields`);
  eq(store.listOpen().length, 1, `${tag}: an in-transit leg is still OPEN (not completable yet)`);

  store.recordArrival("m1", { tokenId: "777" });
  eq(store.get("m1")?.status, "completed", `${tag}: recordArrival is the ONLY path to completed`);
  eq(store.get("m1")?.tokenId, "777", `${tag}: recordArrival sets the listable tokenId`);
  eq(store.listOpen().length, 1, `${tag}: a completed-but-unresolved leg is still listOpen (awaiting the relist)`);

  store.resolve("m1", "listing-123");
  eq(store.listOpen().length, 0, `${tag}: a resolved leg drops out of listOpen`);
  ok(store.get("m1")?.resolvedListingId === "listing-123", `${tag}: resolve records the advanced listing id`);
}

export async function run(): Promise<void> {
  runStoreContract(() => new InMemoryCustodyStore(), "in-memory");

  const fs = fakeFs();
  runStoreContract(() => new FileCustodyStore("/tmp/_reroute.json", fs), "file");

  section("custody-store [file]: a FRESH instance over the SAME file sees persisted legs (cross-process)");
  const fs2 = fakeFs();
  const a = new FileCustodyStore("/tmp/_reroute2.json", fs2);
  a.open(leg("m2"));
  a.update("m2", { status: "received" });
  // a brand-new instance pointed at the same backing must see the leg (the continuation primitive)
  const b = new FileCustodyStore("/tmp/_reroute2.json", fs2);
  eq(b.get("m2")?.status, "received", "file store persists across instances (survives a process restart)");
  eq(b.listOpen().length, 1, "the persisted leg is open to the fresh instance");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
  const { exitWithSummary } = await import("./assert.ts");
  exitWithSummary();
}

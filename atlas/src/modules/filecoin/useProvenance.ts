import { useState, useCallback } from "react";
import type { VerifiableProvenance, ImpactAggregate } from "../intelligence/types";
import type { Asset } from "../assets";
import {
  ingestAllSources,
  getAggregateImpact,
  getAllCachedProvenances,
  getProvenanceByCid,
  getProvenancesForAsset,
  getMatchedAssetIds,
  stampCidOnAll,
  batchUploadToFilecoin,
  type IngestProgress,
} from "./ProvenanceService";
import { useSynapse } from "./useSynapse";

export type ProvenanceState = {
  provenances: VerifiableProvenance[];
  aggregate: ImpactAggregate | null;
  ingestProgress: IngestProgress[];
  uploadProgress: { uploaded: number; total: number } | null;
  matchedAssetIds: string[];
  isIngesting: boolean;
  isUploading: boolean;
  error: string | null;
};

function hydrateFromCache(): Pick<
  ProvenanceState,
  "provenances" | "aggregate" | "matchedAssetIds"
> {
  const provenances = getAllCachedProvenances();
  if (provenances.length === 0) {
    return { provenances: [], aggregate: null, matchedAssetIds: [] };
  }
  return {
    provenances,
    aggregate: getAggregateImpact(provenances),
    matchedAssetIds: getMatchedAssetIds(),
  };
}

export function useProvenance() {
  const synapse = useSynapse();
  const [state, setState] = useState<ProvenanceState>(() => {
    const cached = hydrateFromCache();
    return {
      ...cached,
      ingestProgress: [],
      uploadProgress: null,
      isIngesting: false,
      isUploading: false,
      error: null,
    };
  });

  const ingest = useCallback(async (assets: Asset[], maxPerSource = 500) => {
    setState((s) => ({ ...s, isIngesting: true, error: null }));

    try {
      const provenances = await ingestAllSources(assets, (progress) => {
        setState((s) => ({ ...s, ingestProgress: progress }));
      }, maxPerSource);

      const aggregate = getAggregateImpact(provenances);
      const matchedAssetIds = getMatchedAssetIds();

      setState((s) => ({
        ...s,
        provenances,
        aggregate,
        matchedAssetIds,
        isIngesting: false,
      }));

      return provenances;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ingestion failed";
      setState((s) => ({ ...s, isIngesting: false, error: msg }));
      return [];
    }
  }, []);

  const uploadToFilecoin = useCallback(async () => {
    const provenances = getAllCachedProvenances();
    if (provenances.length === 0) {
      setState((s) => ({ ...s, error: "No provenances to upload" }));
      return;
    }

    if (!synapse.isFilecoinReady) {
      setState((s) => ({
        ...s,
        error: "Connect wallet to Filecoin Calibration first",
      }));
      return;
    }

    const connected = await synapse.connect();
    if (!connected) return;

    setState((s) => ({
      ...s,
      isUploading: true,
      uploadProgress: { uploaded: 0, total: 1 },
      error: null,
    }));

    try {
      // Bundle all provenances into a single JSON document — one upload, one CID
      const bundle = {
        attestor: "Regen Atlas",
        schemaVersion: "1.0",
        createdAt: new Date().toISOString(),
        provenanceCount: provenances.length,
        provenances,
      };

      const bundleJson = JSON.stringify(bundle, null, 2);
      const bundleBytes = new TextEncoder().encode(bundleJson);
      console.log(`[Upload] Bundle size: ${bundleBytes.length} bytes, ${provenances.length} provenances`);

      const result = await synapse.uploadRaw(bundleBytes);

      if (result) {
        // Stamp the bundle CID onto all provenances
        const bundleCid = result.pieceCid;
        console.log(`[Upload] Bundle CID: ${bundleCid} (${provenances.length} provenances)`);

        for (const p of provenances) {
          p.pieceCid = bundleCid;
        }

        const updated = getAllCachedProvenances();
        setState((s) => ({
          ...s,
          provenances: updated,
          aggregate: getAggregateImpact(updated),
          matchedAssetIds: getMatchedAssetIds(),
          isUploading: false,
          uploadProgress: null,
          error: null,
        }));
      } else {
        // uploadRaw already set the synapse error — surface it
        setState((s) => ({
          ...s,
          isUploading: false,
          uploadProgress: null,
          error: synapse.error || "Upload returned no result — check console",
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      console.error("[Upload] Failed:", err);
      setState((s) => ({
        ...s,
        isUploading: false,
        uploadProgress: null,
        error: msg,
      }));
    }
  }, [synapse]);

  const getProvenance = useCallback(
    (cid: string) => getProvenanceByCid(cid),
    []
  );

  const getAssetProvenances = useCallback(
    (assetId: string) => getProvenancesForAsset(assetId),
    []
  );

  const restoreCid = useCallback((cid: string) => {
    const count = stampCidOnAll(cid);
    if (count > 0) {
      const updated = getAllCachedProvenances();
      setState((s) => ({
        ...s,
        provenances: updated,
        aggregate: getAggregateImpact(updated),
        matchedAssetIds: getMatchedAssetIds(),
        error: null,
      }));
    }
  }, []);

  return {
    ...state,
    ingest,
    uploadToFilecoin,
    restoreCid,
    getProvenance,
    getAssetProvenances,
    synapseStatus: synapse.status,
    synapseError: synapse.error,
    isFilecoinReady: synapse.isFilecoinReady,
  };
}

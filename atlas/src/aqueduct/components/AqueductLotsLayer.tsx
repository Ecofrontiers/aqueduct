import React from "react";
import { Marker } from "react-map-gl";
import { useNavigate } from "react-router-dom";
import { useAqueductLots } from "../hooks/useAqueductLots";

/**
 * Aqueduct swarm-layer map markers — additive to the untouched Atlas base
 * map (DEMO-SPEC.md §2 "Visual identity"). Solid amber ring = LIVE read,
 * per DESIGN-BRIEF.md §3.1 stroke-provenance convention. Does not touch the
 * Supabase-backed `assets_published_view` pipeline or its clustering layer —
 * this is a separate marker set bolted onto the same MapBox instance.
 */
export function AqueductLotsLayer(): React.ReactElement | null {
  // liveRefetch: false — see useAqueductLots.ts UseAqueductLotsOptions doc.
  // Snapshot data is real (fetched this session); this only controls whether
  // a SECOND setState fires later from an async re-fetch on this particular
  // page.
  const { lots } = useAqueductLots({ liveRefetch: false });
  const navigate = useNavigate();

  if (!lots || lots.length === 0) return null;

  return (
    <>
      {lots.map((lot) => (
        <Marker
          key={lot.aqueduct_id}
          longitude={lot.map_marker.longitude}
          latitude={lot.map_marker.latitude}
          anchor="center"
          onClick={(e) => {
            e.originalEvent?.stopPropagation();
            navigate(`/lots/${lot.aqueduct_id}`);
          }}
        >
          <div
            title={`${lot.producer.initials} / ${lot.origin.region} — ${lot.variety} ${lot.process} — ${lot.quality.sca_score} SCA (${lot.provenance ?? "SNAPSHOT"})`}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "#ffb700",
              border: `2px solid ${lot.provenance === "LIVE" ? "#ffb700" : "transparent"}`,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
              cursor: "pointer",
            }}
          />
        </Marker>
      ))}
    </>
  );
}

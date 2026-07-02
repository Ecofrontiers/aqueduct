// B8 scaffold — Nature-MRV landscape schema + interop-gap scoring.
// Run scoreInteropGap() over seed.json (expanded from the BioInt 100+ DB) to produce
// mrv_landscape.json. railFit:'high' rows are the B4 interop targets / C2 partner funnel.

export interface MRVCompany {
  name: string;
  url: string;
  realm: 'terrestrial' | 'marine' | 'both' | 'cross';
  measures: string[];
  signalType: ('remote-sensing' | 'field' | 'eDNA' | 'acoustic' | 'IoT' | 'modelled')[];
  models: string[];
  chain: string | null;
  attestation: boolean;
  interopSurface: ('API' | 'export' | 'SaaS-only' | 'closed')[];
  region: string;
  segment: 'dMRV-SaaS' | 'data-platform' | 'consultancy' | 'registry' | 'marketplace';
  targetsFinance?: boolean;
  contact?: { person?: string; email?: string; role?: string };
  // derived (filled by scoreInteropGap)
  interopGapScore?: number;
  railFit?: 'high' | 'medium' | 'low';
}

// 0-5: how much RA's attestation rail adds = how big the gap RA fills.
export function scoreInteropGap(c: MRVCompany): { interopGapScore: number; railFit: MRVCompany['railFit'] } {
  let s = 0;
  const measures = c.measures.length > 0;
  if (measures && !c.attestation) s += 2;             // measures but no onchain attestation
  if (!c.attestation) s += 1;                          // self-reported, no audit trail
  if (c.interopSurface.some((i) => i === 'API' || i === 'export')) s += 1; // easy to plug RA under
  if (c.targetsFinance) s += 1;                        // needs credible KPI -> RA valuation+attestation
  if (c.chain && c.attestation) s -= 1;               // already onchain w/ own registry -> lower fit
  s = Math.max(0, Math.min(5, s));
  const railFit: MRVCompany['railFit'] = s >= 4 ? 'high' : s >= 2 ? 'medium' : 'low';
  return { interopGapScore: s, railFit };
}

export function scoreAll(rows: MRVCompany[]): MRVCompany[] {
  return rows
    .map((c) => ({ ...c, ...scoreInteropGap(c) }))
    .sort((a, b) => (b.interopGapScore! - a.interopGapScore!));
}

export function toContactCSV(rows: MRVCompany[]): string {
  const header = 'name,person,email,role,org,region,url';
  const lines = rows
    .filter((c) => c.contact)
    .map((c) =>
      [c.contact?.person ?? '', c.contact?.email ?? '', c.contact?.role ?? '', c.name, c.region, c.url]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    .map((l) => `"${''}",${l}`); // leading name col placeholder
  return [header, ...lines].join('\n');
}

export function partnerShortlist(rows: MRVCompany[]): string {
  const high = scoreAll(rows).filter((c) => c.railFit === 'high');
  const body = high
    .map((c) => `- **${c.name}** (${c.segment}, ${c.realm}) — score ${c.interopGapScore}/5 — ${c.url}`)
    .join('\n');
  return `# Partner shortlist — railFit: high (B4 interop targets / C2 funnel)\n\n${body}\n`;
}

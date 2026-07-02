import type { GlowWeeklyReport, GlowAuditFarm } from "../types";

// Glow archives are stored on Cloudflare R2 (public, no auth, CORS-enabled)
const GLOW_R2_BASE =
  "https://pub-7e0365747f054c9e85051df5f20fa815.r2.dev";

// filtered-data.json available from week 18+, has per-farm carbonCreditsProduced + powerOutput
export interface GlowFilteredFarm {
  hexlifiedPublicKey: string;
  carbonCreditsProduced: number;
  powerOutput: number;
  weeklyPayment: number;
  rollingImpactPoints: number;
  shortId?: number;
}

export async function fetchGlowWeeklyReport(
  week: number
): Promise<GlowWeeklyReport | null> {
  // Try filtered-data first (available from week 18+, richer data)
  const filteredUrl = `${GLOW_R2_BASE}/week-${week}/filtered-data.json`;
  try {
    const response = await fetch(filteredUrl);
    if (response.ok) {
      const farms: GlowFilteredFarm[] = await response.json();
      // powerOutput from filtered-data.json is in kWh — convert to MWh
      const totalMwh = farms.reduce((sum, f) => sum + (f.powerOutput ?? 0), 0) / 1000;
      const totalCarbon = farms.reduce(
        (sum, f) => sum + (f.carbonCreditsProduced ?? 0),
        0
      );
      return {
        weekNumber: week,
        year: 0, // protocol week number, not calendar year
        totalPowerOutputMWh: totalMwh,
        farmCount: farms.length,
        impactRate: totalCarbon,
      };
    }
  } catch {
    // fall through to raw-data
  }

  // Fallback to raw-data (available from week 8+)
  const rawUrl = `${GLOW_R2_BASE}/week-${week}/raw-data.json`;
  try {
    const response = await fetch(rawUrl);
    if (!response.ok) return null;
    const data = await response.json();
    const devices: Array<{ PowerOutputs: number[]; ImpactRates: number[] }> =
      data.Devices ?? [];

    // PowerOutputs from raw-data.json are per-slot Wh readings — convert sum to MWh
    const totalPower = devices.reduce(
      (sum, d) =>
        sum + (d.PowerOutputs?.reduce((s: number, v: number) => s + v, 0) ?? 0),
      0
    ) / 1e6;
    const totalImpact = devices.reduce(
      (sum, d) =>
        sum + (d.ImpactRates?.reduce((s: number, v: number) => s + v, 0) ?? 0),
      0
    );

    return {
      weekNumber: week,
      year: 0,
      totalPowerOutputMWh: totalPower,
      farmCount: devices.length,
      impactRate: totalImpact,
    };
  } catch {
    return null;
  }
}

// Glow protocol epoch: week 0 started approximately 2023-11-13
const GLOW_EPOCH_MS = new Date("2023-11-13T00:00:00Z").getTime();
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function estimateCurrentGlowWeek(): number {
  return Math.floor((Date.now() - GLOW_EPOCH_MS) / MS_PER_WEEK);
}

export async function fetchGlowRecentReports(
  count = 8
): Promise<GlowWeeklyReport[]> {
  const reports: GlowWeeklyReport[] = [];
  let week = estimateCurrentGlowWeek();

  // Find the latest available week (probe up to 20 weeks back)
  for (let probe = week; probe >= week - 20 && probe >= 8; probe--) {
    const report = await fetchGlowWeeklyReport(probe);
    if (report) {
      week = probe;
      reports.push(report);
      break;
    }
  }

  // Fetch remaining weeks backwards
  for (let i = 1; i < count && week - i >= 8; i++) {
    const report = await fetchGlowWeeklyReport(week - i);
    if (report) reports.push(report);
  }

  return reports;
}

export function aggregateGlowEnergy(
  reports: GlowWeeklyReport[]
): { totalMwh: number; farmCount: number; weeksCovered: number } {
  const totalMwh = reports.reduce((sum, r) => sum + r.totalPowerOutputMWh, 0);
  const farmCount = Math.max(...reports.map((r) => r.farmCount), 0);
  return { totalMwh, farmCount, weeksCovered: reports.length };
}

// Fetch per-farm data from the latest available weekly report
export async function fetchGlowFarmData(
  week?: number
): Promise<GlowFilteredFarm[]> {
  const targetWeek = week ?? estimateCurrentGlowWeek();

  // Probe to find latest available week
  for (let probe = targetWeek; probe >= targetWeek - 20 && probe >= 18; probe--) {
    const url = `${GLOW_R2_BASE}/week-${probe}/filtered-data.json`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch {
      continue;
    }
  }
  return [];
}

// Fetch audit farm list from Glow's audit page API
export async function fetchGlowAuditFarms(): Promise<GlowAuditFarm[]> {
  try {
    // Glow audit page serves JSON from their Next.js API
    const response = await fetch("https://glow.org/api/audits");
    if (response.ok) {
      const data = await response.json();
      // The API returns an array of audit farm objects
      const farms: GlowAuditFarm[] = (Array.isArray(data) ? data : data.farms ?? []).map(
        (f: Record<string, unknown>) => ({
          farmId: (f.farmId ?? f.id ?? "") as string,
          farmName: (f.farmName ?? f.humanReadableName ?? "") as string,
          shortId: f.activeShortIds
            ? (f.activeShortIds as number[])[0]
            : (f.shortId as number | undefined),
          coordinates: parseGlowCoordinates(f.address as Record<string, unknown> | undefined),
          panelCount: ((f.solarPanels as Record<string, unknown>)?.quantity as number) ?? 0,
          systemWattage: parseFloat(
            String((f.systemWattageOutput ?? "0")).replace(/[^0-9.]/g, "")
          ),
          weeklyCarbon: (f.adjustedWeeklyCarbonCredit ?? f.netCarbonCreditEarningWeekly ?? 0) as number,
          installationDate: (f.installationDate ?? "") as string,
        })
      );
      return farms.filter((f) => f.farmId);
    }
  } catch {
    // API not available — fall back to weekly data
  }

  // Fallback: extract farm identifiers from weekly filtered-data
  const farms = await fetchGlowFarmData();
  return farms
    .filter((f) => f.carbonCreditsProduced > 0)
    .map((f) => ({
      farmId: f.hexlifiedPublicKey,
      farmName: f.shortId ? `Glow Farm ${f.shortId}` : `Farm ${f.hexlifiedPublicKey.slice(0, 8)}`,
      shortId: f.shortId,
      panelCount: 0,
      systemWattage: 0,
      weeklyCarbon: f.carbonCreditsProduced,
      weeklyPower: f.powerOutput / 1000, // kWh → MWh
    }));
}

function parseGlowCoordinates(
  address?: Record<string, unknown>
): { lat: number; lng: number } | undefined {
  if (!address?.coordinates) return undefined;
  const coordStr = String(address.coordinates);
  // Format: "XX.XXXX° N, YY.YYYY° W"
  const parts = coordStr.split(",").map((s) => s.trim());
  if (parts.length !== 2) return undefined;

  const latMatch = parts[0].match(/([\d.]+)°?\s*([NS])/i);
  const lngMatch = parts[1].match(/([\d.]+)°?\s*([EW])/i);
  if (!latMatch || !lngMatch) return undefined;

  const lat = parseFloat(latMatch[1]) * (latMatch[2].toUpperCase() === "S" ? -1 : 1);
  const lng = parseFloat(lngMatch[1]) * (lngMatch[2].toUpperCase() === "W" ? -1 : 1);
  return { lat, lng };
}

export function getGlowSourceMeta(week: number) {
  return {
    protocol: "glow" as const,
    endpoint: `${GLOW_R2_BASE}/week-${week}/filtered-data.json`,
    queryParams: { week: String(week) },
    fetchedAt: new Date().toISOString(),
  };
}

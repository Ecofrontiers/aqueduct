// B2 scaffold — DuckDB-WASM init + Farmscapes GeoParquet spatial queries.
// Drop into src/data/. Zero-server: all spatial processing runs in the browser.
import * as duckdb from '@duckdb/duckdb-wasm';

// Google Earth AI "Vectorized Farmscapes" — open GeoParquet (woody features / hedgerows /
// field boundaries). Host a regional subset on the RA CDN/R2 bucket; DuckDB reads HTTP
// byte-ranges directly, so there is no server-side compute and no full download.
export const FARMSCAPES_PARQUET =
  'https://cdn.regenatlas.xyz/farmscapes/eu_woody_features.parquet';

export interface DuckCtx {
  db: duckdb.AsyncDuckDB;
  conn: duckdb.AsyncDuckDBConnection;
}

export async function initDuckDB(): Promise<DuckCtx> {
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  const conn = await db.connect();
  await conn.query('INSTALL spatial; LOAD spatial;');
  await conn.query('INSTALL httpfs; LOAD httpfs;');
  return { db, conn };
}

// GeoJSON polygon ring -> WKT POLYGON (single ring; extend for holes if needed).
export function polygonToWKT(coords: number[][][]): string {
  const ring = coords[0].map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `POLYGON((${ring}))`;
}

export async function queryDensity(ctx: DuckCtx, polygonWKT: string) {
  const res = await ctx.conn.query(`
    SELECT count(*) AS feature_count,
           count(*) / NULLIF(ST_Area(ST_GeomFromText('${polygonWKT}')), 0) AS density_per_unit
    FROM read_parquet('${FARMSCAPES_PARQUET}')
    WHERE ST_Within(geometry, ST_GeomFromText('${polygonWKT}'));`);
  return res.toArray()[0];
}

export async function queryChangeOverTime(ctx: DuckCtx, polygonWKT: string) {
  const res = await ctx.conn.query(`
    SELECT year, count(*) AS woody_features
    FROM read_parquet('${FARMSCAPES_PARQUET}')
    WHERE ST_Within(geometry, ST_GeomFromText('${polygonWKT}'))
    GROUP BY year ORDER BY year;`);
  return res.toArray(); // [{year, woody_features}, ...] -> sparkline / delta
}

// Fetch feature points inside the polygon for the deck.gl density layer.
export async function queryFeaturePoints(ctx: DuckCtx, polygonWKT: string) {
  const res = await ctx.conn.query(`
    SELECT ST_X(ST_Centroid(geometry)) AS lng, ST_Y(ST_Centroid(geometry)) AS lat
    FROM read_parquet('${FARMSCAPES_PARQUET}')
    WHERE ST_Within(geometry, ST_GeomFromText('${polygonWKT}'))
    LIMIT 50000;`);
  return res.toArray().map((r: any) => [r.lng, r.lat] as [number, number]);
}

/**
 * ebay-oauth.ts — eBay OAuth2 helper (CLONE-ABLE TEMPLATE).
 *
 * This module is shipped as a fill-in-your-own-keys TEMPLATE for downstream Hermes
 * users who want the agent to relist on eBay autonomously. SlabClaw's OWN real demo
 * does NOT sell on eBay (it BUYS a slab and RE-ROUTES it to a vault), so by default
 * this module is INERT — `isUserConfigured` is false until a downstream user supplies
 * their own `EBAY_*` credentials + a stored user refresh token. Nothing here ever
 * fabricates a token; an unconfigured call throws a clear, actionable error.
 *
 * Two grant types live here:
 *   • CLIENT-CREDENTIALS (app token) — read-only Buy/Browse access. Used by the agent's
 *     eBay DISCOVER (read live acquisition candidates). Needs only client_id/secret.
 *   • AUTHORIZATION-CODE (user token) — the consent flow that mints a user access+refresh
 *     token for the Sell/Inventory APIs (the autonomous relist). Needs the one-time
 *     human "allow" + a registered RuName. This is the part a downstream user activates.
 *
 * eBay endpoints (host differs by environment):
 *   consent : https://auth.ebay.com/oauth2/authorize            (sandbox: auth.sandbox.ebay.com)
 *   token   : https://api.ebay.com/identity/v1/oauth2/token     (sandbox: api.sandbox.ebay.com)
 *
 * IMPORTANT eBay quirks baked in:
 *   • For the auth-code flow, `redirect_uri` carries the RuName (the eBay "Redirect URL
 *     name"), NOT a literal https URL. (The browser still lands on the URL the RuName
 *     points at; the token call passes the RuName string.)
 *   • The `code` eBay puts on the redirect is URL-ENCODED — it MUST be decoded before the
 *     token exchange or eBay returns invalid_grant.
 *   • Scopes are SPACE-separated on the wire (URL-encoded in the consent URL).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints + scopes
// ─────────────────────────────────────────────────────────────────────────────

export type EbayEnvironment = "production" | "sandbox";

interface EbayHosts {
  consent: string;
  token: string;
}

const HOSTS: Record<EbayEnvironment, EbayHosts> = {
  production: {
    consent: "https://auth.ebay.com/oauth2/authorize",
    token: "https://api.ebay.com/identity/v1/oauth2/token",
  },
  sandbox: {
    consent: "https://auth.sandbox.ebay.com/oauth2/authorize",
    token: "https://api.sandbox.ebay.com/identity/v1/oauth2/token",
  },
};

/** App-level (client-credentials) scope — the public Buy/Browse read scope. */
export const EBAY_APP_SCOPE = "https://api.ebay.com/oauth/api_scope";

/** The user (auth-code) scopes the autonomous relist needs (Sell Inventory + policies + orders). */
export const EBAY_SELL_SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
  "https://api.ebay.com/oauth/api_scope/sell.account",
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export interface EbayOAuthConfig {
  environment?: EbayEnvironment; // default 'production'
  clientId?: string; // EBAY_CLIENT_ID (App ID)
  clientSecret?: string; // EBAY_CLIENT_SECRET (Cert ID)
  ruName?: string; // EBAY_RU_NAME — the registered Redirect URL name (auth-code only)
  /** A user refresh token a downstream user has already minted + stored (auth-code only). */
  userRefreshToken?: string; // EBAY_USER_REFRESH_TOKEN
  /** Scopes for the user flow. Defaults to EBAY_SELL_SCOPES. */
  sellScopes?: readonly string[];
  /** Injected fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/** Build an EbayOAuthConfig from process.env (the downstream user fills these in). */
export function ebayOAuthConfigFromEnv(env: Record<string, string | undefined> = process.env): EbayOAuthConfig {
  const environment = (env.EBAY_ENV === "sandbox" ? "sandbox" : "production") as EbayEnvironment;
  return {
    environment,
    clientId: env.EBAY_CLIENT_ID,
    clientSecret: env.EBAY_CLIENT_SECRET,
    ruName: env.EBAY_RU_NAME,
    userRefreshToken: env.EBAY_USER_REFRESH_TOKEN,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface UserTokenSet {
  accessToken: string;
  refreshToken: string;
  /** seconds until the access token expires */
  expiresIn: number;
  /** seconds until the refresh token expires (eBay user refresh tokens are long-lived, ~18 months) */
  refreshTokenExpiresIn: number;
  tokenType: string;
}

interface RawTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// The helper
// ─────────────────────────────────────────────────────────────────────────────

export class EbayOAuth {
  readonly environment: EbayEnvironment;
  private readonly clientId?: string;
  private readonly clientSecret?: string;
  private readonly ruName?: string;
  private readonly userRefreshToken?: string;
  private readonly sellScopes: readonly string[];
  private readonly fetchImpl: typeof fetch;
  private readonly hosts: EbayHosts;

  // in-memory access-token caches (NEVER persisted by this module — provenance stays with the caller)
  private appToken: { value: string; expiresAt: number } | null = null;
  private userToken: { value: string; expiresAt: number } | null = null;

  constructor(cfg: EbayOAuthConfig = {}) {
    this.environment = cfg.environment ?? "production";
    this.clientId = cfg.clientId;
    this.clientSecret = cfg.clientSecret;
    this.ruName = cfg.ruName;
    this.userRefreshToken = cfg.userRefreshToken;
    this.sellScopes = cfg.sellScopes ?? EBAY_SELL_SCOPES;
    this.fetchImpl = cfg.fetchImpl ?? fetch;
    this.hosts = HOSTS[this.environment];
  }

  /** True when app-level (Browse READ) calls are possible — client_id + secret present. */
  get isAppConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /** True when the autonomous relist (user token) is possible — app creds + a stored refresh token. */
  get isUserConfigured(): boolean {
    return this.isAppConfigured && !!this.userRefreshToken;
  }

  private basicAuthHeader(): string {
    const creds = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    return `Basic ${creds}`;
  }

  // ── AUTH-CODE: step 1 — the consent URL the human visits once ────────────────
  /**
   * Build the consent URL. The downstream user opens this once, taps "allow", and eBay
   * redirects to the RuName's target with a `?code=...` query param. Throws if the app
   * creds / RuName aren't configured (no half-built URL).
   */
  buildConsentUrl(opts: { state?: string } = {}): string {
    if (!this.clientId) throw new Error("eBay OAuth not configured: set EBAY_CLIENT_ID before building a consent URL.");
    if (!this.ruName) throw new Error("eBay OAuth not configured: set EBAY_RU_NAME (the registered Redirect URL name) before building a consent URL.");
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.ruName, // eBay: the RuName, not a literal URL
      response_type: "code",
      scope: this.sellScopes.join(" "),
    });
    if (opts.state) params.set("state", opts.state);
    return `${this.hosts.consent}?${params.toString()}`;
  }

  // ── AUTH-CODE: step 2 — exchange the redirect `code` for access + refresh tokens ──
  /**
   * Exchange the authorization `code` from the redirect for a user token set. The caller
   * is responsible for PERSISTING the returned refreshToken (e.g. into EBAY_USER_REFRESH_TOKEN
   * or a secrets store) — this module never writes it to disk.
   */
  async exchangeCodeForTokens(code: string): Promise<UserTokenSet> {
    if (!this.isAppConfigured) throw new Error("eBay OAuth not configured: set EBAY_CLIENT_ID + EBAY_CLIENT_SECRET.");
    if (!this.ruName) throw new Error("eBay OAuth not configured: set EBAY_RU_NAME.");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: decodeURIComponent(code), // eBay URL-encodes the code on the redirect — decode it (quirk)
      redirect_uri: this.ruName,
    });
    const data = await this.tokenRequest(body);
    if (!data.access_token || !data.refresh_token) {
      throw new Error(`eBay code exchange returned no tokens (${data.error ?? "unknown"}: ${data.error_description ?? ""})`);
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? 7200,
      refreshTokenExpiresIn: data.refresh_token_expires_in ?? 0,
      tokenType: data.token_type ?? "User Access Token",
    };
  }

  // ── AUTH-CODE: step 3 — mint a fresh user access token from the stored refresh token ──
  /**
   * Return a valid USER access token for the Sell/Inventory APIs, refreshing from the stored
   * refresh token when the cache is cold/expired. Throws a clear error when no refresh token
   * is configured (the downstream activation gate) — it NEVER returns a fake token.
   */
  async getUserAccessToken(): Promise<string> {
    if (!this.isUserConfigured) {
      throw new Error(
        "eBay user token not configured — the autonomous relist is a DOWNSTREAM template. " +
          "Set EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RU_NAME, then run the consent flow once and store EBAY_USER_REFRESH_TOKEN.",
      );
    }
    if (this.userToken && Date.now() < this.userToken.expiresAt) return this.userToken.value;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.userRefreshToken!,
      scope: this.sellScopes.join(" "),
    });
    const data = await this.tokenRequest(body);
    if (!data.access_token) {
      throw new Error(`eBay refresh failed (${data.error ?? "unknown"}: ${data.error_description ?? ""})`);
    }
    this.userToken = { value: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 7200) - 300) * 1000 };
    return this.userToken.value;
  }

  // ── CLIENT-CREDENTIALS: the app token for Buy/Browse READ (the agent's DISCOVER) ──
  /** Return a valid APP access token (client-credentials), refreshing on expiry. */
  async getAppAccessToken(): Promise<string> {
    if (!this.isAppConfigured) {
      throw new Error("eBay app token not configured: set EBAY_CLIENT_ID + EBAY_CLIENT_SECRET for Browse READ.");
    }
    if (this.appToken && Date.now() < this.appToken.expiresAt) return this.appToken.value;
    const body = new URLSearchParams({ grant_type: "client_credentials", scope: EBAY_APP_SCOPE });
    const data = await this.tokenRequest(body);
    if (!data.access_token) {
      throw new Error(`eBay app token failed (${data.error ?? "unknown"}: ${data.error_description ?? ""})`);
    }
    this.appToken = { value: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 7200) - 300) * 1000 };
    return this.appToken.value;
  }

  /** POST to the token endpoint with Basic client auth. Shared by all three grant types. */
  private async tokenRequest(body: URLSearchParams): Promise<RawTokenResponse> {
    const res = await this.fetchImpl(this.hosts.token, {
      method: "POST",
      headers: {
        Authorization: this.basicAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let json: RawTokenResponse = {};
    try {
      json = text ? (JSON.parse(text) as RawTokenResponse) : {};
    } catch {
      throw new Error(`eBay token endpoint returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }
    if (!res.ok && !json.error) {
      throw new Error(`eBay token endpoint HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    return json;
  }
}

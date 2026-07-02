# eBay venue — downstream template

The eBay adapter (`ebay.ts`) is a **clone-able template**. SlabClaw's own demo never sells on
eBay — it **buys** a slab and **re-routes** it to a vault, then exits on the tokenized venue.
This guide is for a downstream Hermes user who wants the agent to do more on eBay: **discover +
buy** (human-gated) and/or **relist autonomously** (Sell Inventory API).

Everything ships **inert by default**. With no `EBAY_*` env vars set:

- `discover()` returns `[]` (honest empty — no creds, nothing to read)
- `acquire()` enforces the D11 cap firebreak then **stages** the buy for the human-gate (eBay
  checkout is an irreversible fiat spend; the agent never auto-spends)
- `list()` returns a **staged** receipt naming exactly which config is missing — it never
  fabricates a listing
- `confirmSale()` returns `null` (no fabricated sale)

Nothing here ever invents a token, an order id, or a sale.

---

## What each capability needs

| Capability | eBay APIs | Env vars required |
|---|---|---|
| **Discover** (read live listings) | Buy / Browse | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` |
| **Buy** (human-gated checkout) | — (browser + Stripe Issuing) | a logged-in eBay session + a capped Stripe Issuing card |
| **Relist** (autonomous) | Sell / Inventory + Account | all of the above **+** `EBAY_RU_NAME`, `EBAY_USER_REFRESH_TOKEN`, the 4 seller-setup ids, `EBAY_CARD_CATEGORY_ID` |

Discovery is cheap (two creds). The autonomous **relist** is the part with real one-time setup.

---

## One-time setup for the autonomous relist

### 1. Create a developer keyset
[developer.ebay.com](https://developer.ebay.com) → create an app keyset → copy the **App ID**
(`EBAY_CLIENT_ID`) and **Cert ID** (`EBAY_CLIENT_SECRET`). Set `EBAY_ENV=production` (or
`sandbox` to dry-run first).

### 2. Register a redirect (RuName) and enable Sell scopes
In the keyset → **User tokens** → create a **Redirect URL name (RuName)**. Put it in
`EBAY_RU_NAME`. Ensure the keyset has the **Sell** scopes
(`sell.inventory`, `sell.account`, `sell.fulfillment`) — production Sell access can require a
verified seller account and, occasionally, eBay approval, so start this early.

### 3. Mint a user refresh token (the one human "allow")
Build the consent URL and open it once:

```ts
import { EbayOAuth, ebayOAuthConfigFromEnv } from "./engine/lib/adapters/ebay-oauth.ts";

const oauth = new EbayOAuth(ebayOAuthConfigFromEnv());
console.log(oauth.buildConsentUrl({ state: "setup" }));
// → open the URL, tap "allow"; eBay redirects to your RuName target with ?code=...
```

Exchange the `code` from the redirect for tokens and **store the refresh token**:

```ts
const tokens = await oauth.exchangeCodeForTokens(codeFromRedirect);
// persist tokens.refreshToken into EBAY_USER_REFRESH_TOKEN (env or your secrets store)
```

The refresh token is long-lived (~18 months). The adapter mints short-lived access tokens
from it automatically; you never repeat the consent step until it expires.

### 4. Create the seller listing config (once)
The Sell Inventory publish flow needs business policies + an inventory location + a category:

- **Business policies** — Seller Hub → Business policies (or the Account API): create a
  **fulfillment** (shipping), **payment**, and **return** policy →
  `EBAY_FULFILLMENT_POLICY_ID`, `EBAY_PAYMENT_POLICY_ID`, `EBAY_RETURN_POLICY_ID`.
- **Merchant location** — create an inventory location (Account/Location API) →
  `EBAY_MERCHANT_LOCATION_KEY`.
- **Category** — the eBay leaf category id for graded trading cards → `EBAY_CARD_CATEGORY_ID`.

`missingRelistConfig(oauth, seller)` (in `ebay-inventory.ts`) reports exactly which of these is
still missing, and `list()` surfaces that list in its staged receipt — so you can flip pieces on
incrementally and always see what's left.

---

## Turning it on

Fill in the `EBAY_*` block in `.env.example` (copied to `.env`) and set:

```bash
MARKETPLACE_VENUE=ebay
```

That routes the web loop (`web/routes-api.mjs`) through the eBay adapter instead of Beezie. The
buy stays human-gated; the relist goes live only once **all** the relist vars resolve
(`EbayInventoryClient.isConfigured === true`).

## Safety posture (unchanged from the rest of the engine)

- **D11 cap firebreak** runs on every `acquire()` before anything is staged: no resolvable cap
  ⇒ fail-closed; over-cap ⇒ blocked. Same discipline as the Beezie adapter.
- **eBay buys are always human-gated** — the agent prepares the checkout; a human taps the
  irreversible commit (paid by a **capped** Stripe Issuing virtual card).
- **Honesty (P7):** unconfigured/failed paths return `staged`/`null` with a reason; they never
  fabricate a listing, token, or sale.

## Tests

`engine/test/ebay-adapter.test.ts` covers all of the above over injected fetch (zero network):
OAuth (consent URL, code exchange, refresh, the not-configured gate), the Sell Inventory 3-call
publish flow, and the adapter (fee math, landed cost, the cap firebreak, Browse parsing, the
template staging, and the re-route custody move). Run it with:

```bash
cd engine && npm test            # full suite (includes eBay)
node --experimental-strip-types test/ebay-adapter.test.ts   # eBay only
```

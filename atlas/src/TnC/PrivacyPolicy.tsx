import { SimplePage } from "../shared/components/SimplePage";

/**
 * Privacy notice for AqueductX. Written to be TRUE to what the code actually
 * does (see the data-practices audit): no analytics run on aqueductx.trade
 * (Google Analytics is initialised only on regenatlas.xyz/localhost and only
 * when VITE_GOOGLE_ANALYTICS_ID is set — neither holds here), no accounts, no
 * tracking cookies, no consent banner mounted. The only browser-side storage is
 * device-local UI state (tour vault count, dev-mode toggle) that is never
 * transmitted. The /list form (Formspree) is the one place a visitor can hand us
 * personal data, and it is described below.
 *
 * DRAFT — NOT LEGAL ADVICE. [PLACEHOLDER — Pat: …] markers are facts to confirm.
 * Read by counsel before relying on it.
 */
export const PrivacyPolicy: React.FC = () => {
  return (
    <SimplePage>
      <div className="prose">
        <h1>Privacy Notice</h1>
        <p>
          <strong>Updated:</strong> 3 July 2026
        </p>
        <p>
          <strong>AqueductX</strong> (
          <a href="https://aqueductx.trade" target="_blank" rel="noopener noreferrer">
            aqueductx.trade
          </a>
          ) is a simulated demonstration prototype operated by <strong>Ecofrontiers SARL</strong>. This notice describes
          what happens to personal data when you use the site. It is written to be accurate to what the software
          actually does — the site is a prototype, and the notice reads like one.
        </p>
        <p>
          <strong>Data controller:</strong> Ecofrontiers SARL, 23 Chemin du Coupereau, Le Canebas, 83320 Carqueiranne,
          France. Contact: <a href="mailto:pat@ecofrontiers.xyz">pat@ecofrontiers.xyz</a>.
        </p>

        <h2>The short version</h2>
        <ul>
          <li>No accounts, no login, no password.</li>
          <li>No analytics and no tracking cookies run on this site.</li>
          <li>
            The only data stored in your browser is device-local interface state (a tour counter and a "dev mode"
            toggle). It never leaves your device and is not sent to us.
          </li>
          <li>We do not collect personal data unless you choose to submit the "List your project" form.</li>
          <li>We never sell personal data.</li>
        </ul>

        <h2>What is processed, and by whom</h2>

        <h3>1. Server logs (hosting)</h3>
        <p>
          The site is served by our host, <strong>Vercel Inc.</strong> Like any web host, Vercel processes technical
          request data — including your IP address, browser user-agent, and the pages requested — in server logs, to
          deliver the site and for security. See{" "}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
            Vercel's privacy policy
          </a>
          .
        </p>

        <h3>2. Third parties your browser contacts directly</h3>
        <p>
          To draw the map and load public data, your browser fetches resources from the services below. When it does,
          those services necessarily see your IP address and the request. We do not control their processing; each has
          its own policy.
        </p>
        <ul>
          <li>
            <strong>Mapbox</strong> — map tiles and geocoding (sees your IP and map usage).{" "}
            <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener noreferrer">
              Policy
            </a>
          </li>
          <li>
            <strong>Supabase</strong> — the inherited asset-registry dataset that populates the map.{" "}
            <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
              Policy
            </a>
          </li>
          <li>
            <strong>Cloudflare R2</strong> — archived Glow solar-project data.{" "}
            <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">
              Policy
            </a>
          </li>
          <li>
            <strong>EthicHub</strong> and <strong>Glow</strong> — public coffee-lot and solar data read from their
            public pages.{" "}
            <a href="https://www.ethichub.com/en/privacy-policy" target="_blank" rel="noopener noreferrer">
              EthicHub policy
            </a>
          </li>
        </ul>
        <p className="text-sm">
          Inherited registry features may also read from public data endpoints (for example CoinGecko, DexScreener, The
          Graph, and public blockchain RPCs). These are public data reads made by inherited registry features that
          remain active on this site; the same IP exposure applies.
        </p>

        <h3>3. Browser storage (device-only, never transmitted)</h3>
        <p>
          The site uses your browser's <code>localStorage</code> to remember small pieces of interface state between
          visits: the tour's simulated vault count and total, and whether you have opened "dev mode". This data stays on
          your device, is not a cookie, is not used to track you, and is never sent to us or anyone else. You can clear
          it at any time through your browser.
        </p>

        <h3>4. Analytics — none run here</h3>
        <p>
          The codebase inherits an optional Google Analytics integration, but it is disabled on this site: it
          initialises only on other domains and only when an analytics key is configured, and neither condition holds on
          aqueductx.trade. No consent banner is shown because no analytics or tracking cookies run. [PLACEHOLDER — Pat:
          if you ever set an analytics key or enable it on this domain, this section and a consent banner must be
          restored.]
        </p>

        <h3>5. The "List your project" form</h3>
        <p>
          If you submit the <a href="/list">List your project</a> form, you provide personal data — your name and email
          address, plus whatever project details you enter. The form is delivered through <strong>Formspree</strong>, a
          form-processing service, which forwards it to us by email (a copy is sent to a company address). We use it
          only to review your submission and respond. See{" "}
          <a href="https://formspree.io/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
            Formspree's privacy policy
          </a>
          . [PLACEHOLDER — Pat: decide whether to keep this form live; if not, the /list route should be unrouted and
          this section removed.]
        </p>

        <h2>Legal bases (GDPR)</h2>
        <ul>
          <li>
            <strong>Serving the site and keeping it secure</strong> (server logs) — our legitimate interest in operating
            and protecting the service (Art. 6(1)(f)).
          </li>
          <li>
            <strong>Handling a form submission</strong> — your submission is a request we act on at your initiative, and
            our legitimate interest in responding (Art. 6(1)(b)/(f)).
          </li>
          <li>
            <strong>Device-local interface state</strong> — strictly necessary for the interface you asked for; no
            consent needed and no personal data involved.
          </li>
        </ul>

        <h2>Retention</h2>
        <p>
          Host server logs are retained per Vercel's own schedule. Form submissions are kept only as long as needed to
          review and respond, and then deleted. [PLACEHOLDER — Pat: state a concrete retention period for form
          submissions, e.g. 12 months.]
        </p>

        <h2>Data transfers</h2>
        <p>
          Some processors named above (for example Vercel and Formspree) are based in the United States. Where personal
          data is transferred outside the EEA, it is protected by the relevant safeguards (such as the EU–US Data
          Privacy Framework or Standard Contractual Clauses). [PLACEHOLDER — Pat: counsel to confirm the transfer
          mechanism relied on for each US processor.]
        </p>

        <h2>We never sell your data</h2>
        <p>We do not sell personal data and do not use it for advertising.</p>

        <h2>Your rights</h2>
        <p>
          Under the GDPR you have the right to access, rectify, erase, restrict, and object to the processing of your
          personal data, and the right to data portability. To exercise any of these, email{" "}
          <a href="mailto:pat@ecofrontiers.xyz">pat@ecofrontiers.xyz</a>. You also have the right to lodge a complaint
          with the French supervisory authority, the CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
            cnil.fr
          </a>
          ).
        </p>

        <h2>Demonstration disclaimer</h2>
        <p>
          AqueductX is a simulated demonstration prototype. Most figures shown — prices, floors, APRs, receivables,
          pledges, "back this round" amounts, backer counts — are simulated, deterministic values, labeled as simulated
          in the interface. Nothing on the site is an offer, solicitation, recommendation, or provision of any
          financial, investment, payment, or advisory service, and nothing here should be relied on for any financial
          decision. The few elements that read live public data or prepare a testnet transaction are labeled as such. No
          real money moves through this site.
        </p>

        <p className="text-sm">
          This notice is a draft prepared for review and is not legal advice. The bracketed fields must be completed and
          the whole notice confirmed by counsel before it is relied upon.
        </p>
      </div>
    </SimplePage>
  );
};

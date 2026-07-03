import { SimplePage } from "../shared/components/SimplePage";

/**
 * Legal notice (mentions légales) for AqueductX, published per the French LCEN
 * (Loi n° 2004-575, art. 6-III) which governs the site éditeur.
 *
 * DRAFT — NOT LEGAL ADVICE. The [PLACEHOLDER — Pat: …] markers are statutory
 * facts that must be filled from Ecofrontiers SARL's Kbis / statuts before this
 * ships, and the whole document should be read by counsel. See the licenses
 * files (LICENSE, LICENSE-SCHEMA) for the code/schema grants.
 */
export const Imprint: React.FC = () => {
  return (
    <SimplePage>
      <div className="prose">
        <h1>Legal Notice</h1>
        <p>
          <em>Mentions légales — published under French law (LCEN, art. 6-III).</em>
        </p>

        <h2>The site</h2>
        <p>
          This notice covers <strong>AqueductX</strong> (
          <a href="https://aqueductx.trade" target="_blank" rel="noopener noreferrer">
            aqueductx.trade
          </a>
          ), a simulated demonstration prototype. Most values shown on the site are simulated and are labeled as such —
          see the "most values simulated" notice in the header and the demonstration disclaimer on the{" "}
          <a href="/privacy-policy">privacy page</a>. The site sells nothing and is not a marketplace.
        </p>

        <h2>Publisher (éditeur)</h2>
        <p>
          <strong>Ecofrontiers SARL</strong>
          <br />
          Société à responsabilité limitée (SARL) under French law
          <br />
          Registered office: [PLACEHOLDER — Pat: registered office address on the Kbis]
          <br />
          Share capital: [PLACEHOLDER — Pat: € share capital]
          <br />
          RCS: [PLACEHOLDER — Pat: RCS city + registration number]
          <br />
          SIRET: [PLACEHOLDER — Pat: SIRET]
          <br />
          Intra-community VAT: [PLACEHOLDER — Pat: FR VAT number, or "not applicable" if not VAT-registered]
        </p>

        <h2>Director of publication (directeur de la publication)</h2>
        <p>
          Patrick Rawson [PLACEHOLDER — Pat: confirm you are the directeur de la publication]
          <br />
          Contact: <a href="mailto:pat@ecofrontiers.xyz">pat@ecofrontiers.xyz</a> [PLACEHOLDER — Pat: confirm this is
          the correct publication contact address]
        </p>

        <h2>Host (hébergeur)</h2>
        <p>
          Vercel Inc.
          <br />
          440 N Barranca Ave #4133, Covina, CA 91723, United States [PLACEHOLDER — Pat: confirm current Vercel published
          address]
          <br />
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </p>

        <p className="text-sm">
          This is a draft prepared for review and is not legal advice. The bracketed fields must be completed and the
          whole notice confirmed by counsel before it is relied upon.
        </p>
      </div>
    </SimplePage>
  );
};

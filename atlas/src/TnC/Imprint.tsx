import { SimplePage } from "../shared/components/SimplePage";

/**
 * Legal notice (mentions légales) for AqueductX, published per the French LCEN
 * (Loi n° 2004-575, art. 6-III) which governs the site éditeur.
 *
 * Entity facts supplied by Pat 2026-07-03 (Kbis-sourced; matches the imprint
 * published at ecofrontiers.xyz). One statutory field still open: share capital
 * (not in the supplied record). Counsel should read before final reliance.
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
          see the "most values simulated" notice and the demonstration disclaimer on the{" "}
          <a href="/privacy-policy">privacy page</a>. The site sells nothing and is not a marketplace.
        </p>

        <h2>Publisher (éditeur)</h2>
        <p>
          <strong>Ecofrontiers SARL</strong> ("Ecofrontiers")
          <br />
          Forme juridique: Autre société à responsabilité limitée (code 5499)
          <br />
          Registered office: 23 Chemin du Coupereau, Le Canebas, 83320 Carqueiranne, France
          <br />
          Register entry: Ecofrontiers — Greffe du Tribunal de Commerce de Toulon
          <br />
          Register number: 933 442 311 R.C.S. Toulon
          <br />
          SIREN: 933 442 311 · SIRET: 933 442 311 00017
          <br />
          Intra-community VAT: FR92933442311
          <br />
          Principal activity: Édition de logiciels applicatifs (NACE 5829C)
          <br />
          Share capital: [to be completed from the statuts]
        </p>

        <h2>Represented by / Director of publication</h2>
        <p>
          Louise Borreani, Managing Director (gérante)
          <br />
          Contact: <a href="mailto:louise@ecofrontiers.xyz">louise@ecofrontiers.xyz</a> · +33 7 69 28 08 83
        </p>

        <h2>Host (hébergeur)</h2>
        <p>
          Vercel Inc.
          <br />
          440 N Barranca Ave #4133, Covina, CA 91723, United States
          <br />
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
            vercel.com
          </a>
        </p>

        <h2>Online dispute resolution</h2>
        <p>
          Per Art. 14 para. 1 of the ODR Regulation: the European Commission provides a platform for out-of-court online
          dispute resolution (OS platform), accessible at{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          . Our e-mail address can be found above. We are neither obliged nor willing to participate in the dispute
          resolution procedure.
        </p>

        <p className="text-sm">
          Code and specifications published from this site carry two distinct grants: MIT on the code, CC0 1.0 on the
          canonical lot schema and identifier specification. This notice was prepared for review and should be confirmed
          by counsel.
        </p>
      </div>
    </SimplePage>
  );
};

import { SimplePage } from "../shared/components/SimplePage";

export const Imprint: React.FC = () => {
  return (
    <SimplePage>
      <div className="prose">
        <h1>Imprint</h1>
        <p>
          <strong>Regen Atlas</strong> is a project by{" "}
          <strong>Ecofrontiers SARL</strong>.
        </p>
        <p>
          Ecofrontiers SARL
          <br />
          23 Chemin du Coupereau, Le Canebas
          <br />
          83320 Carqueiranne
        </p>
        <a href="mailto:info@ecofrontiers.xyz">info@ecofrontiers.xyz</a>
      </div>
    </SimplePage>
  );
};

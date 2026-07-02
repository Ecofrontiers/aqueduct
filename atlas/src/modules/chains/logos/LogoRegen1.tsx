export const LogoRegen1 = ({ size = 20 }: { size?: number }) => {
  return (
    <div>
      <img
        src="/chains/regen-1.svg"
        alt="Regen Network"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};

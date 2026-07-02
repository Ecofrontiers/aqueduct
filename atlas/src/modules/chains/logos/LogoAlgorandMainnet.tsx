export const LogoAlgorandMainnet = ({ size = 28 }: { size?: number }) => {
  return (
    <div>
      <img
        src="/chains/algorand-mainnet.svg"
        alt="Algorand"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};

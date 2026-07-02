export const LogoSolanaMainnet = ({ size = 16 }: { size?: number }) => {
  return (
    <div>
      <img
        src="/chains/solana-mainnet.svg"
        alt="Solana"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};

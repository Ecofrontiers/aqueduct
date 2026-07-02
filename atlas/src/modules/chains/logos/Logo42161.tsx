export const Logo42161 = ({ size = 20 }: { size?: number }) => {
  return (
    <div>
      <img
        src="/chains/42161.svg"
        alt="Arbitrum"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};

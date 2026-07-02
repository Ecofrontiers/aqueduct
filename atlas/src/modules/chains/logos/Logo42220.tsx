export const Logo42220 = ({ size = 14 }: { size?: number }) => {
  return (
    <div>
      <img
        src="/chains/42220.svg"
        alt="Celo"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};

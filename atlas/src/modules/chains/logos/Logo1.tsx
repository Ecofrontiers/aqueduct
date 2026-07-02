export const Logo1 = ({ size = 20 }: { size?: number }) => {
  return (
    <div>
      <img
        src="/chains/1.svg"
        alt="Ethereum"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};

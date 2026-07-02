export const Logo42 = ({ size = 20 }: { size?: number }) => {
  return (
    <div>
      <img
        src="/chains/42.svg"
        alt="LUKSO"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </div>
  );
};

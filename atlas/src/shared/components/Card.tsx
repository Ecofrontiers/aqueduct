export const Card = ({
  children,
  cardTitle,
  colStart,
  colEnd,
  rowStart,
  rowEnd,
}: {
  children: React.ReactElement;
  cardTitle: string;
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}): JSX.Element => {
  return (
    <div
      className="border-2 border-black p-4 rounded-lg"
      style={{
        gridColumnStart: colStart,
        gridColumnEnd: colEnd + 1,
        gridRowStart: rowStart,
        gridRowEnd: rowEnd + 1,
      }}
    >
      <h3 className="text-xl font-semibold mb-2 text-slate-700">{cardTitle}</h3>
      {children}
    </div>
  );
};

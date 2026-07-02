interface NumberInputProps {
  className?: string;
  value: string;
  placeholder: string;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  className = "",
  value,
  placeholder,
  onChange,
  onBlur,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/,/g, ".");

    const isValidInput = /^(0|[1-9]\d*)?(\.\d*)?$/.test(val);

    if (isValidInput) {
      if (onChange) {
        onChange(val);
      }
    }
  };

  const handleBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/,/g, ".");

    const isValidInput = /^-?\d*\.?\d*$/.test(val);

    if (isValidInput) {
      if (onBlur) {
        onBlur(val);
      }
    }
  };

  return (
    <input
      type="text"
      placeholder={placeholder}
      className={className}
      onChange={handleChange}
      onBlur={handleBlur}
      value={value}
    />
  );
};

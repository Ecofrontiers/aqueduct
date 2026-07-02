import { NumberInput } from "./NumberInput";
import { TokenSelect } from "./TokenSelect";
import { Token } from "../types";

interface TokenInputProps {
  type?: "buy" | "sell" | "retire";
  value: string;
  placeholder: string;
  token: Token;
  formattedBalance: string;
  displayBalance: boolean;
  text?: string;
  onChange: (value: string) => void;
  onTokenChange: (token: Token) => void;
}

export const TokenInput: React.FC<TokenInputProps> = ({
  type,
  value,
  placeholder,
  token,
  formattedBalance,
  displayBalance,
  text,
  onChange,
  onTokenChange,
}) => {
  const symbol = token.symbol?.toUpperCase();

  if (!symbol) {
    return <div>Invalid token</div>;
  }

  return (
    <div className="grid p-4 rounded-lg border-2 border-gray-400 bg-cardBackground">
      {type && <span className="text-sm capitalize">{type}</span>}
      <div className="flex justify-between items-center">
        {text && <span className="text-2xl mr-4">{text}</span>}
        <NumberInput
          className="py-2 border-none outline-none bg-transparent text-2xl w-full"
          value={value}
          placeholder={placeholder}
          onChange={onChange}
        />

        <div className="flex-shrink-0">
          {token.symbol && (
            <TokenSelect
              selectedToken={token}
              onTokenChange={(token) => onTokenChange(token)}
            />
          )}
        </div>
      </div>
      {displayBalance && (
        <div className="text-xs text-right mt-1">
          Balance: {formattedBalance}
        </div>
      )}
    </div>
  );
};

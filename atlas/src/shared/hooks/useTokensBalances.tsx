import { Address, parseUnits } from "viem";
import { useBalance } from "wagmi";
import { formatNumber } from "../helpers";
import { Token } from "../types";

interface TokenBalance {
  value: bigint;
  formattedBalance: string;
}

interface UseTokenBalancesProps {
  tokens: Token[];
  account: Address | undefined;
}

// @TODO: use memo
export function useTokensBalances({
  tokens,
  account,
}: UseTokenBalancesProps): Record<string, TokenBalance> {
  const balances = tokens.map((token) =>
    useBalance({
      address: account,
      token: token.address as Address,
    })
  );

  const tokenBalanceMap: Record<string, TokenBalance> = {};

  tokens.forEach((token, index) => {
    const result = balances[index];

    // If we don't have an account, or the query is loading, or there's an error,
    // or no data, return zero.
    if (!account || result.isLoading || result.error || !result.data) {
      tokenBalanceMap[token.address] = {
        value: parseUnits("0", token.decimals),
        formattedBalance: "0",
      };
      return;
    }

    let formattedBalance = formatNumber(
      result.data.value,
      result.data.decimals,
      3
    );

    if (result.data.value === BigInt(0)) {
      formattedBalance = "0";
    } else if (result.data.value < parseUnits("0.001", result.data.decimals)) {
      formattedBalance = "<0.001";
    }

    tokenBalanceMap[token.address] = {
      value: result.data.value,
      formattedBalance,
    };
  });

  return tokenBalanceMap;
}

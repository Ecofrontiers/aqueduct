import { getBalance, GetBalanceReturnType } from "@wagmi/core";
import { Address } from "viem";
import { config } from "../../../wagmi";

export const getTokenBalance = async ({
  token,
  account,
}: {
  token: Address;
  account: Address;
}): Promise<GetBalanceReturnType> => {
  const balance = await getBalance(config, {
    address: account,
    token,
  });

  return balance;
};

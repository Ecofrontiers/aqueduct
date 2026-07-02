import { Percent } from "@uniswap/sdk-core";
import JSBI from "jsbi";

export function increaseByPercent(amount: bigint, percent: Percent): bigint {
  const multiple = JSBI.add(percent.numerator, percent.denominator);
  const divide = percent.denominator;
  return (amount * BigInt(multiple.toString())) / BigInt(divide.toString());
}

export function decreaseByPercent(amount: bigint, percent: Percent): bigint {
  const multiple = JSBI.subtract(percent.denominator, percent.numerator);
  const divide = percent.denominator;
  return (amount * BigInt(multiple.toString())) / BigInt(divide.toString());
}

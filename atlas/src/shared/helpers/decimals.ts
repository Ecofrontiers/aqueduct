import { formatUnits } from "viem";

export function formatNumber(
  value: bigint,
  decimals = 18,
  displayDecimals = 5
): string {
  const number = formatUnits(value, decimals);
  return parseFloat(number).toFixed(displayDecimals);
}

// // Example usage:
// const formatted = formatUnits(BigInt("1234567890123456789"), 18, 5); // "1.23456"
// console.log(formatted);

export function parseNumber(value: string, decimals = 18): bigint {
  const [integerPart, fractionalPart = ""] = value.split(".");
  const fractionalPartPadded = fractionalPart.padEnd(decimals, "0");

  const integerBigInt = BigInt(integerPart) * BigInt(10 ** decimals);
  const fractionalBigInt = BigInt(fractionalPartPadded.slice(0, decimals));

  return integerBigInt + fractionalBigInt;
}

// Example usage:
// const parsed = parseNumber("1.23456", 18); // 1234560000000000000n

export function divideBigInts(
  a: bigint,
  b: bigint,
  precision: number = 2
): string {
  // Handle case where b is zero to avoid division by zero errors
  if (b === 0n) {
    throw new Error("Division by zero is not allowed");
  }

  // Calculate the multiplier based on the precision needed
  const multiplier = BigInt(10 ** precision);

  // Perform multiplication of a with the multiplier before division
  const result = (a * multiplier) / b;

  // Convert the result to string and handle decimal placement
  const resultStr = result.toString();

  // Calculate where to insert the decimal point
  const decimalIndex = resultStr.length - precision;

  // Handle the case where the result might be shorter than expected
  const integerPart = decimalIndex > 0 ? resultStr.slice(0, decimalIndex) : "0";
  const decimalPart =
    decimalIndex > 0
      ? resultStr.slice(decimalIndex)
      : resultStr.padStart(precision, "0");

  return `${integerPart}.${decimalPart}`;
}

export function roundUpToTwoDecimalPlaces(num: number): number {
  return Math.ceil(num * 100) / 100;
}

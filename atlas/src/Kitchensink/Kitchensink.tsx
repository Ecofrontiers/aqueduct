import { useState } from "react";
import { FeeAmount, Route, SwapOptions, SwapRouter } from "@uniswap/v3-sdk";
import {
  ABI_CELO_ROUTER,
  CELO_CHAR_TOKEN,
  CELO_CHAR_TOKEN_ADDRESS,
  CELO_CHAR_USDC_POOL_ADDRESS,
  CELO_SWAP_ROUTER_ADDRESS,
  CELO_USDC_TOKEN,
  CELO_USDC_TOKEN_ADDRESS,
  ETHEREUM_USDC_UNI_POOL_ADDRESS,
  getPool,
  getQuoteFromQuoter,
  getQuoteSimulation,
  getTokenApproval,
  getUncheckedTrade,
  MAINNET_SWAP_ROUTER_ADDRESS,
  MAINNET_UNI_TOKEN,
  MAINNET_UNI_TOKEN_ADDRESS,
  MAINNET_USDC_TOKEN,
  MAINNET_USDC_TOKEN_ADDRESS,
  UniswapTrading,
} from "../modules/uniswap";
import { useAccount, useChainId } from "wagmi";
import Header from "../Header";
import { Percent, TradeType } from "@uniswap/sdk-core";
import { config } from "../wagmi";
import { Address } from "viem";
import {
  sendTransaction,
  simulateContract,
  writeContract,
  getBalance,
} from "@wagmi/core";
import { parseNumber } from "../shared/helpers";

export const Kitchensink = (): React.ReactElement => {
  const chainId = useChainId();
  const { address } = useAccount();
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>(
    {}
  );
  console.log("chainId", chainId);

  const handleTokenApprovalOnCelo = async () => {
    console.log("handleTokenApprovalOnCelo");
    await getTokenApproval(CELO_USDC_TOKEN, BigInt("20000"));
  };

  const handleTokenApprovalOnEthereum = async () => {
    console.log("handleTokenApprovalOnEthereum");
    await getTokenApproval(MAINNET_USDC_TOKEN, BigInt("1000000"));
  };

  const handleGetQuoteSimulationCelo = async () => {
    console.log("handleGetQuoteSimulationCelo");
    const quoteAmount = await getQuoteSimulation({
      type: "exactIn",
      amount: BigInt("1000000"),
      tokenIn: CELO_USDC_TOKEN,
      tokenOut: CELO_CHAR_TOKEN,
      fee: FeeAmount.MEDIUM,
    });

    console.log("CELO CHAR quote amount for 10 USDC: ", quoteAmount);
  };

  const handleGetQuoteSimulationEthereum = async () => {
    console.log("handleGetQuoteSimulationEthereum");
    const quoteAmount = await getQuoteSimulation({
      type: "exactIn",
      amount: BigInt("10000000"),
      tokenIn: MAINNET_USDC_TOKEN,
      tokenOut: MAINNET_UNI_TOKEN,
      fee: FeeAmount.MEDIUM,
    });

    console.log("MAINNET UNI quote amount for 10 USDC: ", quoteAmount);
  };

  const handleGetPoolOnCelo = async () => {
    console.log("handleGetPoolOnCelo");
    const pool = await getPool(
      CELO_CHAR_USDC_POOL_ADDRESS,
      CELO_USDC_TOKEN,
      CELO_CHAR_TOKEN
    );

    console.log("Pool on CELO", pool);
  };

  const handleGetPoolOnEthereum = async () => {
    console.log("handleGetPoolOnEthereum");
    const pool = await getPool(
      ETHEREUM_USDC_UNI_POOL_ADDRESS,
      MAINNET_USDC_TOKEN,
      MAINNET_UNI_TOKEN
    );

    console.log("liquidity", pool?.liquidity.toString());

    console.log("Pool on Ethereum", pool);
  };

  const handleGetQuoteFromQuoterOnCelo = async () => {
    console.log("handleGetQuoteFromQuoterOnCelo");
    const pool = await getPool(
      CELO_CHAR_USDC_POOL_ADDRESS,
      CELO_USDC_TOKEN,
      CELO_CHAR_TOKEN
    );

    if (!pool) {
      console.log("Pool not found");
      return;
    }

    const swapRoute = new Route([pool], CELO_USDC_TOKEN, CELO_CHAR_TOKEN);
    const quote = await getQuoteFromQuoter({
      swapRoute,
      amount: BigInt("100000"),
      token: CELO_USDC_TOKEN,
      tradeType: TradeType.EXACT_INPUT,
    });

    console.log("Quote from Quoter on CELO: ", quote);
  };

  const handleGetQuoteFromQuoterOnEthereum = async () => {
    console.log("handleGetQuoteFromQuoterOnEthereum");
    const pool = await getPool(
      ETHEREUM_USDC_UNI_POOL_ADDRESS,
      MAINNET_USDC_TOKEN,
      MAINNET_UNI_TOKEN
    );

    if (!pool) {
      console.log("Pool not found");
      return;
    }

    const swapRoute = new Route([pool], MAINNET_USDC_TOKEN, MAINNET_UNI_TOKEN);
    const quote = await getQuoteFromQuoter({
      swapRoute,
      amount: BigInt("1000000"),
      token: MAINNET_USDC_TOKEN,
      tradeType: TradeType.EXACT_INPUT,
    });

    console.log("Quote from Quoter on Ethereum: ", quote);
  };

  const handleGetUncheckedTradeOnMainnet = async () => {
    console.log("handleGetUncheckedTradeOnMainnet");
    const pool = await getPool(
      ETHEREUM_USDC_UNI_POOL_ADDRESS,
      MAINNET_USDC_TOKEN,
      MAINNET_UNI_TOKEN
    );

    if (!pool) {
      console.log("Pool not found");
      return;
    }

    const swapRoute = new Route([pool], MAINNET_USDC_TOKEN, MAINNET_UNI_TOKEN);

    const quoteAmount = await getQuoteFromQuoter({
      swapRoute,
      amount: BigInt("40000000"),
      token: MAINNET_USDC_TOKEN,
      tradeType: TradeType.EXACT_INPUT,
    });

    if (!quoteAmount) {
      console.log("Quote amount not found");
      return;
    }

    const trade = getUncheckedTrade({
      swapRoute: swapRoute,
      tokenIn: MAINNET_USDC_TOKEN,
      tokenOut: MAINNET_UNI_TOKEN,
      amountIn: parseNumber("40", MAINNET_USDC_TOKEN.decimals),
      quoteAmount,
    });

    console.log("Trade", trade);
    return trade;
  };

  const handleGetUncheckedTradeOnCelo = async () => {
    console.log("handleGetUncheckedTradeOnCelo");
    const pool = await getPool(
      CELO_CHAR_USDC_POOL_ADDRESS,
      CELO_USDC_TOKEN,
      CELO_CHAR_TOKEN
    );

    if (!pool) {
      console.log("Pool not found");
      return;
    }

    const swapRoute = new Route([pool], CELO_USDC_TOKEN, CELO_CHAR_TOKEN);

    const quoteAmount = await getQuoteFromQuoter({
      swapRoute,
      amount: BigInt("10000"),
      token: CELO_USDC_TOKEN,
      tradeType: TradeType.EXACT_INPUT,
    });

    if (!quoteAmount) {
      console.log("Quote amount not found");
      return;
    }

    const trade = getUncheckedTrade({
      swapRoute: swapRoute,
      tokenIn: CELO_USDC_TOKEN,
      tokenOut: CELO_CHAR_TOKEN,
      amountIn: parseNumber("0.01", CELO_USDC_TOKEN.decimals),
      quoteAmount,
    });

    console.log("Trade", trade);

    const mx = trade.swaps[0].route.pools[0].sqrtRatioX96.toString();

    console.log("mx", mx);

    return trade;
  };

  const handleGetMethodParametersOnMainnet = async () => {
    console.log("handleGetMethodParametersOnMainnet");
    const trade = await handleGetUncheckedTradeOnMainnet();
    if (!trade) {
      return;
    }
    if (!address) {
      return;
    }

    console.log("new Percent(50, 10000)", new Percent(50, 10_000));

    const options: SwapOptions = {
      slippageTolerance: new Percent(50, 10000), // 50 bips, or 0.50%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
      recipient: address,
    };

    console.log("options", options);

    const methodParameters = SwapRouter.swapCallParameters([trade], options);

    console.log("methodParameters", methodParameters);

    return methodParameters;
  };

  const handleGetMethodParametersOnCelo = async () => {
    console.log("handleGetMethodParametersOnCelo");
    const trade = await handleGetUncheckedTradeOnCelo();
    if (!trade) {
      return;
    }
    if (!address) {
      return;
    }

    console.log("new Percent(50, 10000)", new Percent(50, 10_000));

    const options: SwapOptions = {
      slippageTolerance: new Percent(100, 10000), // 50 bips, or 0.50%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
      recipient: address,
      sqrtPriceLimitX96: 0,
    };

    console.log("options", options);

    const methodParameters = SwapRouter.swapCallParameters([trade], options);

    console.log("methodParameters", methodParameters);

    return methodParameters;
  };

  const handleSwapOnCelo = async () => {
    console.log("handleSwapCelo");

    if (!address) {
      return;
    }

    try {
      const result = await simulateContract(config, {
        abi: ABI_CELO_ROUTER,
        address: CELO_SWAP_ROUTER_ADDRESS,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: CELO_USDC_TOKEN.address as Address,
            tokenOut: CELO_CHAR_TOKEN.address as Address,
            fee: 3000,
            recipient: address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 20,
            amountIn: BigInt(10000),
            amountOutMinimum: BigInt(0),
            sqrtPriceLimitX96: BigInt(0),
          },
        ],
      });
      console.log("result", result);
      const hash = await writeContract(config, result.request);
      console.log("hash", hash);
    } catch (e) {
      console.log("error", e);
    }
  };

  const handleSwapOnMainnet = async () => {
    console.log("handleSwapMainnet");
    const methodParameters = await handleGetMethodParametersOnMainnet();
    if (!methodParameters) {
      return;
    }

    const res = await sendTransaction(config, {
      to: MAINNET_SWAP_ROUTER_ADDRESS,
      data: methodParameters.calldata as Address,
    });

    console.log("res", res);
  };

  return (
    <>
      <Header />
      <div className="pt-24 p-4">
        <h1 className="font-bold text-2xl mb-4">Kitchen Sink</h1>
        <p className="mb-4">
          This is a kitchen sink component. It is used to test various features
          and components of the app.
        </p>

        <h2 className="text-xl font-semibold mb-2">Trade</h2>
        <div>
          <div className="mb-4">
            <button
              className="button"
              onClick={handleTokenApprovalOnCelo}
              disabled={chainId !== 42220}
            >
              Request token spending approval
            </button>
            <button
              className="button"
              onClick={handleTokenApprovalOnEthereum}
              disabled={chainId !== 1 && chainId !== 31337}
            >
              Request token spending approval on Ethereum Mainnet
            </button>
          </div>
          <div className="mb-4">
            <button
              className="button"
              onClick={handleGetQuoteSimulationCelo}
              disabled={chainId !== 42220}
            >
              Get Quote Simulation on CELO
            </button>

            <button
              className="button"
              onClick={handleGetQuoteSimulationEthereum}
              disabled={chainId !== 1 && chainId !== 31337}
            >
              Get Quote Simulation on Ethereum Mainnet
            </button>
          </div>
          <div className="mb-4">
            <button
              className="button"
              onClick={handleGetPoolOnCelo}
              disabled={chainId !== 42220}
            >
              Get Pool Uniswap object on CELO
            </button>
            <button
              className="button"
              onClick={handleGetPoolOnEthereum}
              disabled={chainId !== 1 && chainId !== 31337}
            >
              Get Pool Uniswap object on Ethereum Mainnet
            </button>
          </div>
          <div className="mb-4">
            <button
              className="button"
              onClick={handleGetQuoteFromQuoterOnCelo}
              disabled={chainId !== 42220}
            >
              Get Quote from Quoter on CELO
            </button>
            <button
              className="button"
              onClick={handleGetQuoteFromQuoterOnEthereum}
              disabled={chainId !== 1 && chainId !== 31337}
            >
              Get Quote from Quoter on Ethereum Mainnet
            </button>
          </div>
          <div className="mb-4">
            <button
              className="button"
              onClick={handleGetUncheckedTradeOnCelo}
              disabled={chainId !== 42220}
            >
              Get Unchecked Trade on CELO
            </button>
            <button
              className="button"
              onClick={handleGetUncheckedTradeOnMainnet}
              disabled={chainId !== 1 && chainId !== 31337}
            >
              Get Unchecked Trade on Ethereum Mainnet
            </button>
          </div>
          <div className="mb-4">
            <button
              className="button"
              onClick={handleGetMethodParametersOnCelo}
              disabled={chainId !== 42220}
            >
              Get Method Parameters on CELO
            </button>
            <button
              className="button"
              onClick={handleGetMethodParametersOnMainnet}
              disabled={chainId !== 1 && chainId !== 31337}
            >
              Get Method Parameters on Ethereum Mainnet
            </button>
          </div>
          <div className="mb-4">
            <button
              className="button"
              onClick={handleSwapOnCelo}
              disabled={chainId !== 42220}
            >
              Swap on CELO
            </button>
            <button
              className="button"
              onClick={handleSwapOnMainnet}
              disabled={chainId !== 1 && chainId !== 31337}
            >
              Swap on Ethereum Mainnet
            </button>
          </div>
          <div className="mb-4 flex gap-8">
            <div className="w-[340px]">
              <div>SWAP on CELO</div>
              {chainId === 42220 && (
                <UniswapTrading
                  tokenPair={[CELO_USDC_TOKEN, CELO_CHAR_TOKEN]}
                />
              )}
            </div>
            <div className="w-[340px]">
              <div>SWAP on Ethereum</div>
              {(chainId === 1 || chainId === 31337) && (
                <UniswapTrading
                  tokenPair={[MAINNET_USDC_TOKEN, MAINNET_UNI_TOKEN]}
                />
              )}
            </div>
          </div>
          <div className="mb-4 flex gap-8">
            <div className="w-[340px] grid p-4">
              <div className="mb-4">
                <span>
                  USDC balance on CELO:{" "}
                  <span className="font-bold">
                    {tokenBalances[CELO_USDC_TOKEN_ADDRESS]}
                  </span>
                </span>
                <button
                  disabled={chainId !== 42220}
                  className="button mt-4"
                  onClick={async () => {
                    if (!address) {
                      return;
                    }
                    const balance = await getBalance(config, {
                      address,
                      token: CELO_USDC_TOKEN_ADDRESS,
                    });

                    console.log("balance", balance);

                    setTokenBalances({
                      ...tokenBalances,
                      [CELO_USDC_TOKEN_ADDRESS]: balance.formatted,
                    });
                  }}
                >
                  Check Balance
                </button>
              </div>
              <div>
                <span>
                  CHAR balance on CELO:{" "}
                  <span className="font-bold">
                    {tokenBalances[CELO_CHAR_TOKEN_ADDRESS]}
                  </span>
                </span>
                <button
                  disabled={chainId !== 42220}
                  className="button mt-4"
                  onClick={async () => {
                    if (!address) {
                      return;
                    }
                    const balance = await getBalance(config, {
                      address,
                      token: CELO_CHAR_TOKEN_ADDRESS,
                    });

                    console.log("balance", balance);

                    setTokenBalances({
                      ...tokenBalances,
                      [CELO_CHAR_TOKEN_ADDRESS]: balance.formatted,
                    });
                  }}
                >
                  Check Balance
                </button>
              </div>
            </div>
            <div className="w-[340px] grid p-4">
              <div className="mb-4">
                <span>
                  USDC balance on Ethereum:{" "}
                  <span className="font-bold">
                    {tokenBalances[MAINNET_USDC_TOKEN_ADDRESS]}
                  </span>
                </span>
                <button
                  disabled={chainId !== 1 && chainId !== 31337}
                  className="button mt-4"
                  onClick={async () => {
                    if (!address) {
                      return;
                    }
                    const balance = await getBalance(config, {
                      address,
                      token: MAINNET_USDC_TOKEN_ADDRESS,
                    });

                    console.log("balance", balance);

                    setTokenBalances({
                      ...tokenBalances,
                      [MAINNET_USDC_TOKEN_ADDRESS]: balance.formatted,
                    });
                  }}
                >
                  Check Balance
                </button>
              </div>
              <div className="mb-4">
                <span>
                  UNI balance on Ethereum:{" "}
                  <span className="font-bold">
                    {tokenBalances[MAINNET_UNI_TOKEN_ADDRESS]}
                  </span>
                </span>
                <button
                  disabled={chainId !== 1 && chainId !== 31337}
                  className="button mt-4"
                  onClick={async () => {
                    if (!address) {
                      return;
                    }
                    const balance = await getBalance(config, {
                      address,
                      token: MAINNET_UNI_TOKEN_ADDRESS,
                    });

                    console.log("balance", balance);

                    setTokenBalances({
                      ...tokenBalances,
                      [MAINNET_UNI_TOKEN_ADDRESS]: balance.formatted,
                    });
                  }}
                >
                  Check Balance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

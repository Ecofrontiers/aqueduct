import { useState, useCallback, useRef } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { custom } from "viem";
import { filecoinCalibration } from "../../wagmi";
import { calibration as synapseCalibration } from "@filoz/synapse-core/chains";
import type { VerifiableProvenance } from "../intelligence/types";

// Lazy-load the Synapse SDK to avoid blocking initial render
let synapseModule: typeof import("@filoz/synapse-sdk") | null = null;
let synapseInstance: InstanceType<
  (typeof import("@filoz/synapse-sdk"))["Synapse"]
> | null = null;

async function getSynapseSDK() {
  if (!synapseModule) {
    synapseModule = await import("@filoz/synapse-sdk");
  }
  return synapseModule;
}

export type SynapseStatus =
  | "idle"
  | "connecting"
  | "approving"
  | "depositing"
  | "connected"
  | "uploading"
  | "downloading"
  | "error";

export interface UploadResult {
  pieceCid: string;
  size: number;
  dataSetId?: string;
}

export function useSynapse() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient({
    chainId: filecoinCalibration.id,
  });
  const [status, setStatus] = useState<SynapseStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<unknown>(null);

  const connect = useCallback(async () => {
    if (!address || !walletClient) {
      setError("Wallet not connected or not on Filecoin Calibration");
      return false;
    }

    try {
      setStatus("connecting");
      setError(null);

      const sdk = await getSynapseSDK();

      // Use Synapse.create with the SDK's own chain definition (includes contract
      // addresses, genesis timestamp, filbeam config). Wrap walletClient's transport
      // with viem's custom() factory so Synapse.create can pass it to createClient.
      console.log("[Synapse] Creating instance...");
      synapseInstance = sdk.Synapse.create({
        chain: synapseCalibration,
        transport: custom(walletClient.transport),
        account: walletClient.account,
        withCDN: true,
      });

      // Check if Warm Storage service is already approved
      console.log("[Synapse] Checking service approval...");
      const approval = await synapseInstance.payments.serviceApproval();
      console.log("[Synapse] Service approval:", approval);

      if (!approval.isApproved) {
        setStatus("approving");
        console.log("[Synapse] Approving Warm Storage service...");
        const approveTx = await synapseInstance.payments.approveService();
        console.log("[Synapse] Approval tx:", approveTx);
        // Wait for confirmation
        await walletClient.request({
          method: "eth_getTransactionReceipt",
          params: [approveTx],
        });
      }

      // Check USDFC balance and deposit if needed
      console.log("[Synapse] Checking balance...");
      const balance = await synapseInstance.payments.balance();
      console.log("[Synapse] Current USDFC balance in Pay contract:", balance.toString());

      // Deposit if Pay contract is empty — skip if any balance exists (already funded)
      const minRequired = 2n * 10n ** 18n;
      if (balance === 0n) {
        setStatus("depositing");
        const depositAmount = minRequired - balance;
        console.log(`[Synapse] Depositing ${depositAmount} wei USDFC (have ${balance}, need ${minRequired})...`);
        const depositTx = await synapseInstance.payments.deposit({
          amount: depositAmount,
          onAllowanceCheck: (current, required) => {
            console.log(`[Synapse] Allowance: current=${current}, required=${required}`);
          },
          onApprovalTransaction: (tx) => {
            console.log("[Synapse] ERC20 approval tx:", tx);
          },
          onApprovalConfirmed: (receipt) => {
            console.log("[Synapse] ERC20 approval confirmed:", receipt.transactionHash);
          },
          onDepositStarting: () => {
            console.log("[Synapse] Starting deposit...");
          },
        });
        console.log("[Synapse] Deposit tx:", depositTx);

        // Wait for deposit confirmation before proceeding
        let confirmed = false;
        for (let i = 0; i < 30; i++) {
          const receipt = await walletClient.request({
            method: "eth_getTransactionReceipt",
            params: [depositTx],
          });
          if (receipt) {
            confirmed = true;
            console.log("[Synapse] Deposit confirmed");
            break;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (!confirmed) {
          throw new Error("Deposit transaction not confirmed after 60s");
        }

        // Verify new balance
        const newBalance = await synapseInstance.payments.balance();
        console.log("[Synapse] New balance after deposit:", newBalance.toString());
      }

      // Create storage context
      console.log("[Synapse] Creating storage context...");
      const ctx = await synapseInstance.storage.createContext({
        withCDN: true,
        metadata: {
          app: "regen-atlas",
          type: "provenance",
        },
      });
      contextRef.current = ctx;

      setStatus("connected");
      console.log("[Synapse] Ready for uploads");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      console.error("[Synapse] Connect failed:", err);
      setError(msg);
      setStatus("error");
      return false;
    }
  }, [address, walletClient]);

  const uploadProvenance = useCallback(
    async (
      provenance: VerifiableProvenance
    ): Promise<UploadResult | null> => {
      if (!synapseInstance) {
        setError("Synapse not connected");
        return null;
      }

      try {
        setStatus("uploading");
        setError(null);

        const jsonStr = JSON.stringify(provenance, null, 2);
        const data = new TextEncoder().encode(jsonStr);

        const result = await synapseInstance.storage.upload(data, {
          context: contextRef.current as never,
          callbacks: {
            onPiecesConfirmed: (dataSetId, pieces) => {
              console.log(
                `[Synapse] Pieces confirmed in dataset ${dataSetId}:`,
                pieces.map((p) => String(p.pieceCid))
              );
            },
          },
        });

        setStatus("connected");
        return {
          pieceCid: String(result.pieceCid),
          size: result.size,
          dataSetId: result.pieceId ? String(result.pieceId) : undefined,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        console.error("[Synapse] Upload failed:", err);
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    []
  );

  const uploadRaw = useCallback(
    async (data: Uint8Array): Promise<UploadResult | null> => {
      if (!synapseInstance) {
        setError("Synapse not connected");
        return null;
      }

      try {
        setStatus("uploading");
        setError(null);

        const result = await synapseInstance.storage.upload(data, {
          context: contextRef.current as never,
          callbacks: {
            onPiecesConfirmed: (dataSetId, pieces) => {
              console.log(
                `[Synapse] Pieces confirmed in dataset ${dataSetId}:`,
                pieces.map((p) => String(p.pieceCid))
              );
            },
          },
        });

        setStatus("connected");
        return {
          pieceCid: String(result.pieceCid),
          size: result.size,
          dataSetId: result.pieceId ? String(result.pieceId) : undefined,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        console.error("[Synapse] Raw upload failed:", err);
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    []
  );

  const downloadProvenance = useCallback(
    async (pieceCid: string): Promise<VerifiableProvenance | null> => {
      if (!synapseInstance) {
        setError("Synapse not connected");
        return null;
      }

      try {
        setStatus("downloading");
        setError(null);

        const data = await synapseInstance.storage.download({
          pieceCid,
          withCDN: true,
        });

        const text = new TextDecoder().decode(data);
        const provenance = JSON.parse(text) as VerifiableProvenance;

        setStatus("connected");
        return provenance;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Download failed";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    []
  );

  return {
    status,
    error,
    chain,
    isConnected: isConnected && status === "connected",
    isFilecoinReady: isConnected && !!walletClient,
    connect,
    uploadProvenance,
    uploadRaw,
    downloadProvenance,
  };
}

/**
 * RAEIS Publisher — Hedera SDK client for HCS + HTS operations
 *
 * Creates topics, posts messages, creates NFT collections, mints NFTs.
 * Supports dry-run mode for testing without submitting transactions.
 */

import {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenType,
  TokenSupplyType,
  TransactionReceipt,
  Hbar,
} from "@hashgraph/sdk";
import type { TransactionRecord } from "./schemas.js";

export interface PublisherConfig {
  operatorId: string;
  operatorKey: string;
  network: "testnet" | "mainnet";
  dryRun?: boolean;
}

export class RAEISPublisher {
  private client: Client;
  private operatorId: AccountId;
  private operatorKey: PrivateKey;
  private network: string;
  private dryRun: boolean;
  private transactions: TransactionRecord[] = [];
  private dryRunCounter = 0;

  constructor(config: PublisherConfig) {
    this.operatorId = AccountId.fromString(config.operatorId);
    // Auto-detect key type: ECDSA keys from portal start with 0x or are 64 hex chars
    const keyStr = config.operatorKey.replace(/^0x/, "");
    this.operatorKey = keyStr.length === 64
      ? PrivateKey.fromStringECDSA(keyStr)
      : PrivateKey.fromStringED25519(config.operatorKey);
    this.network = config.network;
    this.dryRun = config.dryRun ?? false;

    if (config.network === "mainnet") {
      this.client = Client.forMainnet();
    } else {
      this.client = Client.forTestnet();
    }
    this.client.setOperator(this.operatorId, this.operatorKey);
    // Set reasonable defaults for transaction fees
    this.client.setDefaultMaxTransactionFee(new Hbar(10));
    this.client.setDefaultMaxQueryPayment(new Hbar(5));
  }

  private hashscanUrl(type: "topic" | "token" | "transaction", id: string): string {
    return `https://hashscan.io/${this.network}/${type}/${id}`;
  }

  private log(msg: string) {
    const prefix = this.dryRun ? "[DRY-RUN]" : "[PUBLISH]";
    console.log(`  ${prefix} ${msg}`);
  }

  private addTransaction(record: Omit<TransactionRecord, "timestamp">) {
    this.transactions.push({ ...record, timestamp: new Date().toISOString() });
  }

  /**
   * Create an HCS topic with a memo
   */
  async createTopic(memo: string): Promise<string> {
    this.log(`Creating topic: ${memo.slice(0, 60)}...`);

    if (this.dryRun) {
      const fakeId = `0.0.${9000000 + this.dryRunCounter++}`;
      this.addTransaction({
        layer: memo.includes("RAEIS —") || memo.includes("Methodology") ? 1 : 2,
        type: "topic-create",
        label: memo,
        entityId: fakeId,
        transactionId: `0.0.0@${Date.now()}-dry`,
        hashscanUrl: this.hashscanUrl("topic", fakeId),
      });
      return fakeId;
    }

    const tx = new TopicCreateTransaction()
      .setTopicMemo(memo)
      .setAdminKey(this.operatorKey)
      .setSubmitKey(this.operatorKey);

    const response = await tx.execute(this.client);
    const receipt: TransactionReceipt = await response.getReceipt(this.client);
    const topicId = receipt.topicId!.toString();
    const txId = response.transactionId.toString();

    this.addTransaction({
      layer: memo.includes("RAEIS —") || memo.includes("Methodology") ? 1 : 2,
      type: "topic-create",
      label: memo,
      entityId: topicId,
      transactionId: txId,
      hashscanUrl: this.hashscanUrl("topic", topicId),
    });

    this.log(`  → Topic created: ${topicId}`);
    return topicId;
  }

  /**
   * Post a JSON message to an HCS topic
   */
  async postMessage(topicId: string, message: object, label: string): Promise<number> {
    const payload = JSON.stringify(message);
    this.log(`Posting to ${topicId}: ${label} (${payload.length} bytes)`);

    if (this.dryRun) {
      const seq = this.dryRunCounter++;
      this.addTransaction({
        layer: label.includes("Methodology") ? 1 : 2,
        type: "message-submit",
        label,
        entityId: `${topicId}#${seq}`,
        transactionId: `0.0.0@${Date.now()}-dry`,
        hashscanUrl: this.hashscanUrl("topic", topicId),
        metadata: { messageSize: payload.length },
      });
      return seq;
    }

    const tx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(payload);

    const response = await tx.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    const seq = Number(receipt.topicSequenceNumber);
    const txId = response.transactionId.toString();

    this.addTransaction({
      layer: label.includes("Methodology") ? 1 : 2,
      type: "message-submit",
      label,
      entityId: `${topicId}#${seq}`,
      transactionId: txId,
      hashscanUrl: this.hashscanUrl("topic", topicId),
      metadata: { messageSize: payload.length, sequenceNumber: seq },
    });

    this.log(`  → Message submitted: sequence #${seq}`);
    return seq;
  }

  /**
   * Create an HTS NFT collection (non-fungible token)
   */
  async createNFTCollection(
    name: string,
    symbol: string,
    maxSupply: number
  ): Promise<string> {
    this.log(`Creating NFT collection: ${name} (${symbol}), max=${maxSupply}`);

    if (this.dryRun) {
      const fakeId = `0.0.${9000000 + this.dryRunCounter++}`;
      this.addTransaction({
        layer: 3,
        type: "nft-collection-create",
        label: `${name} (${symbol})`,
        entityId: fakeId,
        transactionId: `0.0.0@${Date.now()}-dry`,
        hashscanUrl: this.hashscanUrl("token", fakeId),
        metadata: { maxSupply },
      });
      return fakeId;
    }

    const tx = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(maxSupply)
      .setTreasuryAccountId(this.operatorId)
      .setAdminKey(this.operatorKey)
      .setSupplyKey(this.operatorKey)
      .freezeWith(this.client);

    const signed = await tx.sign(this.operatorKey);
    const response = await signed.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    const tokenId = receipt.tokenId!.toString();
    const txId = response.transactionId.toString();

    this.addTransaction({
      layer: 3,
      type: "nft-collection-create",
      label: `${name} (${symbol})`,
      entityId: tokenId,
      transactionId: txId,
      hashscanUrl: this.hashscanUrl("token", tokenId),
      metadata: { maxSupply },
    });

    this.log(`  → NFT collection created: ${tokenId}`);
    return tokenId;
  }

  /**
   * Mint a single NFT in a collection
   */
  async mintNFT(tokenId: string, metadata: Uint8Array, label: string): Promise<number> {
    this.log(`Minting NFT in ${tokenId}: ${label}`);

    if (this.dryRun) {
      const serial = this.dryRunCounter++;
      this.addTransaction({
        layer: 3,
        type: "nft-mint",
        label,
        entityId: `${tokenId}#${serial}`,
        transactionId: `0.0.0@${Date.now()}-dry`,
        hashscanUrl: this.hashscanUrl("token", tokenId),
        metadata: { serial, metadataBytes: metadata.length },
      });
      return serial;
    }

    const tx = new TokenMintTransaction()
      .setTokenId(tokenId)
      .addMetadata(metadata)
      .freezeWith(this.client);

    const signed = await tx.sign(this.operatorKey);
    const response = await signed.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    const serial = Number(receipt.serials[0]);
    const txId = response.transactionId.toString();

    this.addTransaction({
      layer: 3,
      type: "nft-mint",
      label,
      entityId: `${tokenId}#${serial}`,
      transactionId: txId,
      hashscanUrl: this.hashscanUrl("token", tokenId),
      metadata: { serial, metadataBytes: metadata.length },
    });

    this.log(`  → NFT minted: serial #${serial}`);
    return serial;
  }

  /**
   * Get all recorded transactions
   */
  getTransactions(): TransactionRecord[] {
    return [...this.transactions];
  }

  /**
   * Close the client connection
   */
  close() {
    this.client.close();
  }
}

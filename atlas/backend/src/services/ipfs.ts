import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export class IPFSService {
  private client: IPFSHTTPClient;

  constructor() {
    this.client = create({ url: config.ipfsUrl });
  }

  /**
   * Add data to IPFS
   */
  async add(data: Record<string, unknown>): Promise<string> {
    try {
      const json = JSON.stringify(data);
      const result = await this.client.add(json);
      logger.debug({ cid: result.cid.toString() }, 'Added data to IPFS');
      return result.cid.toString();
    } catch (err) {
      logger.error(err, 'Failed to add data to IPFS');
      throw err;
    }
  }

  /**
   * Add file to IPFS
   */
  async addFile(content: Buffer | string, filename?: string): Promise<string> {
    try {
      const result = await this.client.add({
        content,
        path: filename,
      });
      logger.debug({ cid: result.cid.toString() }, 'Added file to IPFS');
      return result.cid.toString();
    } catch (err) {
      logger.error(err, 'Failed to add file to IPFS');
      throw err;
    }
  }

  /**
   * Get data from IPFS
   */
  async get(cid: string): Promise<string> {
    try {
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString('utf8');
      return data;
    } catch (err) {
      logger.error(err, 'Failed to get data from IPFS');
      throw err;
    }
  }

  /**
   * Get JSON data from IPFS
   */
  async getJSON<T>(cid: string): Promise<T> {
    const data = await this.get(cid);
    return JSON.parse(data) as T;
  }

  /**
   * Pin CID to ensure persistence
   */
  async pin(cid: string): Promise<void> {
    try {
      await this.client.pin.add(cid);
      logger.debug({ cid }, 'Pinned CID');
    } catch (err) {
      logger.error(err, 'Failed to pin CID');
      throw err;
    }
  }

  /**
   * Unpin CID
   */
  async unpin(cid: string): Promise<void> {
    try {
      await this.client.pin.rm(cid);
      logger.debug({ cid }, 'Unpinned CID');
    } catch (err) {
      logger.error(err, 'Failed to unpin CID');
      throw err;
    }
  }

  /**
   * Get IPFS gateway URL for a CID
   */
  getGatewayUrl(cid: string): string {
    return `${config.ipfsGateway}${cid}`;
  }
}

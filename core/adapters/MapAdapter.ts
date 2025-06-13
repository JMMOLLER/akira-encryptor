import decryptText from "../crypto/decryptText";
import encryptText from "../crypto/encryptText";
import type { JSONFile } from "lowdb/node";
import type { Adapter } from "lowdb";

/**
 * @description `[ENG]` This adapter is used to store encrypted items in a JSON file.
 * @description `[ESP]` Este adaptador se utiliza para almacenar elementos cifrados en un archivo JSON.
 * @requires `lowdb` and `lowdb/node`
 */
class MapAdapter<T extends EncryptedDataStore> implements Adapter<T> {
  private encoding: BufferEncoding;
  private secretKey: Uint8Array;
  private adapter: JSONFile<any>;
  public data: T | null = null;

  constructor(
    adapter: JSONFile<any>,
    secretKey: Uint8Array,
    encoding: BufferEncoding
  ) {
    this.adapter = adapter;

    this.encoding = encoding;
    this.secretKey = secretKey;
  }

  async read() {
    const encrypted = await this.adapter.read();
    if (!encrypted) {
      this.data = { encryptedItems: new Map() } as unknown as T;
      return this.data;
    }

    const decrypted = decryptText(encrypted, this.secretKey, this.encoding);
    const raw = JSON.parse(decrypted) as T;

    if (raw && raw.encryptedItems) {
      raw.encryptedItems = new Map(Object.entries(raw.encryptedItems)) as any;
    }

    this.data = raw;
    return this.data;
  }

  async write() {
    if (!this.data || !(this.data.encryptedItems instanceof Map)) return;

    const toWrite = {
      ...this.data,
      encryptedItems: Object.fromEntries(this.data.encryptedItems)
    };

    const json = JSON.stringify(toWrite, null, 2);
    const encrypted = await encryptText(json, this.secretKey, this.encoding);

    await this.adapter.write(encrypted);
  }
}

export default MapAdapter;

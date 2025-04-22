import type { JSONFile } from "lowdb/node";
import type { Adapter } from "lowdb";

/**
 * @description `[ENG]` This adapter is used to store encrypted items in a JSON file.
 * @description `[ESP]` Este adaptador se utiliza para almacenar elementos cifrados en un archivo JSON.
 * @requires `lowdb` and `lowdb/node`
 */
class MapAdapter<T extends EncryptedDataStore> implements Adapter<T> {
  private encryptFunc: any;
  private decryptFunc: any;
  private adapter: JSONFile<any>;
  public data: T | null = null;

  constructor(adapter: JSONFile<any>, encryptFunc: EncryptorFunc, decryptFunc: EncryptorFunc) {
    this.adapter = adapter;
    this.encryptFunc = encryptFunc;
    this.decryptFunc = decryptFunc;
  }

  async read() {
    const encrypted = await this.adapter.read();
    if (!encrypted) {
      this.data = { encryptedItems: new Map() } as unknown as T;
      return this.data;
    }

    const decrypted = await this.decryptFunc(encrypted);
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
    const encrypted = this.encryptFunc(json);

    await this.adapter.write(encrypted);
  }
}

export default MapAdapter;

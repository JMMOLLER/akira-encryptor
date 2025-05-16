import MapAdapter from "@adapters/MapAdapter";
import generateUID from "@utils/generateUID";
import type { StorageItem } from "types";
import { JSONFile } from "lowdb/node";
import { env } from "@configs/env";
import { Low } from "lowdb";

class Storage {
  private static readonly LIBRARY_PATH = env.LIBRARY_PATH;
  private static db: LowStoreType;

  private constructor() {}

  /**
   * @description `[ENG]` Initializes the storage with the given encryption and decryption functions to encrypt and decrypt the data.
   * @description `[ESP]` Inicializa el almacenamiento con las funciones de cifrado y descifrado dadas para descifrar y cifrar los datos.
   * @param encryptFunc - The function used to encrypt the data.
   * @param decryptFunc - The function used to decrypt the data.
   */
  static async init(encryptFunc: EncryptorFunc, decryptFunc: EncryptorFunc) {
    const adapter = new MapAdapter(
      new JSONFile<EncryptedDataStore>(Storage.LIBRARY_PATH),
      encryptFunc,
      decryptFunc
    );
    Storage.db = new Low(adapter as any, { encryptedItems: new Map() });

    await Storage.db.read();
    if (!Storage.db.data) {
      Storage.db.data = { encryptedItems: new Map() };
    }

    return new Storage();
  }

  getAll() {
    return Storage.db.data.encryptedItems;
  }

  get(id: string) {
    return Storage.db.data.encryptedItems.get(id);
  }

  /**
   * @description `[ENG]` Store an item in the storage. If the item has an `id`, it will be replaced.
   * @description `[ESP]` Almacena un elemento en el almacenamiento. Si el elemento tiene un `id`, será reemplazado.
   * @param item `Omit<StorageItem, "id">` - The item to be stored. It should not contain the `id` property.
   */
  async set(item: Omit<FileItem, "id">): Promise<FileItem>;
  async set(item: Omit<FolderItem, "id">): Promise<FolderItem>;
  async set(item: Omit<FileItem | FolderItem, "id">): Promise<StorageItem> {
    const newId = generateUID();
    const newItem = {...item, id: newId} as StorageItem;

    Storage.db.data.encryptedItems.set(newItem.id, newItem);
    await Storage.db.write();
    return newItem;
  }

  async delete(id: string) {
    Storage.db.data.encryptedItems.delete(id);
    return await Storage.db.write();
  }

  async replace(id: string, item: StorageItem) {
    const existingItem = this.get(id);
    if (!existingItem) {
      throw new Error(`Item with id ${id} not found`);
    }

    const newItem: StorageItem = { ...item, id };
    Storage.db.data.encryptedItems.set(id, newItem);
    await Storage.db.write();
    return newItem;
  }
}

export default Storage;

import { describe, it, expect, beforeEach, vi } from "vitest";
import Encryptor from "@libs/Encryptor";
import Storage from "@libs/Storage";

const testItem: StorageItemType = {
  encryptedName: "test.txt",
  path: "test.txt",
  isHidden: false,
  id: "mock-uid",
  type: "file"
};

describe("Storage", () => {
  let storage: Storage;
  let encryptor: Encryptor;

  beforeEach(async () => {
    encryptor = await Encryptor.init("mypassword");
    storage = await Storage.init(
      encryptor.encryptText.bind(encryptor),
      encryptor.decryptText.bind(encryptor)
    );
    vi.clearAllMocks();
  });

  it("should add an item to storage", async () => {
    const setSpy = vi.spyOn(storage, "set");
    const result = await storage.set(testItem);

    expect(setSpy).toHaveBeenCalledWith(testItem);
    expect(result).toHaveProperty("id");
    expect(result.id).not.toBe(testItem.id);
  });

  it("should retrieve an item from storage", async () => {
    const { id } = await storage.set(testItem);
    const getSpy = vi.spyOn(storage, "get");
    const result = storage.get(id);

    expect(getSpy).toHaveBeenCalledWith(id);
    expect(result).toEqual({ ...testItem, id });
  });

  it("should remove an item from storage", async () => {
    await storage.set(testItem);
    const removeSpy = vi.spyOn(storage, "delete");
    await storage.delete(testItem.id);

    const result = storage.get(testItem.id);
    expect(removeSpy).toHaveBeenCalledWith(testItem.id);
    expect(result).toBeUndefined();
  });

  it("should encrypt and decrypt data correctly", async () => {
    const encryptedName = encryptor.encryptText(testItem.encryptedName);
    const decryptedName = encryptor.decryptText(encryptedName);

    expect(encryptedName).not.toEqual(testItem.encryptedName);
    expect(decryptedName).toEqual(testItem.encryptedName);
  });

  it("should handle non-existent items gracefully", async () => {
    const getSpy = vi.spyOn(storage, "get");
    const result = storage.get("non-existent-id");

    expect(getSpy).toHaveBeenCalledWith("non-existent-id");
    expect(result).toBeUndefined();
  });

  it("should update an existing item in storage", async () => {
    await storage.set(testItem);
    const updatedItem = { ...testItem, encryptedName: "updated.txt" };
    const updateSpy = vi.spyOn(storage, "set");
    const { id } = await storage.set(updatedItem);

    const result = storage.get(id);
    expect(updateSpy).toHaveBeenCalledWith(updatedItem);
    expect(result).toEqual({ ...updatedItem, id });
  });
});

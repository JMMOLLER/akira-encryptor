import { describe, it, expect, beforeEach, vi } from "vitest";
import { FileSystem } from "@libs/FileSystem";
import fs from "fs";

vi.mock("fs");
vi.mock("path");
vi.mock("@configs/env", () => ({
  env: { LIBRARY_PATH: "/mock/library.json" }
}));
vi.mock("@utils/generateUID", () => ({
  default: vi.fn(() => "mock-uid")
}));
vi.mock("@utils/validateUID", () => ({
  default: vi.fn((uid) => {
    if (!uid.startsWith("mock-")) throw new Error("Invalid UID");
  })
}));

describe("FileSystem", () => {
  let fileSystem: FileSystem;

  beforeEach(() => {
    fileSystem = FileSystem.getInstance();
    vi.clearAllMocks();
  });

  it("should get file statistics", () => {
    const mockStats = { size: 1234 };
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "statSync").mockReturnValue(mockStats as any);

    const result = fileSystem.getStatFile("/mock/path");

    expect(result).toBe(mockStats);
  });

  it("should throw an error when getting stats for a non-existent file", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(() => fileSystem.getStatFile("/mock/path")).toThrow(
      "File not found: /mock/path"
    );
  });

  it("should create a readable stream", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const createReadStreamSpy = vi.spyOn(fs, "createReadStream");

    fileSystem.createReadStream("/mock/path");

    expect(createReadStreamSpy).toHaveBeenCalledWith("/mock/path", {
      highWaterMark: undefined
    });
  });

  it("should throw an error when creating a readable stream for a non-existent file", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(() => fileSystem.createReadStream("/mock/path")).toThrow(
      "File not found: /mock/path"
    );
  });

  it("should remove a file", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const unlinkSyncSpy = vi.spyOn(fs, "unlinkSync");

    fileSystem.removeFile("/mock/path");

    expect(unlinkSyncSpy).toHaveBeenCalledWith("/mock/path");
  });

  it("should handle non-existent files gracefully when removing", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(() => fileSystem.removeFile("/mock/path")).not.toThrow();
  });

  it("should read a directory", () => {
    const mockDirents = [{ name: "file.txt" }];
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readdirSync").mockReturnValue(mockDirents as any);

    const result = fileSystem.readDir("/mock/folder");

    expect(result).toBe(mockDirents);
  });

  it("should throw an error when reading a non-existent directory", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(() => fileSystem.readDir("/mock/folder")).toThrow(
      "Directory not found: /mock/folder"
    );
  });

  it("should rename a folder", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    const renameSyncSpy = vi.spyOn(fs, "renameSync");

    fileSystem.renameFolder("/mock/folder", "/mock/new-folder");

    expect(renameSyncSpy).toHaveBeenCalledWith(
      "/mock/folder",
      "/mock/new-folder"
    );
  });

  it("should throw an error when renaming a non-existent folder", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    expect(() =>
      fileSystem.renameFolder("/mock/folder", "/mock/new-folder")
    ).toThrow("Directory not found: /mock/folder");
  });

  it("should create a folder", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const mkdirSyncSpy = vi.spyOn(fs, "mkdirSync");

    fileSystem.createFolder("/mock/folder");

    expect(mkdirSyncSpy).toHaveBeenCalledWith("/mock/folder", {
      recursive: true
    });
  });

  it("should throw an error when creating an existing folder", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);

    expect(() => fileSystem.createFolder("/mock/folder")).toThrow(
      "Directory already exists: /mock/folder"
    );
  });

  it("should safely rename a folder with retries", async () => {
    const renameSpy = vi
      .spyOn(fileSystem, "renameFolder")
      .mockImplementationOnce(() => {
        throw new Error("Temporary error");
      });

    await fileSystem.safeRenameFolder("/mock/src", "/mock/dest");

    expect(renameSpy).toHaveBeenCalledTimes(2);
  });
});

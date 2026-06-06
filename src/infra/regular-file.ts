// Exposes regular-file IO helpers with fs-safe defaults.
import "./fs-safe-defaults.js";
import fsSync from "node:fs";
import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { sameFileIdentity } from "@openclaw/fs-safe/advanced";
import { assertNoSymlinkParents, assertNoSymlinkParentsSync } from "@openclaw/fs-safe/advanced";
import type { AppendRegularFileOptions } from "@openclaw/fs-safe/advanced";
import { isNotFoundPathError } from "@openclaw/fs-safe/path";

// Regular-file IO helpers reject symlinks and non-file targets before reads or
// appends touch user-controlled paths.
export {
  readRegularFile,
  readRegularFileSync,
  statRegularFile,
  statRegularFileSync,
  type AppendRegularFileOptions,
  type RegularFileStatResult,
} from "@openclaw/fs-safe/advanced";

type RegularFileAppendFlagConstants = Pick<
  typeof fsSync.constants,
  "O_APPEND" | "O_CREAT" | "O_WRONLY"
> &
  Partial<Pick<typeof fsSync.constants, "O_NOFOLLOW">>;

export function resolveRegularFileAppendFlags(
  constants: RegularFileAppendFlagConstants = fsSync.constants,
): number {
  const noFollow = constants.O_NOFOLLOW;
  return (
    constants.O_CREAT |
    constants.O_APPEND |
    constants.O_WRONLY |
    (typeof noFollow === "number" ? noFollow : 0)
  );
}

function verifyStableAppendTarget(params: {
  preOpenStat?: Stats;
  postOpenStat: Stats;
  filePath: string;
}) {
  if (!params.postOpenStat.isFile()) {
    throw new Error(`Refusing to append to non-file: ${params.filePath}`);
  }
  if (params.postOpenStat.nlink > 1) {
    throw new Error(`Refusing to append to hardlinked file: ${params.filePath}`);
  }
  const pre = params.preOpenStat;
  if (pre && !sameFileIdentity(pre, params.postOpenStat)) {
    throw new Error(`Refusing to append after file changed: ${params.filePath}`);
  }
}

export async function appendRegularFile(options: AppendRegularFileOptions): Promise<void> {
  if (options.rejectSymlinkParents === true) {
    const resolvedDir = path.resolve(path.dirname(options.filePath));
    await assertNoSymlinkParents({
      rootDir: path.parse(resolvedDir).root,
      targetPath: resolvedDir,
      allowMissing: false,
      allowRootChildSymlink: true,
      requireDirectories: true,
      messagePrefix: "Refusing to append under",
    });
  }

  let preOpenStat: Stats | undefined;
  try {
    const stat = await fs.lstat(options.filePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing to append through symlink: ${options.filePath}`);
    }
    if (!stat.isFile()) {
      throw new Error(`Refusing to append to non-file: ${options.filePath}`);
    }
    preOpenStat = stat;
  } catch (err) {
    if (!isNotFoundPathError(err)) {
      throw err;
    }
  }

  const contentBytes = Buffer.isBuffer(options.content)
    ? options.content.byteLength
    : Buffer.byteLength(options.content, options.encoding ?? "utf8");
  if (
    options.maxFileBytes !== undefined &&
    (preOpenStat?.size ?? 0) + contentBytes > options.maxFileBytes
  ) {
    return;
  }

  const handle = await fs.open(
    options.filePath,
    resolveRegularFileAppendFlags(),
    options.mode ?? 0o600,
  );
  try {
    const stat = await handle.stat();
    verifyStableAppendTarget({ preOpenStat, postOpenStat: stat, filePath: options.filePath });
    if (options.maxFileBytes !== undefined && stat.size + contentBytes > options.maxFileBytes) {
      return;
    }
    await handle.chmod(options.mode ?? 0o600).catch(() => undefined);
    await handle.appendFile(options.content, options.encoding ?? "utf8");
  } finally {
    await handle.close();
  }
}

export function appendRegularFileSync(options: AppendRegularFileOptions): void {
  if (options.rejectSymlinkParents === true) {
    const resolvedDir = path.resolve(path.dirname(options.filePath));
    assertNoSymlinkParentsSync({
      rootDir: path.parse(resolvedDir).root,
      targetPath: resolvedDir,
      allowMissing: false,
      allowRootChildSymlink: true,
      requireDirectories: true,
      messagePrefix: "Refusing to append under",
    });
  }

  let preOpenStat: Stats | undefined;
  try {
    const stat = fsSync.lstatSync(options.filePath);
    if (stat.isSymbolicLink()) {
      throw new Error(`Refusing to append through symlink: ${options.filePath}`);
    }
    if (!stat.isFile()) {
      throw new Error(`Refusing to append to non-file: ${options.filePath}`);
    }
    preOpenStat = stat;
  } catch (err) {
    if (!isNotFoundPathError(err)) {
      throw err;
    }
  }

  const contentBuffer =
    typeof options.content === "string"
      ? Buffer.from(options.content, options.encoding ?? "utf8")
      : Buffer.from(options.content);
  if (
    options.maxFileBytes !== undefined &&
    (preOpenStat?.size ?? 0) + contentBuffer.byteLength > options.maxFileBytes
  ) {
    return;
  }

  const fd = fsSync.openSync(
    options.filePath,
    resolveRegularFileAppendFlags(),
    options.mode ?? 0o600,
  );
  try {
    const stat = fsSync.fstatSync(fd);
    verifyStableAppendTarget({ preOpenStat, postOpenStat: stat, filePath: options.filePath });
    if (
      options.maxFileBytes !== undefined &&
      stat.size + contentBuffer.byteLength > options.maxFileBytes
    ) {
      return;
    }
    try {
      fsSync.fchmodSync(fd, options.mode ?? 0o600);
    } catch {
      // Some root-owned network mounts reject descriptor chmod while allowing append.
    }
    fsSync.writeSync(fd, contentBuffer, 0, contentBuffer.byteLength);
  } finally {
    fsSync.closeSync(fd);
  }
}

/** 已存储的原始值是否“损坏”：存在，但无法 JSON 解析。undefined（从未存过）不算损坏。 */
export function isCorruptJson(raw: string | undefined): boolean {
  if (raw === undefined) return false;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

/** 存储中的数据存在但损坏、为避免覆盖而中止写入时抛出。 */
export class StorageUnreadableError extends Error {
  constructor() {
    super("Stored data is present but could not be read; the write was skipped to avoid overwriting it.");
    this.name = "StorageUnreadableError";
  }
}

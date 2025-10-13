/**
 * 暗号化ユーティリティ
 * Web Crypto API (AES-GCM 256bit) を使用してWebhook URLを暗号化
 */

/**
 * 暗号化キーを取得
 * Workers Secretsから ENCRYPTION_KEY を取得し、CryptoKeyに変換
 */
async function getEncryptionKey(keyString: string): Promise<CryptoKey> {
  // 32バイト（256bit）のキーをUint8Arrayに変換
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString.padEnd(32, "0").slice(0, 32));

  // AES-GCM用のCryptoKeyをインポート
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Webhook URLを暗号化
 * @param url - 暗号化するWebhook URL
 * @param keyString - 暗号化キー（Workers Secretsから取得）
 * @returns base64エンコードされた暗号化データ (IV + 暗号文)
 */
export async function encryptWebhookUrl(
  url: string,
  keyString: string,
): Promise<string> {
  try {
    // 1. 暗号化キーを取得
    const key = await getEncryptionKey(keyString);

    // 2. Initialization Vector (IV) をランダム生成 (12バイト)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 3. URLをUint8Arrayに変換
    const encoder = new TextEncoder();
    const data = encoder.encode(url);

    // 4. AES-GCM暗号化
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data,
    );

    // 5. IV + 暗号文を結合
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);

    // 6. base64エンコード
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("暗号化エラー:", error);
    throw new Error("Failed to encrypt webhook URL");
  }
}

/**
 * Webhook URLを復号化
 * @param encryptedData - base64エンコードされた暗号化データ
 * @param keyString - 復号化キー（Workers Secretsから取得）
 * @returns 復号化されたWebhook URL
 */
export async function decryptWebhookUrl(
  encryptedData: string,
  keyString: string,
): Promise<string> {
  try {
    // 1. 暗号化キーを取得
    const key = await getEncryptionKey(keyString);

    // 2. base64デコード
    const combined = Uint8Array.from(atob(encryptedData), (c) =>
      c.charCodeAt(0),
    );

    // 3. IV (最初の12バイト) と暗号文を分離
    const iv = combined.slice(0, 12);
    const encryptedArray = combined.slice(12);

    // 4. AES-GCM復号化
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedArray,
    );

    // 5. Uint8ArrayをStringに変換
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("復号化エラー:", error);
    throw new Error("Failed to decrypt webhook URL");
  }
}

/**
 * 暗号化キーが設定されているか確認
 */
export function hasEncryptionKey(env: { ENCRYPTION_KEY?: string }): boolean {
  return !!env.ENCRYPTION_KEY && env.ENCRYPTION_KEY.length >= 16;
}

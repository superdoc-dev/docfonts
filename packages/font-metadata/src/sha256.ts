/**
 * sha256 of font bytes, lowercase hex. This is the corpus JOIN KEY (FontFaceMetadata.fileSha256 and
 * the source/provenance record). Kept out of the synchronous parser on purpose: identity hashing is
 * the caller's concern, and Web Crypto is async. Uses globalThis.crypto.subtle, which exists in
 * browsers, Bun, and Node 20+ - so the package stays browser-safe and dependency-free.
 */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes as unknown as ArrayBuffer,
  );
  const view = new Uint8Array(digest);
  let hex = "";
  for (const b of view) hex += b.toString(16).padStart(2, "0");
  return hex;
}

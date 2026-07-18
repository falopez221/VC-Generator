const HEX_256 = /^[a-f0-9]{64}$/;

function notFound(): Response {
  return new Response("Not found.", {
    status: 404,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

function hexToBuffer(value: string): ArrayBuffer {
  const buffer = new ArrayBuffer(value.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return buffer;
}

function utf8Buffer(value: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(value);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return buffer;
}

function bytesToHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request): Promise<Response> {
  if (process.env.VERCEL === "1" ||
      process.env.VG_LOCAL_INSTALL_MODE !== "1" ||
      process.env.VG_LOCAL_BIND_ADDRESS !== "127.0.0.1") {
    return notFound();
  }
  const host = request.headers.get("host");
  const challenge = request.headers.get("x-vg-upstream-challenge");
  const secret = process.env.VG_LOCAL_UPSTREAM_SECRET;
  if (!host || !/^127[.]0[.]0[.]1:[0-9]{4,5}$/.test(host) ||
      !challenge || !HEX_256.test(challenge) || !secret || !HEX_256.test(secret)) {
    return notFound();
  }

  const key = await crypto.subtle.importKey(
    "raw",
    hexToBuffer(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const proof = await crypto.subtle.sign("HMAC", key, utf8Buffer(challenge));
  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-vg-upstream-proof": bytesToHex(proof),
    },
  });
}

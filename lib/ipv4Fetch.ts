import https from "node:https"
import dns from "node:dns"
import type { LookupFunction } from "node:net"

// On some networks the IPv6 route to Google stalls a large share of requests
// (measured ~30%) while IPv4 is reliable, and the OS resolver may hand Node
// only the IPv6 address, so plain fetch() never falls back. This sends the
// request over IPv4 and returns a standard Response. If the machine has no
// IPv4 route at all, it falls back to the regular fetch().
const NO_IPV4_CODES = new Set(["ENETUNREACH", "EHOSTUNREACH", "EADDRNOTAVAIL", "ENODATA", "EAI_ADDRFAMILY"])

// Query DNS directly for A records, falling back to the OS resolver; the OS
// resolver occasionally fails to return an IPv4 address on these networks.
const lookupIPv4: LookupFunction = (hostname, options, callback) => {
  const done = (address: string) =>
    options.all
      ? (callback as (e: null, a: dns.LookupAddress[]) => void)(null, [{ address, family: 4 }])
      : callback(null, address, 4)
  dns.resolve4(hostname, (err, addresses) => {
    if (!err && addresses.length) return done(addresses[0])
    dns.lookup(hostname, { family: 4 }, (lookupErr, address) => {
      if (lookupErr) return callback(lookupErr, "", 4)
      done(address)
    })
  })
}

export async function ipv4Fetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const body = init.body
  if (input instanceof Request || (body != null && typeof body !== "string" && !(body instanceof URLSearchParams))) {
    return fetch(input, init)
  }

  try {
    return await requestOverIPv4(new URL(input.toString()), init, body?.toString())
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code
    if (code && NO_IPV4_CODES.has(code)) return fetch(input, init)
    throw e
  }
}

function requestOverIPv4(url: URL, init: RequestInit, body: string | undefined): Promise<Response> {
  const headers = Object.fromEntries(new Headers(init.headers).entries())
  if (body !== undefined) headers["content-length"] = String(Buffer.byteLength(body))

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: init.method ?? "GET", headers, family: 4, lookup: lookupIPv4 }, (res) => {
      const chunks: Buffer[] = []
      res.on("data", (chunk: Buffer) => chunks.push(chunk))
      res.on("error", reject)
      res.on("end", () => {
        const responseHeaders = new Headers()
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) value.forEach((v) => responseHeaders.append(key, v))
          else if (value !== undefined) responseHeaders.set(key, value)
        }
        const status = res.statusCode ?? 500
        const nullBody = [101, 204, 205, 304].includes(status)
        resolve(
          new Response(nullBody ? null : new Uint8Array(Buffer.concat(chunks)), {
            status,
            statusText: res.statusMessage,
            headers: responseHeaders,
          })
        )
      })
    })
    req.setTimeout(15000, () => req.destroy(new Error(`Request to ${url.host} timed out`)))
    req.on("error", reject)
    if (init.signal) {
      if (init.signal.aborted) req.destroy(init.signal.reason)
      init.signal.addEventListener("abort", () => req.destroy(init.signal!.reason), { once: true })
    }
    req.end(body)
  })
}

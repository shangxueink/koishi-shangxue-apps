import { Context, sleep } from "koishi";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { connect as netConnect, type Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";
import { URL } from "node:url";

export interface FetchConfig {
  useProxy: boolean;
  proxyUrl: string;
  maxRetries: number;
}

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreaker {
  state: CircuitState;
  failureCount: number;
  openedAt: number;
}

const circuitBreakers = new Map<string, CircuitBreaker>();
const FAILURE_THRESHOLD = 3;
const RECOVERY_TIMEOUT_MS = 60_000;

function getBreaker(host: string): CircuitBreaker {
  let breaker = circuitBreakers.get(host);
  if (!breaker) {
    breaker = { state: "CLOSED", failureCount: 0, openedAt: 0 };
    circuitBreakers.set(host, breaker);
  }
  return breaker;
}

function recordSuccess(host: string): void {
  const breaker = getBreaker(host);
  breaker.state = "CLOSED";
  breaker.failureCount = 0;
}

function recordFailure(host: string): void {
  const breaker = getBreaker(host);
  breaker.failureCount++;
  if (breaker.failureCount >= FAILURE_THRESHOLD) {
    breaker.state = "OPEN";
    breaker.openedAt = Date.now();
  }
}

function isAllowed(host: string): boolean {
  const breaker = getBreaker(host);
  if (breaker.state === "CLOSED") return true;
  if (breaker.state === "OPEN") {
    if (Date.now() - breaker.openedAt >= RECOVERY_TIMEOUT_MS) {
      breaker.state = "HALF_OPEN";
      return true;
    }
    return false;
  }
  return true;
}

export async function fetchWithProxy(
  _ctx: Context,
  url: string,
  options: RequestInit = {},
  config: FetchConfig,
): Promise<Response> {
  const { useProxy, proxyUrl, maxRetries } = config;
  const host = getTargetHost(url);

  if (!isAllowed(host)) {
    throw new Error(`请求 ${host} 当前处于熔断状态，请稍后再试`);
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = useProxy && proxyUrl
        ? await fetchViaProxy(url, proxyUrl, options)
        : await fetch(url, options);

      if (!response.ok && attempt < maxRetries) {
        continue;
      }

      recordSuccess(host);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  recordFailure(host);
  throw lastError || new Error(`请求失败: ${url}`);
}

function getTargetHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

async function fetchViaProxy(
  targetUrl: string,
  proxyUrl: string,
  options: RequestInit = {},
): Promise<Response> {
  const target = new URL(targetUrl);
  const proxy = new URL(proxyUrl);
  const protocol = proxy.protocol.toLowerCase();

  if (protocol === "socks:" || protocol === "socks5:" || protocol === "socks5h:") {
    return fetchViaSocks(target, proxy, options);
  }
  if (protocol !== "http:" && protocol !== "https:") {
    throw new Error(`不支持的代理协议: ${proxy.protocol}`);
  }
  return fetchViaHttpProxy(target, targetUrl, proxy, options);
}

function fetchViaHttpProxy(
  target: URL,
  targetUrl: string,
  proxy: URL,
  options: RequestInit,
): Promise<Response> {
  const headers = getHeaders(options);
  if (!hasHeader(headers, "host")) headers.Host = target.host;
  addProxyAuthorization(headers, proxy);

  const requestOptions = {
    hostname: proxy.hostname,
    port: getPort(proxy, proxy.protocol === "https:" ? 443 : 80),
    method: options.method || "GET",
    path: targetUrl,
    headers,
  };

  return new Promise((resolve, reject) => {
    const request = proxy.protocol === "https:"
      ? httpsRequest(requestOptions, (response) => consumeResponse(response, resolve, reject))
      : httpRequest(requestOptions, (response) => consumeResponse(response, resolve, reject));
    request.on("error", reject);
    writeRequestBody(request, options.body);
  });
}

async function fetchViaSocks(
  target: URL,
  proxy: URL,
  options: RequestInit,
): Promise<Response> {
  const proxyPort = getPort(proxy, 1080);
  const targetPort = getPort(target, target.protocol === "https:" ? 443 : 80);
  const socket = await openSocks5Tunnel(
    proxy.hostname,
    proxyPort,
    target.hostname,
    targetPort,
    getProxyCredentials(proxy),
  );

  if (target.protocol === "https:") {
    const secureSocket = await openTlsSocket(socket, target.hostname);
    return requestThroughHttps(target, secureSocket, options);
  }
  if (target.protocol !== "http:") {
    socket.destroy();
    throw new Error(`不支持的目标协议: ${target.protocol}`);
  }
  return requestThroughHttp(target, socket, options);
}

async function openSocks5Tunnel(
  proxyHost: string,
  proxyPort: number,
  targetHost: string,
  targetPort: number,
  credentials?: { username: string; password: string },
): Promise<Socket> {
  const socket = await connectSocket(proxyHost, proxyPort);
  try {
    const methods = credentials ? [0x00, 0x02] : [0x00];
    socket.write(Buffer.from([0x05, methods.length, ...methods]));
    const methodReply = await readBytes(socket, 2);
    if (methodReply[0] !== 0x05 || methodReply[1] === 0xff) {
      throw new Error("SOCKS5 代理不接受当前认证方式");
    }

    if (methodReply[1] === 0x02) {
      if (!credentials) throw new Error("SOCKS5 代理要求用户名密码");
      const username = Buffer.from(credentials.username);
      const password = Buffer.from(credentials.password);
      if (username.length > 255 || password.length > 255) {
        throw new Error("SOCKS5 用户名或密码过长");
      }
      socket.write(Buffer.concat([
        Buffer.from([0x01, username.length]),
        username,
        Buffer.from([password.length]),
        password,
      ]));
      const authReply = await readBytes(socket, 2);
      if (authReply[1] !== 0x00) throw new Error("SOCKS5 用户名密码认证失败");
    }

    const host = Buffer.from(targetHost);
    if (host.length > 255) throw new Error("目标域名过长");
    socket.write(Buffer.concat([
      Buffer.from([0x05, 0x01, 0x00, 0x03, host.length]),
      host,
      Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff]),
    ]));

    const reply = await readBytes(socket, 4);
    if (reply[0] !== 0x05 || reply[1] !== 0x00) {
      throw new Error(`SOCKS5 连接目标失败，状态码: ${reply[1]}`);
    }
    await readSocksAddress(socket, reply[3]);
    return socket;
  } catch (error) {
    socket.destroy();
    throw error;
  }
}

function connectSocket(host: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = netConnect({ host, port });
    const onConnect = () => {
      socket.removeListener("error", onError);
      resolve(socket);
    };
    const onError = (error: Error) => {
      socket.removeListener("connect", onConnect);
      socket.destroy();
      reject(error);
    };
    socket.once("connect", onConnect);
    socket.once("error", onError);
  });
}

function readBytes(socket: Socket, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let received = Buffer.alloc(0);
    const onData = (chunk: Buffer) => {
      received = Buffer.concat([received, chunk]);
      if (received.length < length) return;
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      socket.removeListener("close", onClose);
      const result = received.subarray(0, length);
      const remaining = received.subarray(length);
      if (remaining.length) socket.unshift(remaining);
      resolve(result);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => {
      cleanup();
      reject(new Error("SOCKS5 代理连接意外关闭"));
    };
    const cleanup = () => {
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      socket.removeListener("close", onClose);
    };
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });
}

async function readSocksAddress(socket: Socket, addressType: number): Promise<void> {
  if (addressType === 0x01) {
    await readBytes(socket, 4);
  } else if (addressType === 0x03) {
    const length = (await readBytes(socket, 1))[0];
    await readBytes(socket, length);
  } else if (addressType === 0x04) {
    await readBytes(socket, 16);
  } else {
    throw new Error("SOCKS5 返回了未知地址类型");
  }
  await readBytes(socket, 2);
}

function openTlsSocket(socket: Socket, servername: string): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const secureSocket = tlsConnect({ socket, servername });
    const onSecureConnect = () => {
      cleanup();
      resolve(secureSocket);
    };
    const onError = (error: Error) => {
      cleanup();
      secureSocket.destroy();
      reject(error);
    };
    const cleanup = () => {
      secureSocket.removeListener("secureConnect", onSecureConnect);
      secureSocket.removeListener("error", onError);
    };
    secureSocket.once("secureConnect", onSecureConnect);
    secureSocket.once("error", onError);
  });
}

function requestThroughHttp(
  target: URL,
  socket: Socket,
  options: RequestInit,
): Promise<Response> {
  const headers = getTargetHeaders(target, options);
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: target.hostname,
      port: getPort(target, 80),
      method: options.method || "GET",
      path: getTargetPath(target),
      headers,
      agent: false,
      createConnection: () => socket,
    }, (response) => consumeResponse(response, resolve, reject, socket));
    request.on("error", (error) => {
      socket.destroy();
      reject(error);
    });
    writeRequestBody(request, options.body);
  });
}

function requestThroughHttps(
  target: URL,
  socket: TLSSocket,
  options: RequestInit,
): Promise<Response> {
  const headers = getTargetHeaders(target, options);
  return new Promise((resolve, reject) => {
    const request = httpsRequest({
      hostname: target.hostname,
      port: getPort(target, 443),
      method: options.method || "GET",
      path: getTargetPath(target),
      headers,
      agent: false,
      createConnection: () => socket,
    }, (response) => consumeResponse(response, resolve, reject, socket));
    request.on("error", (error) => {
      socket.destroy();
      reject(error);
    });
    writeRequestBody(request, options.body);
  });
}

function consumeResponse(
  response: import("node:http").IncomingMessage,
  resolve: (response: Response) => void,
  reject: (error: Error) => void,
  socket?: Socket,
): void {
  const chunks: Buffer[] = [];
  response.on("data", (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
  response.on("end", () => {
    socket?.destroy();
    const headers = new Headers();
    for (const [name, value] of Object.entries(response.headers)) {
      if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }
    resolve(new Response(Buffer.concat(chunks), {
      status: response.statusCode || 500,
      statusText: response.statusMessage || "",
      headers,
    }));
  });
  response.on("error", (error) => {
    socket?.destroy();
    reject(error);
  });
}

function getTargetHeaders(target: URL, options: RequestInit): Record<string, string> {
  const headers = getHeaders(options);
  if (!hasHeader(headers, "host")) headers.Host = target.host;
  if (!hasHeader(headers, "connection")) headers.Connection = "close";
  return headers;
}

function getHeaders(options: RequestInit): Record<string, string> {
  const result: Record<string, string> = {};
  const headers = options.headers;
  if (!headers) return result;
  if (headers instanceof Headers) {
    headers.forEach((value, key) => { result[key] = value; });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) result[key] = value;
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined) result[key] = Array.isArray(value) ? value.join(", ") : value;
    }
  }
  return result;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name);
}

function addProxyAuthorization(headers: Record<string, string>, proxy: URL): void {
  if (!proxy.username || hasHeader(headers, "proxy-authorization")) return;
  const username = decodeURIComponent(proxy.username);
  const password = decodeURIComponent(proxy.password);
  headers["Proxy-Authorization"] = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function getProxyCredentials(proxy: URL): { username: string; password: string } | undefined {
  if (!proxy.username) return undefined;
  return {
    username: decodeURIComponent(proxy.username),
    password: decodeURIComponent(proxy.password),
  };
}

function getPort(url: URL, defaultPort: number): number {
  const port = Number(url.port || defaultPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`端口无效: ${url.port}`);
  }
  return port;
}

function getTargetPath(target: URL): string {
  return `${target.pathname || "/"}${target.search}`;
}

function writeRequestBody(
  request: import("node:http").ClientRequest,
  body: BodyInit | null | undefined,
): void {
  if (body === undefined || body === null) {
    request.end();
  } else if (typeof body === "string" || Buffer.isBuffer(body) || body instanceof Uint8Array) {
    request.end(body);
  } else if (body instanceof ArrayBuffer) {
    request.end(Buffer.from(body));
  } else if (body instanceof URLSearchParams) {
    request.end(body.toString());
  } else {
    request.end();
  }
}

export async function fetchJson<T = unknown>(
  ctx: Context,
  url: string,
  config: FetchConfig,
): Promise<T> {
  const response = await fetchWithProxy(ctx, url, {}, config);
  return response.json() as Promise<T>;
}

export async function fetchArrayBuffer(
  ctx: Context,
  url: string,
  config: FetchConfig,
): Promise<ArrayBuffer> {
  const response = await fetchWithProxy(ctx, url, {}, config);
  return response.arrayBuffer();
}


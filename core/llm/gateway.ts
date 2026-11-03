/**
 * LLM Gateway: quota-aware, multi-provider router for every LLM call in the app.
 *
 * Design goals
 *  - One process-wide view of provider quota (all agents + sketch service share it).
 *  - Proactive throttling: read rate-limit headers after every success and skip a
 *    route BEFORE it would return 429, instead of discovering limits by failing.
 *  - Reactive cooldowns: on 429 compute the exact reset time from headers/body and
 *    park the route (or the whole provider for account-wide caps) until then.
 *  - Circuit breaker for 5xx / timeouts / network errors with exponential backoff.
 *  - Bounded: per-call timeout, bounded concurrency, bounded attempts per call.
 *  - Response cache for identical prompts (0 tokens on repeats).
 *  - When nothing is available, throw LLMCapacityError carrying `retryAt` so the
 *    API can return 503 + Retry-After and the UI can show "come back at HH:MM".
 */

import crypto from "node:crypto";
import type { BaseLLMProvider, ChatMessage, StructuredCompletionOptions } from "./types";

export type ProviderId = "groq" | "openrouter";

export interface LLMRoute {
  id: string; // `${provider}:${model}`
  provider: ProviderId;
  model: string;
  baseUrl: string;
  apiKey: string;
  extraHeaders?: Record<string, string>;
}

interface RouteState {
  cooldownUntil: number;
  cooldownReason: string | null;
  consecutiveFailures: number;
  successes: number;
  failures: number;
  remainingTokens: number | null;
  remainingRequests: number | null;
  lastError: string | null;
  lastUsedAt: number | null;
}

export interface GatewayCallOptions {
  maxTokens?: number;
  temperature?: number;
  /** Strict JSON schema (OpenAI response_format json_schema). Falls back to json_object. */
  jsonSchema?: Record<string, any>;
  /** Free-form label for logs/status, e.g. "teacher". */
  purpose?: string;
  /** Disable response cache for this call. */
  noCache?: boolean;
}

export class LLMCapacityError extends Error {
  readonly code = "LLM_CAPACITY";
  readonly retryAt: number;
  readonly attempts: Array<{ route: string; reason: string }>;

  constructor(retryAt: number, attempts: Array<{ route: string; reason: string }> = []) {
    const secs = Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
    super(`All LLM providers are rate-limited or unavailable. Retry in ~${secs}s.`);
    this.name = "LLMCapacityError";
    this.retryAt = retryAt;
    this.attempts = attempts;
  }

  get retryAfterSeconds(): number {
    return Math.max(1, Math.ceil((this.retryAt - Date.now()) / 1000));
  }
}

export function isCapacityError(err: unknown): err is LLMCapacityError {
  return err instanceof LLMCapacityError || (err as any)?.code === "LLM_CAPACITY";
}

/** Parses Groq-style durations: "7.66s", "2m59.56s", "52.5ms", "1h2m3s". Returns ms or null. */
export function parseDurationMs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s) * 1000); // bare seconds
  const re = /(\d+(?:\.\d+)?)(ms|h|m|s)/g;
  let total = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    matched = true;
    const v = parseFloat(m[1]);
    total += m[2] === "ms" ? v : m[2] === "s" ? v * 1000 : m[2] === "m" ? v * 60_000 : v * 3_600_000;
  }
  return matched ? Math.round(total) : null;
}

/** Computes when a rate-limited route becomes usable again, from headers and error body. */
export function computeRetryAt(headers: Headers, bodyText: string, now: number): number | null {
  const candidates: number[] = [];

  const retryAfter = headers.get("retry-after");
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) candidates.push(now + secs * 1000);
    else {
      const date = Date.parse(retryAfter);
      if (!Number.isNaN(date)) candidates.push(date);
    }
  }

  // Groq: duration until the exhausted bucket refills
  for (const h of ["x-ratelimit-reset-tokens", "x-ratelimit-reset-requests"]) {
    const ms = parseDurationMs(headers.get(h));
    if (ms != null) candidates.push(now + ms);
  }

  // OpenRouter: epoch milliseconds (header or nested in error metadata)
  const epochFrom = (v: unknown) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n < 1e12 ? n * 1000 : n; // accept epoch seconds or ms
  };
  const orHeader = epochFrom(headers.get("x-ratelimit-reset"));
  if (orHeader) candidates.push(orHeader);
  try {
    const body = JSON.parse(bodyText);
    const meta = body?.error?.metadata?.headers;
    const nested = epochFrom(meta?.["X-RateLimit-Reset"] ?? meta?.["x-ratelimit-reset"]);
    if (nested) candidates.push(nested);
  } catch {
    // body not JSON
  }

  // Body text: "Please try again in 7.4925s" / "in 2m3.5s"
  const textMatch = bodyText.match(/try again in\s+([\d.hms]+)/i);
  const textMs = parseDurationMs(textMatch?.[1]);
  if (textMs != null) candidates.push(now + textMs);

  const future = candidates.filter((t) => t > now);
  // The most conservative (latest) signal is the one that is actually true.
  return future.length ? Math.max(...future) : null;
}

function estimateTokens(messages: Array<{ content: string }>, maxTokens: number): number {
  const chars = messages.reduce((n, m) => n + (m.content?.length || 0), 0);
  return Math.ceil(chars / 4) + maxTokens;
}

function stripFences(raw: string): string {
  if (!raw) return "{}";
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // Extract JSON object if present
  const firstObj = s.indexOf("{");
  const lastObj = s.lastIndexOf("}");
  if (firstObj !== -1 && lastObj > firstObj) {
    s = s.slice(firstObj, lastObj + 1);
  } else {
    // Check for JSON array
    const firstArr = s.indexOf("[");
    const lastArr = s.lastIndexOf("]");
    if (firstArr !== -1 && lastArr > firstArr) {
      s = s.slice(firstArr, lastArr + 1);
    }
  }

  // Strip trailing commas before closing braces/brackets
  s = s.replace(/,\s*([}\]])/g, "$1");
  return s;
}

class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];
  private readonly max: number;
  constructor(max: number) {
    this.max = Math.max(1, max);
  }
  async acquire(): Promise<() => void> {
    if (this.active >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active += 1;
    return () => {
      this.active -= 1;
      this.queue.shift()?.();
    };
  }
  get pending() {
    return this.queue.length;
  }
}

export interface GatewayConfig {
  routes: LLMRoute[];
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  maxConcurrency?: number;
  cacheTtlMs?: number;
  cacheMax?: number;
  /** Skip a route proactively when its remaining-token budget is below this. */
  minTokenHeadroom?: number;
  logger?: Pick<Console, "warn" | "info">;
}

type AttemptOutcome =
  | { ok: true; text: string }
  | { ok: false; reason: string; retryAt?: number; scope?: "route" | "provider" | "none" };

export class LLMGateway implements BaseLLMProvider {
  name = "gateway";
  readonly routes: LLMRoute[];
  private state = new Map<string, RouteState>();
  private providerCooldown = new Map<ProviderId, { until: number; reason: string }>();
  private cache = new Map<string, { value: string; expires: number }>();
  private inFlight = new Map<string, Promise<string>>();
  private semaphore: Semaphore;
  private fetchImpl: typeof fetch;
  private now: () => number;
  private timeoutMs: number;
  private cacheTtlMs: number;
  private cacheMax: number;
  private minTokenHeadroom: number;
  private logger: Pick<Console, "warn" | "info">;
  private stats = { calls: 0, cacheHits: 0, capacityErrors: 0 };

  constructor(config: GatewayConfig) {
    this.routes = config.routes;
    this.fetchImpl = config.fetchImpl || ((...args) => fetch(...args));
    this.now = config.now || Date.now;
    this.timeoutMs = config.timeoutMs ?? 25_000;
    this.semaphore = new Semaphore(config.maxConcurrency ?? 4);
    this.cacheTtlMs = config.cacheTtlMs ?? 10 * 60_000;
    this.cacheMax = config.cacheMax ?? 500;
    this.minTokenHeadroom = config.minTokenHeadroom ?? 1500;
    this.logger = config.logger || console;
    for (const r of this.routes) this.state.set(r.id, this.freshState());
  }

  private freshState(): RouteState {
    return {
      cooldownUntil: 0,
      cooldownReason: null,
      consecutiveFailures: 0,
      successes: 0,
      failures: 0,
      remainingTokens: null,
      remainingRequests: null,
      lastError: null,
      lastUsedAt: null,
    };
  }

  /** Earliest time any route becomes usable (now if one already is). */
  nextAvailableAt(): number {
    const now = this.now();
    let best = Infinity;
    for (const r of this.routes) {
      const t = this.blockedUntil(r);
      if (t <= now) return now;
      best = Math.min(best, t);
    }
    return best === Infinity ? now + 60_000 : best;
  }

  private blockedUntil(route: LLMRoute): number {
    const s = this.state.get(route.id)!;
    const p = this.providerCooldown.get(route.provider);
    return Math.max(s.cooldownUntil, p?.until ?? 0);
  }

  private setCooldown(route: LLMRoute, until: number, reason: string, scope: "route" | "provider") {
    if (scope === "provider") {
      const cur = this.providerCooldown.get(route.provider);
      if (!cur || cur.until < until) this.providerCooldown.set(route.provider, { until, reason });
    } else {
      const s = this.state.get(route.id)!;
      if (s.cooldownUntil < until) {
        s.cooldownUntil = until;
        s.cooldownReason = reason;
      }
    }
    const secs = Math.ceil((until - this.now()) / 1000);
    this.logger.warn(`[LLMGateway] ${scope === "provider" ? route.provider : route.id} cooling down ${secs}s: ${reason}`);
  }

  async complete(messages: ChatMessage[], systemPrompt?: string, opts: GatewayCallOptions = {}): Promise<string> {
    return this.run(messages, systemPrompt, opts, null);
  }

  async completeStructured<T>(
    messages: ChatMessage[],
    options: StructuredCompletionOptions<T> & { jsonSchema?: Record<string, any>; purpose?: string }
  ): Promise<T> {
    const system = `${options.systemPrompt || ""}\n\nRespond with ONLY one valid JSON object${
      options.schemaName ? ` matching the ${options.schemaName} schema` : ""
    }. No markdown, no code fences, no commentary.`;
    const raw = await this.run(
      messages,
      system,
      {
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        jsonSchema: options.jsonSchema,
        purpose: options.purpose || options.schemaName,
      },
      (text) => options.schema.parse(JSON.parse(stripFences(text)))
    );
    try {
      return options.schema.parse(JSON.parse(stripFences(raw)));
    } catch (err) {
      const key = this.cacheKey(messages, system, {
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        jsonSchema: options.jsonSchema,
      });
      this.cache.delete(key);
      throw err;
    }
  }

  private cacheKey(messages: ChatMessage[], system: string | undefined, opts: GatewayCallOptions): string {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify({ messages, system, t: opts.temperature, m: opts.maxTokens, s: !!opts.jsonSchema }))
      .digest("hex");
  }

  private async run(
    messages: ChatMessage[],
    systemPrompt: string | undefined,
    opts: GatewayCallOptions,
    validate: ((text: string) => unknown) | null
  ): Promise<string> {
    this.stats.calls += 1;
    if (this.routes.length === 0) {
      throw new Error("LLMGateway has no configured routes. Set GROQ_API_KEY and/or OPENROUTER_API_KEY in .env");
    }

    const key = this.cacheKey(messages, systemPrompt, opts);
    if (!opts.noCache) {
      const hit = this.cache.get(key);
      if (hit && hit.expires > this.now()) {
        this.stats.cacheHits += 1;
        return hit.value;
      }
      const pending = this.inFlight.get(key);
      if (pending) return pending;
    }

    const task = this.dispatch(messages, systemPrompt, opts, validate);
    if (!opts.noCache) this.inFlight.set(key, task);
    try {
      const text = await task;
      if (!opts.noCache) {
        if (this.cache.size >= this.cacheMax) this.cache.delete(this.cache.keys().next().value as string);
        this.cache.set(key, { value: text, expires: this.now() + this.cacheTtlMs });
      }
      return text;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async dispatch(
    messages: ChatMessage[],
    systemPrompt: string | undefined,
    opts: GatewayCallOptions,
    validate: ((text: string) => unknown) | null
  ): Promise<string> {
    const formatted = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];
    const maxTokens = opts.maxTokens ?? 800;
    const estimate = estimateTokens(formatted, maxTokens);
    const attempts: Array<{ route: string; reason: string }> = [];

    const release = await this.semaphore.acquire();
    try {
      for (const route of this.routes) {
        const now = this.now();
        const blocked = this.blockedUntil(route);
        if (blocked > now) {
          attempts.push({ route: route.id, reason: "cooling down" });
          continue;
        }
        const s = this.state.get(route.id)!;
        // Proactive skip: known remaining budget would not fit this request.
        if (s.remainingTokens != null && s.remainingTokens < Math.min(estimate, this.minTokenHeadroom)) {
          attempts.push({ route: route.id, reason: `token headroom ${s.remainingTokens} < ${estimate}` });
          continue;
        }
        if (s.remainingRequests === 0) {
          attempts.push({ route: route.id, reason: "request budget exhausted" });
          continue;
        }

        const outcome = await this.attempt(route, formatted, opts, maxTokens, validate);
        if (outcome.ok) return outcome.text;
        attempts.push({ route: route.id, reason: outcome.reason });
      }
    } finally {
      release();
    }

    this.stats.capacityErrors += 1;
    throw new LLMCapacityError(this.nextAvailableAt(), attempts);
  }

  private async attempt(
    route: LLMRoute,
    formatted: Array<{ role: string; content: string }>,
    opts: GatewayCallOptions,
    maxTokens: number,
    validate: ((text: string) => unknown) | null
  ): Promise<AttemptOutcome> {
    const s = this.state.get(route.id)!;
    const useSchema = !!opts.jsonSchema;
    const body: Record<string, any> = {
      model: route.model,
      messages: formatted,
      temperature: opts.temperature ?? 0.3,
      max_tokens: maxTokens,
    };
    if (validate) {
      body.response_format = useSchema ? opts.jsonSchema : { type: "json_object" };
    }
    if (route.provider === "groq" && route.model.startsWith("openai/gpt-oss")) {
      body.reasoning_effort = "low"; // hidden reasoning tokens count against TPM
    }

    let res: Response;
    try {
      res = await this.fetchImpl(`${route.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${route.apiKey}`,
          ...(route.extraHeaders || {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: any) {
      const reason = err?.name === "TimeoutError" || err?.name === "AbortError" ? "timeout" : `network: ${err?.message}`;
      return this.recordFailure(route, reason);
    }

    s.lastUsedAt = this.now();
    this.absorbRateHeaders(route, res.headers);

    if (res.ok) {
      let text = "";
      try {
        const data: any = await res.json();
        const msg = data?.choices?.[0]?.message;
        text = msg?.content ?? "";
        if (!text.trim() && msg?.reasoning) {
          text = msg.reasoning;
        }
      } catch {
        return this.recordFailure(route, "malformed provider response");
      }
      if (!text.trim()) return this.recordSoftFailure(route, "empty completion");
      if (validate) {
        try {
          validate(text);
        } catch (e: any) {
          return this.recordSoftFailure(route, `invalid structured output: ${String(e?.message).slice(0, 120)}`);
        }
      }
      s.successes += 1;
      s.consecutiveFailures = 0;
      s.lastError = null;
      return { ok: true, text };
    }

    const bodyText = await res.text().catch(() => "");
    const now = this.now();

    if (res.status === 429) {
      const retryAt = computeRetryAt(res.headers, bodyText, now) ?? now + 30_000;
      const lower = bodyText.toLowerCase();
      // OpenRouter free-tier daily cap and credit caps are account-wide.
      const accountWide =
        route.provider === "openrouter" && /per-day|per day|daily|credits/.test(lower) && !/upstream/.test(lower);
      this.setCooldown(route, retryAt, `429 ${accountWide ? "account daily cap" : "rate limit"}`, accountWide ? "provider" : "route");
      s.failures += 1;
      s.lastError = `429: ${bodyText.slice(0, 160)}`;
      return { ok: false, reason: "rate limited", retryAt, scope: accountWide ? "provider" : "route" };
    }

    if (res.status === 401 || res.status === 403) {
      this.setCooldown(route, now + 10 * 60_000, `auth error ${res.status} (check API key)`, "provider");
      s.lastError = `${res.status}: ${bodyText.slice(0, 160)}`;
      return { ok: false, reason: `auth ${res.status}` };
    }

    if (res.status === 402) {
      this.setCooldown(route, now + 60 * 60_000, "402 insufficient credits", "provider");
      s.lastError = `402: ${bodyText.slice(0, 160)}`;
      return { ok: false, reason: "insufficient credits" };
    }

    if (res.status === 404) {
      this.setCooldown(route, now + 60 * 60_000, "404 model not found", "route");
      s.lastError = `404: ${bodyText.slice(0, 160)}`;
      return { ok: false, reason: "model not found" };
    }

    if (res.status === 400 && useSchema && /json_validate_failed|response_format|json_schema/i.test(bodyText)) {
      // Model could not satisfy the strict schema: retry once on the same route with json_object mode.
      return this.attempt(route, formatted, { ...opts, jsonSchema: undefined }, maxTokens, validate);
    }

    if (res.status >= 500 || res.status === 408) {
      return this.recordFailure(route, `upstream ${res.status}`);
    }

    // Other 4xx: request-specific; do not penalise the route.
    s.failures += 1;
    s.lastError = `${res.status}: ${bodyText.slice(0, 160)}`;
    return { ok: false, reason: `http ${res.status}` };
  }

  /** Hard failure (5xx, timeout, network): exponential circuit-breaker cooldown. */
  private recordFailure(route: LLMRoute, reason: string): AttemptOutcome {
    const s = this.state.get(route.id)!;
    s.failures += 1;
    s.consecutiveFailures += 1;
    s.lastError = reason;
    if (s.consecutiveFailures >= 2) {
      const backoff = Math.min(120_000, 2000 * 2 ** (s.consecutiveFailures - 1));
      this.setCooldown(route, this.now() + backoff, `circuit open after ${s.consecutiveFailures} failures (${reason})`, "route");
    }
    return { ok: false, reason };
  }

  /** Soft failure (bad JSON/empty): try another route, no cooldown. */
  private recordSoftFailure(route: LLMRoute, reason: string): AttemptOutcome {
    const s = this.state.get(route.id)!;
    s.failures += 1;
    s.lastError = reason;
    return { ok: false, reason, scope: "none" };
  }

  private absorbRateHeaders(route: LLMRoute, headers: Headers) {
    const s = this.state.get(route.id)!;
    const now = this.now();
    const remTok = headers.get("x-ratelimit-remaining-tokens");
    const remReq = headers.get("x-ratelimit-remaining-requests") ?? headers.get("x-ratelimit-remaining");
    if (remTok != null && Number.isFinite(Number(remTok))) s.remainingTokens = Number(remTok);
    if (remReq != null && Number.isFinite(Number(remReq))) s.remainingRequests = Number(remReq);

    // Budgets refill: when nearly exhausted, park the route until the published reset.
    if (s.remainingTokens != null && s.remainingTokens < this.minTokenHeadroom) {
      const ms = parseDurationMs(headers.get("x-ratelimit-reset-tokens"));
      if (ms != null) {
        this.setCooldown(route, now + ms, `proactive: only ${s.remainingTokens} tokens left in window`, "route");
        s.remainingTokens = null;
      }
    }
    if (s.remainingRequests === 0) {
      const ms = parseDurationMs(headers.get("x-ratelimit-reset-requests"));
      const epoch = Number(headers.get("x-ratelimit-reset"));
      const until = ms != null ? now + ms : Number.isFinite(epoch) && epoch > 0 ? (epoch < 1e12 ? epoch * 1000 : epoch) : null;
      if (until) {
        this.setCooldown(route, until, "proactive: request budget exhausted", "route");
        s.remainingRequests = null;
      }
    }
  }

  getStatus() {
    const now = this.now();
    const next = this.nextAvailableAt();
    return {
      available: next <= now,
      nextAvailableAt: new Date(next).toISOString(),
      retryAfterSeconds: next <= now ? 0 : Math.ceil((next - now) / 1000),
      stats: { ...this.stats, cacheSize: this.cache.size, queued: this.semaphore.pending },
      providers: Object.fromEntries(
        [...this.providerCooldown.entries()].map(([p, c]) => [
          p,
          { coolingDown: c.until > now, until: new Date(c.until).toISOString(), reason: c.reason },
        ])
      ),
      routes: this.routes.map((r) => {
        const s = this.state.get(r.id)!;
        const until = this.blockedUntil(r);
        return {
          id: r.id,
          provider: r.provider,
          model: r.model,
          available: until <= now,
          availableAt: until > now ? new Date(until).toISOString() : null,
          reason: until > now ? s.cooldownReason || this.providerCooldown.get(r.provider)?.reason || null : null,
          remainingTokens: s.remainingTokens,
          remainingRequests: s.remainingRequests,
          successes: s.successes,
          failures: s.failures,
          lastError: s.lastError,
        };
      }),
    };
  }
}

// ---------- Environment wiring ----------

const DEFAULT_GROQ_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"];
const DEFAULT_OPENROUTER_MODELS = [
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3.5-lightning:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "xingchen-agi/xing4.0-29b-a4b:free",
];

function csv(v: string | undefined): string[] {
  return (v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function buildRoutesFromEnv(env: NodeJS.ProcessEnv = process.env): LLMRoute[] {
  const routes: LLMRoute[] = [];
  const groqKey = env.GROQ_API_KEY?.trim();
  if (groqKey) {
    const models = [...new Set([...csv(env.GROQ_MODELS), ...csv(env.GROQ_MODEL), ...(env.GROQ_MODELS ? [] : DEFAULT_GROQ_MODELS)])];
    for (const model of models) {
      routes.push({
        id: `groq:${model}`,
        provider: "groq",
        model,
        baseUrl: env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
        apiKey: groqKey,
      });
    }
  }
  const orKey = (env.OPENROUTER_API_KEY || env.OPEN_ROUTER_API_KEY)?.trim();
  if (orKey) {
    const customModels = [...csv(env.OPENROUTER_MODELS), ...csv(env.OPENROUTER_MODEL), ...csv(env.OPEN_ROUTER_MODEL)];
    const models = customModels.length ? [...new Set(customModels)] : DEFAULT_OPENROUTER_MODELS;
    for (const model of models) {
      routes.push({
        id: `openrouter:${model}`,
        provider: "openrouter",
        model,
        baseUrl: env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        apiKey: orKey,
        extraHeaders: {
          "HTTP-Referer": env.APP_URL || "http://localhost:3000",
          "X-Title": "Socratic Tutor",
        },
      });
    }
  }
  // Optional explicit priority: LLM_PROVIDER_ORDER=openrouter,groq
  const order = csv(env.LLM_PROVIDER_ORDER) as ProviderId[];
  if (order.length) {
    routes.sort((a, b) => {
      const ia = order.indexOf(a.provider);
      const ib = order.indexOf(b.provider);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }
  return routes;
}

const GLOBAL_KEY = Symbol.for("socratic.llmGateway");

/** Process-wide singleton (survives Next.js dev hot reloads so quota state is not lost). */
export function getLLMGateway(): LLMGateway {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new LLMGateway({
      routes: buildRoutesFromEnv(),
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 25_000,
      maxConcurrency: Number(process.env.LLM_MAX_CONCURRENCY) || 4,
    });
  }
  return g[GLOBAL_KEY];
}

export function hasConfiguredRoutes(env: NodeJS.ProcessEnv = process.env): boolean {
  return buildRoutesFromEnv(env).length > 0;
}

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/tenant-context";
import { FlaskConical, Play, X, ChevronDown, ChevronUp } from "lucide-react";

type RunMode = "parallel" | "sequential";

interface RequestResult {
  type: "api" | "payment";
  index: number;
  status: number;
  ok: boolean;
  durationMs: number;
  error?: string;
  retryAfter?: number;
}

interface BriefResults {
  api: { ok: number; rateLimited: number; error: number };
  payment: { ok: number; rateLimited: number; error: number };
  totalMs: number;
  details: RequestResult[];
}

const apiBase = () =>
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "";

function getTenantHeader(tenantSlug: string | undefined): Record<string, string> {
  const slug = tenantSlug || "bank1";
  return { "Content-Type": "application/json", "X-Tenant-ID": slug };
}

export function TestSimulator() {
  const { tenant, refreshRateLimit } = useTenant();
  const [apiCalls, setApiCalls] = useState(10);
  const [payments, setPayments] = useState(5);
  const [mode, setMode] = useState<RunMode>("sequential");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BriefResults | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  useEffect(() => {
    if (!detailsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailsOpen]);

  const headers = getTenantHeader(tenant?.slug);

  async function runApiCall(index: number): Promise<RequestResult> {
    const start = performance.now();
    try {
      const res = await fetch(`${apiBase()}/api/usage/summary`, {
        headers,
        cache: "no-store",
      });
      const durationMs = Math.round(performance.now() - start);
      const retryAfter = res.headers.get("Retry-After");
      return {
        type: "api",
        index,
        status: res.status,
        ok: res.ok,
        durationMs,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (e) {
      const durationMs = Math.round(performance.now() - start);
      return {
        type: "api",
        index,
        status: 0,
        ok: false,
        durationMs,
        error: e instanceof Error ? e.message : "Network error",
      };
    }
  }

  async function runPayment(index: number): Promise<RequestResult> {
    const start = performance.now();
    try {
      const res = await fetch(`${apiBase()}/api/payments`, {
        method: "POST",
        headers: getTenantHeader(tenant?.slug),
        body: JSON.stringify({
          amount: 100,
          currency: "USD",
          description: `Test sim #${index + 1}`,
        }),
        cache: "no-store",
      });
      const durationMs = Math.round(performance.now() - start);
      const retryAfter = res.headers.get("Retry-After");
      return {
        type: "payment",
        index,
        status: res.status,
        ok: res.ok,
        durationMs,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (e) {
      const durationMs = Math.round(performance.now() - start);
      return {
        type: "payment",
        index,
        status: 0,
        ok: false,
        durationMs,
        error: e instanceof Error ? e.message : "Network error",
      };
    }
  }

  async function run() {
    setRunning(true);
    setResults(null);
    const details: RequestResult[] = [];
    const start = performance.now();

    const runInOrder = async (
      count: number,
      fn: (i: number) => Promise<RequestResult>
    ) => {
      for (let i = 0; i < count; i++) {
        const r = await fn(i);
        details.push(r);
      }
    };

    const runParallel = async (
      count: number,
      fn: (i: number) => Promise<RequestResult>
    ) => {
      const arr = await Promise.all(
        Array.from({ length: count }, (_, i) => fn(i))
      );
      details.push(...arr);
    };

    const exec = mode === "sequential" ? runInOrder : runParallel;

    try {
      await exec(apiCalls, runApiCall);
      await exec(payments, runPayment);
    } finally {
      setRunning(false);
    }

    const totalMs = Math.round(performance.now() - start);

    const apiDetails = details.filter((d) => d.type === "api");
    const paymentDetails = details.filter((d) => d.type === "payment");

    const api = {
      ok: apiDetails.filter((d) => d.ok).length,
      rateLimited: apiDetails.filter((d) => d.status === 429).length,
      error: apiDetails.filter((d) => !d.ok && d.status !== 429).length,
    };
    const payment = {
      ok: paymentDetails.filter((d) => d.ok).length,
      rateLimited: paymentDetails.filter((d) => d.status === 429).length,
      error: paymentDetails.filter((d) => !d.ok && d.status !== 429).length,
    };

    setResults({
      api,
      payment,
      totalMs,
      details,
    });
    setDetailsOpen(false);
    await refreshRateLimit();
  }

  const limit = tenant?.limits?.apiRateLimit ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-500" />
          <CardTitle>Test Simulator</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Simulate API calls and payments to test rate limits and usage.
          {limit > 0 && (
            <span className="block mt-1">
              Tier limit: {limit} req/min.
              {Number.isFinite(limit) &&
                ` To trigger 429s, set API calls or payments above ${limit} (e.g. ${limit + 5}+).`}
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-1 block">API calls</label>
            <Input
              type="number"
              min={0}
              max={500}
              value={apiCalls}
              onChange={(e) =>
                setApiCalls(Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              disabled={running}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Payments</label>
            <Input
              type="number"
              min={0}
              max={200}
              value={payments}
              onChange={(e) =>
                setPayments(Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              disabled={running}
            />
          </div>
        </div>
        <div>
          <label htmlFor="sim-mode" className="text-sm font-medium mb-1 block">
            Execution
          </label>
          <select
            id="sim-mode"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as RunMode)}
            disabled={running}
          >
            <option value="sequential">Sequential</option>
            <option value="parallel">Parallel</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={running || !tenant}>
            {running ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                Running…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run
              </>
            )}
          </Button>
          {results && (
            <Button
              variant="outline"
              onClick={() => setDetailsOpen(true)}
              disabled={running}
            >
              View details
            </Button>
          )}
        </div>

        {results && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
            <p className="font-medium">Brief results</p>
            <p>
              API:{" "}
              <Badge variant="secondary" className="mr-1">
                {results.api.ok} ok
              </Badge>
              {results.api.rateLimited > 0 && (
                <Badge variant="warning" className="mr-1">
                  {results.api.rateLimited} rate limited
                </Badge>
              )}
              {results.api.error > 0 && (
                <Badge variant="destructive" className="mr-1">
                  {results.api.error} error
                </Badge>
              )}
            </p>
            <p>
              Payments:{" "}
              <Badge variant="secondary" className="mr-1">
                {results.payment.ok} ok
              </Badge>
              {results.payment.rateLimited > 0 && (
                <Badge variant="warning" className="mr-1">
                  {results.payment.rateLimited} rate limited
                </Badge>
              )}
              {results.payment.error > 0 && (
                <Badge variant="destructive" className="mr-1">
                  {results.payment.error} error
                </Badge>
              )}
            </p>
            <p className="text-muted-foreground">
              Total time: {results.totalMs} ms
            </p>
          </div>
        )}
      </CardContent>

      {/* Details modal */}
      {detailsOpen && results && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sim-details-title"
          onClick={(e) => e.target === e.currentTarget && setDetailsOpen(false)}
        >
          <Card
            className="w-full max-w-2xl max-h-[85vh] mx-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle id="sim-details-title">Simulation details</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDetailsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {results.details.length} requests
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                >
                  {detailsExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {detailsExpanded ? "Collapse" : "Expand"} all
                </Button>
              </div>
              <div className="space-y-1 text-sm font-mono max-h-80 overflow-auto">
                {results.details.map((r, i) => (
                  <div
                    key={`${r.type}-${r.index}`}
                    className={`flex items-center justify-between gap-2 py-1 px-2 rounded ${
                      r.ok ? "bg-green-500/10" : r.status === 429 ? "bg-amber-500/10" : "bg-red-500/10"
                    }`}
                  >
                    <span className="truncate">
                      #{i + 1} {r.type} {r.index + 1}
                    </span>
                    <span className="shrink-0">
                      {r.status || "—"} · {r.durationMs} ms
                    </span>
                    {(detailsExpanded || !r.ok) && r.error && (
                      <span className="text-muted-foreground truncate max-w-[180px]" title={r.error}>
                        {r.error}
                      </span>
                    )}
                    {r.retryAfter != null && (
                      <Badge variant="outline">Retry-After: {r.retryAfter}s</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}

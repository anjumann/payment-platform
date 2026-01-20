"use client";

import { useState, useEffect } from "react";
import { CreditCard, DollarSign, Zap, TrendingUp, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTenant } from "@/lib/tenant-context";

interface TenantDetails {
  id: string;
  slug: string;
  name: string;
  tier: string;
  isActive: boolean;
  limits: {
    maxUsers: number;
    maxTransactionsPerMonth: number;
    apiRateLimit: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { tenant, loading, error: tenantError, rateLimit } = useTenant();
  const [allTenants, setAllTenants] = useState<TenantDetails[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPayments: 0,
    completedPayments: 0,
    pendingPayments: 0,
    totalAmount: "$0.00",
    apiCalls: 0,
    transactions: 0,
    transactionLimit: 0,
    usagePercent: 0,
  });

  const getTenantDashboardUrl = (slug: string) => {
    if (typeof window === "undefined") return `/${slug}`;
    const { protocol, port } = window.location;
    // In dev we use subdomains like bank1.localhost:3001
    return `${protocol}//${slug}.localhost${port ? `:${port}` : ""}/`;
  };

  useEffect(() => {
    const fetchLiveStats = async () => {
      if (!tenant) return;

      try {
        // Prefer same-origin (/api/*) so Next.js can proxy via rewrites (avoids browser blocking/CORS).
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Tenant-ID": tenant.slug,
        };

        const [paymentsRes, usageRes] = await Promise.all([
          fetch(`${apiUrl}/api/payments/stats`, { 
            headers,
            mode: 'cors',
            credentials: 'include',
          }),
          fetch(`${apiUrl}/api/usage/summary`, { 
            headers,
            mode: 'cors',
            credentials: 'include',
          }),
        ]);

        if (!paymentsRes.ok || !usageRes.ok) {
          console.warn('Failed to fetch stats:', {
            payments: paymentsRes.status,
            usage: usageRes.status,
          });
          return;
        }

        const payments = await paymentsRes.json();
        const usage = await usageRes.json();

        const transactionLimit = tenant.limits.maxTransactionsPerMonth;
        const transactions = usage?.usage?.transactions ?? 0;
        const apiCalls = usage?.usage?.apiCalls ?? 0;

        setStats({
          totalPayments: payments.total ?? 0,
          completedPayments: payments.completed ?? 0,
          pendingPayments: payments.pending ?? 0,
          totalAmount: payments.formattedTotalAmount ?? "$0.00",
          apiCalls,
          transactions,
          transactionLimit,
          usagePercent:
            transactionLimit === Infinity
              ? 0
              : Math.min(100, (transactions / transactionLimit) * 100),
        });
      } catch (error) {
        console.error("Failed to fetch live dashboard stats:", error);
      }
    };

    fetchLiveStats();
  }, [tenant]);

  useEffect(() => {
    const fetchAllTenants = async () => {
      setTenantsLoading(true);
      try {
        // Prefer same-origin (/api/*) so Next.js can proxy via rewrites (avoids browser blocking/CORS).
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const response = await fetch(`${apiUrl}/api/tenants`, {
          headers: {
            "Content-Type": "application/json",
          },
          mode: 'cors',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setAllTenants(data.data || []);
        } else {
          console.warn('Failed to fetch tenants list:', response.status, response.statusText);
        }
      } catch (error) {
        console.error("Failed to fetch tenants:", error);
        // Check if it's a network error
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.error('Network error - is the API server running at', process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000");
        }
      } finally {
        setTenantsLoading(false);
      }
    };

    fetchAllTenants();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Connection Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{tenantError}</p>
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold">Troubleshooting steps:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Check if the API server is running at {process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}</li>
                <li>Disable Brave Shields or browser extensions that might block requests</li>
                <li>Check browser console (F12) for detailed error messages</li>
                <li>Verify CORS is configured correctly on the API server</li>
              </ul>
            </div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Payments",
      value: stats.totalPayments.toLocaleString(),
      icon: CreditCard,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      subtitle: `${stats.completedPayments} completed`,
    },
    {
      title: "Total Amount",
      value: stats.totalAmount,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      subtitle: "This month",
    },
    {
      title: "API Rate Limit",
      value: `${tenant?.limits.apiRateLimit}/min`,
      icon: Zap,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      subtitle: `${tenant?.tier} tier`,
    },
    {
      title: "Transactions",
      value: stats.transactions.toLocaleString(),
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      subtitle:
        tenant?.limits.maxTransactionsPerMonth === Infinity
          ? "Unlimited"
          : `of ${tenant?.limits.maxTransactionsPerMonth?.toLocaleString()}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back! 👋</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your payments today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <span className="text-sm text-muted-foreground">
                  {stat.title}
                </span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monthly Usage</CardTitle>
            <Badge
              variant={tenant?.tier === "enterprise" ? "success" : "default"}
            >
              {tenant?.tier?.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Transactions</span>
              <span className="font-medium">
                {stats.transactions} /{" "}
                {stats.transactionLimit === Infinity
                  ? "∞"
                  : stats.transactionLimit}
              </span>
            </div>
            <Progress value={stats.usagePercent} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>API Rate Limit (current minute)</span>
              <span className="font-medium">
                {rateLimit
                  ? `${(rateLimit.limit - rateLimit.remaining).toLocaleString()} / ${rateLimit.limit.toLocaleString()}`
                  : "—"}
              </span>
            </div>
            <Progress
              value={
                rateLimit && rateLimit.limit > 0
                  ? Math.min(
                      100,
                      ((rateLimit.limit - rateLimit.remaining) / rateLimit.limit) *
                        100
                    )
                  : 0
              }
              className="bg-purple-100 [&>div]:bg-purple-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>This month: {stats.apiCalls.toLocaleString()} calls</span>
              <span>
                Remaining this minute:{" "}
                {rateLimit ? rateLimit.remaining.toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button>
              <CreditCard className="mr-2 h-4 w-4" />
              Create Payment
            </Button>
            <Button variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
            <Button variant="outline">Export Report</Button>
          </div>
        </CardContent>
      </Card>

      {/* All Tenants Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>All Available Tenants</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : allTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tenants found
            </p>
          ) : (
            <div className="space-y-4">
              {allTenants.map((t) => (
                <div
                  key={t.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{t.name}</h3>
                        <Badge
                          variant={
                            t.tier === "enterprise"
                              ? "success"
                              : t.tier === "professional"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {t.tier.toUpperCase()}
                        </Badge>
                        {!t.isActive && (
                          <Badge variant="destructive">INACTIVE</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Slug: <span className="font-mono">{t.slug}</span> | ID:{" "}
                        <span className="font-mono text-xs">{t.id}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={getTenantDashboardUrl(t.slug)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open dashboard
                        </a>
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Max Users
                      </p>
                      <p className="font-medium">
                        {t.limits.maxUsers == null || t.limits.maxUsers === Infinity
                          ? "Unlimited"
                          : t.limits.maxUsers.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Max Transactions/Month
                      </p>
                      <p className="font-medium">
                        {t.limits.maxTransactionsPerMonth == null ||
                        t.limits.maxTransactionsPerMonth === Infinity
                          ? "Unlimited"
                          : t.limits.maxTransactionsPerMonth.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        API Rate Limit
                      </p>
                      <p className="font-medium">
                        {t.limits.apiRateLimit}/min
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    Created: {new Date(t.createdAt).toLocaleDateString()} | Updated:{" "}
                    {new Date(t.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

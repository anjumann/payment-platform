"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/tenant-context";
import { TestSimulator } from "@/components/TestSimulator";

export default function AnalyticsPage() {
  const { tenant } = useTenant();
  const [period, setPeriod] = useState("30d");

  const metrics = [
    {
      label: "Total Revenue",
      value: "$125,678.90",
      change: "+12.5%",
      positive: true,
    },
    {
      label: "Transaction Volume",
      value: "1,234",
      change: "+8.2%",
      positive: true,
    },
    { label: "Success Rate", value: "98.5%", change: "+0.3%", positive: true },
    {
      label: "Avg. Transaction",
      value: "$101.85",
      change: "-2.1%",
      positive: false,
    },
  ];

  const monthlyData = [
    { month: "Jan", transactions: 892, revenue: 125678 },
    { month: "Dec", transactions: 756, revenue: 98234 },
    { month: "Nov", transactions: 823, revenue: 112456 },
    { month: "Oct", transactions: 654, revenue: 87123 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <select
          aria-label="Time period"
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="12m">Last 12 months</option>
        </select>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="text-2xl font-bold mt-1">{metric.value}</p>
              <p
                className={`text-sm mt-1 ${
                  metric.positive ? "text-green-500" : "text-red-500"
                }`}
              >
                {metric.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {monthlyData.map((data, index) => (
              <div
                key={index}
                className={`flex items-center justify-between py-4 ${
                  index < monthlyData.length - 1 ? "border-b" : ""
                }`}
              >
                <span className="font-medium">{data.month} 2024</span>
                <div className="flex gap-8 text-sm">
                  <span className="text-muted-foreground">
                    {data.transactions.toLocaleString()} transactions
                  </span>
                  <span className="font-semibold">
                    ${(data.revenue / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tier Info */}
      <Card>
        <CardHeader>
          <CardTitle>Your Plan: {tenant?.tier?.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">API Rate Limit</p>
              <p className="text-xl font-semibold">
                {tenant?.limits.apiRateLimit} req/min
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Max Users</p>
              <p className="text-xl font-semibold">
                {tenant?.limits.maxUsers === Infinity
                  ? "Unlimited"
                  : tenant?.limits.maxUsers}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Transactions/Month
              </p>
              <p className="text-xl font-semibold">
                {tenant?.limits.maxTransactionsPerMonth === Infinity
                  ? "Unlimited"
                  : tenant?.limits.maxTransactionsPerMonth?.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* <TestSimulator /> */}
    </div>
  );
}

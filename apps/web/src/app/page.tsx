"use client";

import { useState, useEffect } from "react";
import { CreditCard, DollarSign, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTenant } from "@/lib/tenant-context";

export default function DashboardPage() {
  const { tenant, loading } = useTenant();
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

  useEffect(() => {
    if (tenant) {
      setStats({
        totalPayments: 1234,
        completedPayments: 1156,
        pendingPayments: 45,
        totalAmount: "$125,678.90",
        apiCalls: 15234,
        transactions: 892,
        transactionLimit: tenant.limits.maxTransactionsPerMonth,
        usagePercent:
          tenant.limits.maxTransactionsPerMonth === Infinity
            ? 0
            : Math.min(
                100,
                (892 / tenant.limits.maxTransactionsPerMonth) * 100
              ),
      });
    }
  }, [tenant]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
              <span>API Calls</span>
              <span className="font-medium">
                {stats.apiCalls.toLocaleString()}
              </span>
            </div>
            <Progress
              value={30}
              className="bg-purple-100 [&>div]:bg-purple-500"
            />
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
    </div>
  );
}

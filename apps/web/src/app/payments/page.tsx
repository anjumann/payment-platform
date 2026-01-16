"use client";

import { useState, useEffect } from "react";
import { Plus, RefreshCw, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  description?: string;
}

const statusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "success" | "warning" | "outline"
> = {
  pending: "warning",
  processing: "default",
  completed: "success",
  failed: "destructive",
  cancelled: "secondary",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: "",
    currency: "USD",
    description: "",
  });

  useEffect(() => {
    setPayments([
      {
        id: "1",
        reference: "PAY-ABC123",
        amount: 15000,
        currency: "USD",
        status: "completed",
        createdAt: "2024-01-15T10:30:00Z",
        description: "Invoice #1234",
      },
      {
        id: "2",
        reference: "PAY-DEF456",
        amount: 25000,
        currency: "USD",
        status: "pending",
        createdAt: "2024-01-15T09:15:00Z",
        description: "Monthly subscription",
      },
      {
        id: "3",
        reference: "PAY-GHI789",
        amount: 8500,
        currency: "USD",
        status: "processing",
        createdAt: "2024-01-14T16:45:00Z",
        description: "Product purchase",
      },
      {
        id: "4",
        reference: "PAY-JKL012",
        amount: 50000,
        currency: "USD",
        status: "completed",
        createdAt: "2024-01-14T14:20:00Z",
        description: "Enterprise license",
      },
      {
        id: "5",
        reference: "PAY-MNO345",
        amount: 3200,
        currency: "USD",
        status: "failed",
        createdAt: "2024-01-13T11:30:00Z",
        description: "Insufficient funds",
      },
    ]);
  }, []);

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
      amount / 100
    );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString();

  const handleCreatePayment = () => {
    const payment: Payment = {
      id: Date.now().toString(),
      reference: `PAY-${Date.now().toString(36).toUpperCase()}`,
      amount: parseInt(newPayment.amount) * 100,
      currency: newPayment.currency,
      status: "pending",
      createdAt: new Date().toISOString(),
      description: newPayment.description,
    };
    setPayments([payment, ...payments]);
    setDialogOpen(false);
    setNewPayment({ amount: "", currency: "USD", description: "" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Payment
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium">Reference</th>
                <th className="text-left p-4 font-medium">Amount</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium hidden md:table-cell">
                  Description
                </th>
                <th className="text-left p-4 font-medium hidden sm:table-cell">
                  Date
                </th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-muted/50">
                  <td className="p-4 font-medium">{payment.reference}</td>
                  <td className="p-4 font-semibold">
                    {formatAmount(payment.amount, payment.currency)}
                  </td>
                  <td className="p-4">
                    <Badge variant={statusColors[payment.status]}>
                      {payment.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground truncate max-w-[200px] hidden md:table-cell">
                    {payment.description || "-"}
                  </td>
                  <td className="p-4 text-muted-foreground text-sm hidden sm:table-cell">
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Payment Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Create New Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={newPayment.amount}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, amount: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter amount in whole currency units
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Currency
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={newPayment.currency}
                  onChange={(e) =>
                    setNewPayment({ ...newPayment, currency: e.target.value })
                  }
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="INR">INR - Indian Rupee</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Description
                </label>
                <Input
                  placeholder="Payment description"
                  value={newPayment.description}
                  onChange={(e) =>
                    setNewPayment({
                      ...newPayment,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePayment}
                  disabled={!newPayment.amount}
                >
                  Create Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

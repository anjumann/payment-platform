"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/tenant-context";

export default function SettingsPage() {
  const { tenant } = useTenant();
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    name: tenant?.name || "",
    primaryColor: tenant?.settings?.primaryColor || "#1976d2",
    secondaryColor: tenant?.settings?.secondaryColor || "#dc004e",
    emailNotifications: true,
    webhookEnabled: false,
    webhookUrl: "",
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isEnterprise = tenant?.tier === "enterprise";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      {saved && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-lg">
          Settings saved successfully!
        </div>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Organization Name
            </label>
            <Input
              value={settings.name}
              onChange={(e) =>
                setSettings({ ...settings, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">
              Tenant Slug
            </label>
            <Input value={tenant?.slug || ""} disabled />
            <p className="text-xs text-muted-foreground mt-1">
              Contact support to change your slug
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Branding</CardTitle>
            {!isEnterprise && (
              <Badge variant="warning">Enterprise feature</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">
                Primary Color
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded border"
                  style={{ backgroundColor: settings.primaryColor }}
                />
                <Input
                  className="w-32"
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, primaryColor: e.target.value })
                  }
                  disabled={!isEnterprise}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">
                Secondary Color
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded border"
                  style={{ backgroundColor: settings.secondaryColor }}
                />
                <Input
                  className="w-32"
                  value={settings.secondaryColor}
                  onChange={(e) =>
                    setSettings({ ...settings, secondaryColor: e.target.value })
                  }
                  disabled={!isEnterprise}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  emailNotifications: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Email notifications for payments</span>
          </label>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Webhooks</CardTitle>
            {tenant?.tier === "starter" && (
              <Badge variant="warning">Professional+ feature</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.webhookEnabled}
              onChange={(e) =>
                setSettings({ ...settings, webhookEnabled: e.target.checked })
              }
              disabled={tenant?.tier === "starter"}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Enable webhook notifications</span>
          </label>
          {settings.webhookEnabled && (
            <Input
              placeholder="https://your-domain.com/webhook"
              value={settings.webhookUrl}
              onChange={(e) =>
                setSettings({ ...settings, webhookUrl: e.target.value })
              }
            />
          )}
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Your API Key (use in X-Tenant-ID header)
          </p>
          <div className="flex gap-2">
            <Input
              value="pat_****************************"
              disabled
              className="flex-1"
            />
            <Button variant="outline">Reveal</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Keep this key secret. Contact support to regenerate.
          </p>
        </CardContent>
      </Card>

      <Button size="lg" onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  );
}

"use client";

import { ReactNode } from "react";
import { TenantProvider } from "@/lib/tenant-context";
import DashboardLayout from "@/components/DashboardLayout";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        <TenantProvider>
          <DashboardLayout>{children}</DashboardLayout>
        </TenantProvider>
      </body>
    </html>
  );
}

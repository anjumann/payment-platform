"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

/**
 * Tenant interface
 */
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  tier: "starter" | "professional" | "enterprise";
  settings: {
    primaryColor: string;
    secondaryColor: string;
  };
  limits: {
    maxUsers: number;
    maxTransactionsPerMonth: number;
    apiRateLimit: number;
  };
}

/**
 * Tenant Context
 */
interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  loading: true,
  error: null,
  reload: () => {},
});

/**
 * Get tenant from subdomain
 */
function getTenantFromSubdomain(): string | null {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;
  // Check if it's a subdomain (not localhost or IP)
  const parts = hostname.split(".");

  if (parts.length >= 2 && parts[0] !== "www" && parts[0] !== "localhost") {
    return parts[0];
  }

  return null;
}

/**
 * Tenant Provider Component
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = async () => {
    setLoading(true);
    setError(null);

    try {
      const subdomain = getTenantFromSubdomain();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // For development, use a default tenant
      if (!subdomain && process.env.NODE_ENV === "development") {
        headers["X-Tenant-ID"] = "bank1";
      } else if (subdomain) {
        headers["X-Tenant-ID"] = subdomain;
      }

      const response = await fetch(`${apiUrl}/api/tenants/current`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Tenant not found");
      }

      const data = await response.json();
      setTenant(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // Set demo tenant for development
      if (process.env.NODE_ENV === "development") {
        setTenant({
          id: "demo",
          slug: "demo",
          name: "Demo Tenant",
          tier: "professional",
          settings: {
            primaryColor: "#1976d2",
            secondaryColor: "#dc004e",
          },
          limits: {
            maxUsers: 100,
            maxTransactionsPerMonth: 50000,
            apiRateLimit: 300,
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider
      value={{ tenant, loading, error, reload: fetchTenant }}
    >
      {children}
    </TenantContext.Provider>
  );
}

/**
 * Hook to access tenant context
 */
export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}

export default TenantContext;

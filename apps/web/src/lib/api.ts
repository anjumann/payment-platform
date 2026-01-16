const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * API Client for the Multi-Tenant Payment Platform
 */
class ApiClient {
  private tenantId: string | null = null;

  setTenantId(tenantId: string) {
    this.tenantId = tenantId;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async post<T>(path: string, data: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async put<T>(path: string, data: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Payment endpoints
  async createPayment(data: {
    amount: number;
    currency?: string;
    description?: string;
  }) {
    return this.post('/api/payments', data);
  }

  async getPayments(query?: { page?: number; limit?: number; status?: string }) {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', query.page.toString());
    if (query?.limit) params.set('limit', query.limit.toString());
    if (query?.status) params.set('status', query.status);
    
    const queryString = params.toString();
    return this.get(`/api/payments${queryString ? `?${queryString}` : ''}`);
  }

  async getPaymentStats() {
    return this.get('/api/payments/stats');
  }

  // Usage endpoints
  async getUsageSummary() {
    return this.get('/api/usage/summary');
  }

  async getUsageHistory(months = 12) {
    return this.get(`/api/usage/history?months=${months}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;

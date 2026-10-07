export class WhatsAppOTP {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, options?: { baseUrl?: string }) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl || "https://api.yourdomain.com/v1";
  }

  async send(params: any) {
    // Stub implementation
    return { status: "queued", request_id: "stub_id" };
  }

  async verify(params: any) {
    // Stub implementation
    return { verified: true };
  }
}


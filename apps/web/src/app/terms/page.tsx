export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last Updated: October 2026</p>

        <div className="space-y-6 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the DIGITAL BEINGS platform, API, and dashboard (digitalbeings.in), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access or use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
            <p>DIGITAL BEINGS provides a multi-tenant enterprise SaaS platform and REST API allowing registered businesses to send automated, template-based transactional notifications, One-Time Passwords (OTPs), and customer communications via the official Meta WhatsApp Business Cloud API.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. Acceptable Use Policy</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Send spam, unsolicited messages, or unauthorized promotional content.</li>
              <li>Violate any applicable laws, regulations, or Meta's official WhatsApp Commerce and Business Policies.</li>
              <li>Attempt to bypass or exploit our rate limits, billing systems, or security measures.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. API Usage and Rate Limiting</h2>
            <p>We reserve the right to enforce rate limits on API requests to ensure the stability of the platform. Excessive requests may result in temporary suspension of your API keys.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Billing and Payments</h2>
            <p>Use of the API is subject to our pricing plans. You agree to pay all charges incurred in connection with your account. We reserve the right to suspend accounts with outstanding balances or invalid payment methods.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Termination</h2>
            <p>We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Limitation of Liability</h2>
            <p>In no event shall we be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

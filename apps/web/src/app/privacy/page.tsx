export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last Updated: October 2026</p>

        <div className="space-y-6 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
            <p>Welcome to DIGITAL BEINGS ("we", "our", "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy informs you how DIGITAL BEINGS looks after your personal data when you visit our website (digitalbeings.in) and use our WhatsApp Cloud API messaging and OTP verification services.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. The Data We Collect</h2>
            <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Identity Data:</strong> includes business name, first name, last name, username or authorized account representative identifier.</li>
              <li><strong>Contact Data:</strong> includes billing address, email address, registered mobile numbers, and GSTIN identification.</li>
              <li><strong>Technical Data:</strong> includes internet protocol (IP) address, login data, browser type and version, time zone setting, and API request telemetry.</li>
              <li><strong>Platform &amp; Messaging Data:</strong> Phone numbers and message payloads submitted to our API for the sole purpose of routing transactional One-Time Passwords (OTPs), utility notifications, and marketing communications via the official Meta WhatsApp Business Cloud API.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Data</h2>
            <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>To provide, operate, and maintain our enterprise WhatsApp SaaS and API infrastructure.</li>
              <li>To process and route WhatsApp messages securely through Meta Platforms, Inc. (WhatsApp Cloud API).</li>
              <li>To manage your workspace account, prepaid wallet balances, and statutory GST tax invoices.</li>
              <li>To comply with Meta Business Messaging Policies and applicable Indian legal and regulatory standards.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Sharing and Third Parties</h2>
            <p>We share necessary messaging data (such as recipient telephone numbers and template parameters) strictly with Meta Platforms, Inc. to facilitate the direct delivery of WhatsApp messages. We do not sell, rent, or trade your personal or customer data to any third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Security &amp; Encryption</h2>
            <p>We have implemented enterprise-grade administrative, technical, and physical security measures to safeguard your data. All OTP verification codes are hashed using cryptographic hashing algorithms, and API communications are secured via TLS/HTTPS encryption.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Your Legal Rights</h2>
            <p>Under applicable data protection laws, you have the right to request access, correction, or deletion of your account data, or request account closure at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">7. Contact &amp; Data Controller</h2>
            <p><strong>Entity:</strong> DIGITAL BEINGS</p>
            <p><strong>Jurisdiction:</strong> India</p>
            <p><strong>Email:</strong> support@digitalbeings.in</p>
            <p><strong>Website:</strong> https://digitalbeings.in</p>
          </section>
        </div>
      </div>
    </div>
  );
}

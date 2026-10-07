import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
      <main className="text-center">
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
          WhatsApp OTP <span className="text-whatsapp">API</span>
        </h1>
        <p className="mt-4 text-xl text-slate-600 max-w-2xl">
          Drop-in authentication using the official Meta WhatsApp Cloud API. Secure, reliable, and cost-effective.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link href="/dashboard" className="bg-whatsapp hover:bg-whatsapp-dark text-white px-8 py-3 rounded-md font-semibold text-lg transition-colors">
            Go to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

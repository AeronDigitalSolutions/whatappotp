export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Project Settings</h1>
        <p className="text-slate-500">Configure your OTP rules and defaults.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">OTP Length</label>
          <select className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-whatsapp focus:ring-whatsapp sm:text-sm p-2 border">
            <option>4 digits</option>
            <option selected>6 digits</option>
            <option>8 digits</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Expiry (Seconds)</label>
          <input type="number" defaultValue={300} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-whatsapp focus:ring-whatsapp sm:text-sm p-2 border" />
          <p className="mt-1 text-xs text-slate-500">How long before the OTP becomes invalid (default 5 minutes).</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Max Attempts</label>
          <input type="number" defaultValue={5} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-whatsapp focus:ring-whatsapp sm:text-sm p-2 border" />
        </div>
        
        <div className="pt-4 border-t border-slate-200">
          <button className="bg-whatsapp text-white px-4 py-2 rounded-md font-medium hover:bg-whatsapp-dark">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500">Your OTP metrics for the last 30 days.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500">Total Sent</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">1,248</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500">Delivery Rate</h3>
          <p className="mt-2 text-3xl font-bold text-whatsapp">98.2%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h3 className="text-sm font-medium text-slate-500">Verification Rate</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">84.5%</p>
        </div>
      </div>
    </div>
  );
}

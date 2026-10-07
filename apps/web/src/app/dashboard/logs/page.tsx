export default function LogsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">OTP Logs</h1>
        <p className="text-slate-500">Real-time logs of OTP delivery and verification statuses.</p>
      </div>
      
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Phone Number</th>
              <th className="px-6 py-3 font-medium">Channel</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium text-right">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            <tr>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Verified</span>
              </td>
              <td className="px-6 py-4 font-mono text-xs">+91 ***** 98444</td>
              <td className="px-6 py-4">WhatsApp</td>
              <td className="px-6 py-4">Just now</td>
              <td className="px-6 py-4 text-right">₹ 0.11</td>
            </tr>
            <tr>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Delivered</span>
              </td>
              <td className="px-6 py-4 font-mono text-xs">+1 ***** 8020</td>
              <td className="px-6 py-4">WhatsApp</td>
              <td className="px-6 py-4">5 mins ago</td>
              <td className="px-6 py-4 text-right">₹ 0.11</td>
            </tr>
            <tr>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Failed</span>
              </td>
              <td className="px-6 py-4 font-mono text-xs">+44 ***** 1234</td>
              <td className="px-6 py-4">WhatsApp</td>
              <td className="px-6 py-4">1 hour ago</td>
              <td className="px-6 py-4 text-right">Refunded</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

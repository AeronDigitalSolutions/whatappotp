export default function ApiKeysPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
          <p className="text-slate-500">Manage your secret keys for API access.</p>
        </div>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-md font-medium hover:bg-slate-800">
          + Create New Key
        </button>
      </div>
      
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Key Prefix</th>
              <th className="px-6 py-3 font-medium">Created</th>
              <th className="px-6 py-3 font-medium">Last Used</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            <tr>
              <td className="px-6 py-4 font-medium text-slate-900">Production App</td>
              <td className="px-6 py-4 font-mono text-xs">live_a7f2...</td>
              <td className="px-6 py-4">Oct 1, 2026</td>
              <td className="px-6 py-4">2 mins ago</td>
              <td className="px-6 py-4 text-right">
                <button className="text-red-600 hover:text-red-800 font-medium">Revoke</button>
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium text-slate-900">Local Testing</td>
              <td className="px-6 py-4 font-mono text-xs">test_b93x...</td>
              <td className="px-6 py-4">Sep 28, 2026</td>
              <td className="px-6 py-4">Never</td>
              <td className="px-6 py-4 text-right">
                <button className="text-red-600 hover:text-red-800 font-medium">Revoke</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

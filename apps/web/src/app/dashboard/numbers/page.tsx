"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";

interface PhoneNumberItem {
  id: string;
  phoneId: string;
  displayPhone: string;
  verifiedName?: string;
  wabaId: string;
  wabaName?: string;
  service: "AUTHENTICATION" | "MARKETING" | "UTILITY";
  isDefault: boolean;
  quality?: string;
  status?: string;
}

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testModal, setTestModal] = useState<{ open: boolean; phone: PhoneNumberItem | null; to: string; message: string; sending: boolean; result: string | null }>({
    open: false,
    phone: null,
    to: "",
    message: "",
    sending: false,
    result: null
  });

  const [newNumber, setNewNumber] = useState({
    phoneId: "",
    displayPhone: "",
    verifiedName: "",
    wabaId: "",
    wabaName: "",
    service: "AUTHENTICATION" as const
  });

  const projectId = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  const loadNumbers = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/numbers/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setNumbers(data.numbers);
      } else {
        setError(data.error || "Failed to load phone numbers");
      }
    } catch (e: any) {
      setError(e.message || "Network error loading numbers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNumbers();
  }, [projectId]);

  const handleAssignService = async (phoneId: string, service: string, isDefault: boolean) => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/numbers/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, phoneId, service, isDefault })
      });
      const data = await res.json();
      if (data.success) {
        loadNumbers();
      } else {
        alert("Error assigning service: " + data.error);
      }
    } catch (e: any) {
      alert("Failed to update: " + e.message);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/numbers/add-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...newNumber })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewNumber({ phoneId: "", displayPhone: "", verifiedName: "", wabaId: "", wabaName: "", service: "AUTHENTICATION" });
        loadNumbers();
      } else {
        alert("Error: " + data.error);
      }
    } catch (e: any) {
      alert("Failed to add number: " + e.message);
    }
  };

  const handleSendTest = async () => {
    if (!testModal.phone || !testModal.to) return alert("Please enter recipient phone number");
    setTestModal(prev => ({ ...prev, sending: true, result: null }));
    try {
      const res = await fetch(`${getApiUrl()}/v1/messages/send-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          service: testModal.phone.service,
          to: testModal.to,
          templateName: "hello_world",
          language: "en_US"
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestModal(prev => ({ ...prev, sending: false, result: `Success! Message dispatched. ID: ${data.messageId}` }));
      } else {
        setTestModal(prev => ({ ...prev, sending: false, result: `Failed: ${data.error}` }));
      }
    } catch (e: any) {
      setTestModal(prev => ({ ...prev, sending: false, result: `Error: ${e.message}` }));
    }
  };

  const getServiceBadge = (service: string) => {
    switch (service) {
      case "AUTHENTICATION":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">🔑 OTP & Auth</span>;
      case "MARKETING":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">📢 Marketing</span>;
      case "UTILITY":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">📦 Order & Utility</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800">{service}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Phone Numbers & Routing</h1>
          <p className="text-slate-500 text-sm">Assign each WhatsApp number to a specific service (OTP, Marketing, or Order Utility).</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadNumbers}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 shadow-sm"
          >
            🔄 Sync with Meta
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 shadow-sm"
          >
            + Link Number
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Services Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Authentication / OTP</span>
            <span className="text-lg">🔑</span>
          </div>
          <p className="text-xs text-amber-800 mt-2">Reserved for high-priority 2FA codes, login OTPs, and password resets.</p>
          <div className="mt-3 font-semibold text-sm text-slate-800">
            {numbers.find(n => n.service === "AUTHENTICATION" && n.isDefault)?.displayPhone ||
             numbers.find(n => n.service === "AUTHENTICATION")?.displayPhone || "No number assigned"}
          </div>
        </div>

        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Marketing & Promo</span>
            <span className="text-lg">📢</span>
          </div>
          <p className="text-xs text-purple-800 mt-2">Used for seasonal offers, discounts, customer announcements, and campaigns.</p>
          <div className="mt-3 font-semibold text-sm text-slate-800">
            {numbers.find(n => n.service === "MARKETING" && n.isDefault)?.displayPhone ||
             numbers.find(n => n.service === "MARKETING")?.displayPhone || "No number assigned"}
          </div>
        </div>

        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Order Updates & Utility</span>
            <span className="text-lg">📦</span>
          </div>
          <p className="text-xs text-blue-800 mt-2">Used for shipping confirmations, invoice delivery, and account alerts.</p>
          <div className="mt-3 font-semibold text-sm text-slate-800">
            {numbers.find(n => n.service === "UTILITY" && n.isDefault)?.displayPhone ||
             numbers.find(n => n.service === "UTILITY")?.displayPhone || "No number assigned"}
          </div>
        </div>
      </div>

      {/* Numbers List Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Connected WhatsApp Numbers</h2>
          <span className="text-xs font-semibold text-slate-500">{numbers.length} total numbers</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading numbers from Meta...</div>
        ) : numbers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-slate-600 font-medium">No numbers registered yet.</p>
            <p className="text-xs text-slate-400">Complete setup or click "+ Link Number" above to register a phone number.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-semibold">Phone Number</th>
                  <th className="px-6 py-3 font-semibold">Portfolio / WABA</th>
                  <th className="px-6 py-3 font-semibold">Assigned Service</th>
                  <th className="px-6 py-3 font-semibold">Default</th>
                  <th className="px-6 py-3 font-semibold">Quality</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {numbers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{item.displayPhone}</div>
                      <div className="text-xs text-slate-500">{item.verifiedName || "WhatsApp Business"}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {item.phoneId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{item.wabaName || "Default WABA"}</div>
                      <div className="text-[10px] text-slate-400 font-mono">WABA ID: {item.wabaId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={item.service}
                        onChange={(e) => handleAssignService(item.phoneId, e.target.value, item.isDefault)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="AUTHENTICATION">🔑 OTP & Authentication</option>
                        <option value="MARKETING">📢 Marketing & Promo</option>
                        <option value="UTILITY">📦 Order Updates & Utility</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleAssignService(item.phoneId, item.service, !item.isDefault)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold transition ${
                          item.isDefault
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {item.isDefault ? "★ Primary" : "Make Primary"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {item.quality || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setTestModal({ open: true, phone: item, to: "", message: "", sending: false, result: null })}
                        className="text-xs px-3 py-1.5 font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm"
                      >
                        ⚡ Test Message
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Link Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Link WhatsApp Phone Number</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleAddManual} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Display Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="+91 99190 00095"
                  value={newNumber.displayPhone}
                  onChange={(e) => setNewNumber({ ...newNumber, displayPhone: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Meta Phone Number ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1406142089245094"
                    value={newNumber.phoneId}
                    onChange={(e) => setNewNumber({ ...newNumber, phoneId: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Verified Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ishinna Sadana"
                    value={newNumber.verifiedName}
                    onChange={(e) => setNewNumber({ ...newNumber, verifiedName: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">WABA ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1985971052790608"
                    value={newNumber.wabaId}
                    onChange={(e) => setNewNumber({ ...newNumber, wabaId: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">WABA / Portfolio Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ishinna_b_sadana"
                    value={newNumber.wabaName}
                    onChange={(e) => setNewNumber({ ...newNumber, wabaName: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Assign Initial Service</label>
                <select
                  value={newNumber.service}
                  onChange={(e) => setNewNumber({ ...newNumber, service: e.target.value as any })}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
                >
                  <option value="AUTHENTICATION">🔑 OTP & Authentication</option>
                  <option value="MARKETING">📢 Marketing & Promo</option>
                  <option value="UTILITY">📦 Order Updates & Utility</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800"
                >
                  Save & Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Message Modal */}
      {testModal.open && testModal.phone && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Send Test Message</h3>
                <p className="text-xs text-slate-500">From: {testModal.phone.displayPhone} ({testModal.phone.service})</p>
              </div>
              <button onClick={() => setTestModal(prev => ({ ...prev, open: false }))} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Recipient Phone Number (with Country Code)</label>
                <input
                  type="text"
                  placeholder="+919876543210"
                  value={testModal.to}
                  onChange={(e) => setTestModal(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Template Used: <span className="font-mono text-emerald-700">hello_world</span></p>
                <p>This will test message dispatch through your Meta connection and deduct standard test fee from your dashboard wallet.</p>
              </div>

              {testModal.result && (
                <div className={`p-3 rounded-lg text-xs font-medium ${testModal.result.startsWith('Success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {testModal.result}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setTestModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 border rounded-lg text-slate-600 text-sm font-semibold hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={handleSendTest}
                disabled={testModal.sending}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {testModal.sending ? "Sending..." : "Dispatch Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

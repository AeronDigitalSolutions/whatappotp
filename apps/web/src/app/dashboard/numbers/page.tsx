"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";

interface PhoneNumberItem {
  id: string;
  phoneId: string;
  displayPhone: string;
  verifiedName?: string;
  wabaId: string;
  wabaName?: string;
  service: string; // Comma-separated: "AUTHENTICATION,MARKETING,UTILITY"
  isDefault: boolean;
  quality?: string;
  status?: string;
}

export default function NumbersPage() {
  const { showSuccess, showError, showWarning } = useModal();
  const [numbers, setNumbers] = useState<PhoneNumberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingPhoneId, setUpdatingPhoneId] = useState<string | null>(null);

  // Test Modal
  const [testModal, setTestModal] = useState<{
    open: boolean;
    phone: PhoneNumberItem | null;
    selectedService: string;
    to: string;
    sending: boolean;
    result: string | null;
  }>({
    open: false,
    phone: null,
    selectedService: "AUTHENTICATION",
    to: "",
    sending: false,
    result: null
  });

  // Add Manual Modal state
  const [newNumber, setNewNumber] = useState({
    phoneId: "",
    displayPhone: "",
    verifiedName: "",
    wabaId: "",
    wabaName: "",
    services: ["AUTHENTICATION"] as string[]
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

  // Toggle a single service checkbox on/off for a number
  const handleToggleService = async (
    phoneId: string,
    serviceToToggle: "AUTHENTICATION" | "MARKETING" | "UTILITY",
    currentServiceStr: string,
    isDefault: boolean
  ) => {
    const currentServices = currentServiceStr
      ? currentServiceStr.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    let updatedServices: string[] = [];
    if (currentServices.includes(serviceToToggle)) {
      // Uncheck / remove
      updatedServices = currentServices.filter((s) => s !== serviceToToggle);
    } else {
      // Check / add
      updatedServices = [...currentServices, serviceToToggle];
    }

    const newServiceStr = updatedServices.join(",");

    // Optimistic UI update
    setNumbers((prev) =>
      prev.map((n) => (n.phoneId === phoneId ? { ...n, service: newServiceStr } : n))
    );
    setUpdatingPhoneId(phoneId);

    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/numbers/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phoneId,
          service: newServiceStr,
          isDefault
        })
      });
      const data = await res.json();
      if (!data.success) {
        showError("Error saving service: " + data.error, "Update Failed");
        loadNumbers();
      }
    } catch (e: any) {
      showError("Failed to update: " + e.message, "Network Error");
      loadNumbers();
    } finally {
      setUpdatingPhoneId(null);
    }
  };

  const handleSetPrimary = async (phoneId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/numbers/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phoneId,
          isDefault: true
        })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Primary routing number updated successfully.", "Primary Number Set");
        loadNumbers();
      } else {
        showError(data.error || "Failed to set primary number", "Update Failed");
      }
    } catch (e: any) {
      showError(e.message || "Network error", "Network Error");
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${getApiUrl()}/v1/meta/numbers/add-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phoneId: newNumber.phoneId,
          displayPhone: newNumber.displayPhone,
          verifiedName: newNumber.verifiedName,
          wabaId: newNumber.wabaId,
          wabaName: newNumber.wabaName,
          service: newNumber.services.join(",")
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        showSuccess(`Number ${newNumber.displayPhone} was linked successfully.`, "Number Linked");
        setNewNumber({
          phoneId: "",
          displayPhone: "",
          verifiedName: "",
          wabaId: "",
          wabaName: "",
          services: ["AUTHENTICATION"]
        });
        loadNumbers();
      } else {
        showError(data.error || "Failed to link number", "Error Linking Number");
      }
    } catch (e: any) {
      showError(e.message || "Failed to add number", "Error");
    }
  };

  const handleSendTest = async () => {
    if (!testModal.phone || !testModal.to) {
      showWarning("Please enter a valid recipient phone number with country code.", "Recipient Required");
      return;
    }
    setTestModal((prev) => ({ ...prev, sending: true, result: null }));
    try {
      const res = await fetch(`${getApiUrl()}/v1/messages/send-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          service: testModal.selectedService,
          to: testModal.to,
          templateName: "hello_world",
          language: "en_US"
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestModal((prev) => ({
          ...prev,
          sending: false,
          result: `Success! Message dispatched via ${testModal.selectedService}. Message ID: ${data.messageId}`
        }));
      } else {
        setTestModal((prev) => ({
          ...prev,
          sending: false,
          result: `Failed: ${data.error}`
        }));
      }
    } catch (e: any) {
      setTestModal((prev) => ({ ...prev, sending: false, result: `Error: ${e.message}` }));
    }
  };

  // Group numbers matching each service category
  const authNumbers = numbers.filter((n) => n.service?.includes("AUTHENTICATION"));
  const marketingNumbers = numbers.filter((n) => n.service?.includes("MARKETING"));
  const utilityNumbers = numbers.filter((n) => n.service?.includes("UTILITY"));

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Phone Numbers & Routing</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Check the services each number should handle. A single number can be assigned to one, two, or all three services.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadNumbers}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <span className={loading ? "animate-spin" : ""}>🔄</span> Sync with Meta
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadNumbers} className="underline font-semibold hover:text-red-900">Retry</button>
        </div>
      )}

      {/* Services Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Authentication Card */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Authentication / OTP</span>
              <span className="text-lg">🔑</span>
            </div>
            <p className="text-xs text-amber-800 mt-2">
              Reserved for high-priority 2FA codes, login OTPs, and password resets.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-200/60">
            {authNumbers.length > 0 ? (
              <div className="space-y-1.5">
                {authNumbers.map((n) => (
                  <div key={n.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-bold text-sm text-slate-900 font-mono">{n.displayPhone}</span>
                    </div>
                    {n.isDefault ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Primary</span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">Assigned</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-400 italic">No number assigned</span>
            )}
          </div>
        </div>

        {/* Marketing Card */}
        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Marketing & Promo</span>
              <span className="text-lg">📢</span>
            </div>
            <p className="text-xs text-purple-800 mt-2">
              Used for seasonal offers, discounts, customer announcements, and broadcasts.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-purple-200/60">
            {marketingNumbers.length > 0 ? (
              <div className="space-y-1.5">
                {marketingNumbers.map((n) => (
                  <div key={n.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="font-bold text-sm text-slate-900 font-mono">{n.displayPhone}</span>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">Active</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-400 italic">No number assigned</span>
            )}
          </div>
        </div>

        {/* Utility Card */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Order Updates & Utility</span>
              <span className="text-lg">📦</span>
            </div>
            <p className="text-xs text-blue-800 mt-2">
              Used for shipping confirmations, invoice delivery, and account notifications.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-200/60">
            {utilityNumbers.length > 0 ? (
              <div className="space-y-1.5">
                {utilityNumbers.map((n) => (
                  <div key={n.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="font-bold text-sm text-slate-900 font-mono">{n.displayPhone}</span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Active</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-400 italic">No number assigned</span>
            )}
          </div>
        </div>
      </div>

      {/* Connected WhatsApp Numbers Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Connected WhatsApp Numbers</h2>
            <p className="text-xs text-slate-500 mt-0.5">Check or uncheck services to route traffic across your numbers.</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
            {numbers.length} registered {numbers.length === 1 ? "number" : "numbers"}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2"></div>
            Loading numbers from Meta...
          </div>
        ) : numbers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-slate-600 font-medium">No numbers registered yet.</p>
            <p className="text-xs text-slate-400">Click "+ Link Number" above to register a phone number manually or sync with Meta.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-semibold">Phone Number</th>
                  <th className="px-6 py-3 font-semibold">Portfolio / WABA</th>
                  <th className="px-6 py-3 font-semibold">Assigned Services (Check to Enable)</th>
                  <th className="px-6 py-3 font-semibold">Priority</th>
                  <th className="px-6 py-3 font-semibold">Quality</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {numbers.map((item) => {
                  const hasAuth = !!item.service?.includes("AUTHENTICATION");
                  const hasMarketing = !!item.service?.includes("MARKETING");
                  const hasUtility = !!item.service?.includes("UTILITY");
                  const totalActiveServices = [hasAuth, hasMarketing, hasUtility].filter(Boolean).length;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Phone Info */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 font-mono text-sm">{item.displayPhone}</div>
                        <div className="text-xs text-slate-500">{item.verifiedName || "WhatsApp Business"}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {item.phoneId}</div>
                      </td>

                      {/* Portfolio / WABA */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800 text-xs">{item.wabaName || "Default WABA"}</div>
                        <div className="text-[10px] text-slate-400 font-mono">WABA: {item.wabaId}</div>
                      </td>

                      {/* Assigned Services: CHECKBOXES */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Checkbox 1: OTP & Authentication */}
                            <label
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border select-none transition-all ${
                                hasAuth
                                  ? "bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300 shadow-sm"
                                  : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={hasAuth}
                                onChange={() => handleToggleService(item.phoneId, "AUTHENTICATION", item.service, item.isDefault)}
                                className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>🔑 OTP & Auth</span>
                            </label>

                            {/* Checkbox 2: Marketing & Promo */}
                            <label
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border select-none transition-all ${
                                hasMarketing
                                  ? "bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-300 shadow-sm"
                                  : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={hasMarketing}
                                onChange={() => handleToggleService(item.phoneId, "MARKETING", item.service, item.isDefault)}
                                className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>📢 Marketing</span>
                            </label>

                            {/* Checkbox 3: Order Updates & Utility */}
                            <label
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border select-none transition-all ${
                                hasUtility
                                  ? "bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-300 shadow-sm"
                                  : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={hasUtility}
                                onChange={() => handleToggleService(item.phoneId, "UTILITY", item.service, item.isDefault)}
                                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>📦 Order Utility</span>
                            </label>
                          </div>

                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                            {totalActiveServices === 3 ? (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                                🌟 All 3 Services Active (Shared Number)
                              </span>
                            ) : totalActiveServices > 0 ? (
                              <span className="text-slate-600">
                                Active for {totalActiveServices} of 3 services
                              </span>
                            ) : (
                              <span className="text-amber-600 font-semibold">
                                ⚠️ No services enabled (Number is inactive)
                              </span>
                            )}
                            {updatingPhoneId === item.phoneId && (
                              <span className="text-[10px] text-emerald-600 animate-pulse">Saving...</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Priority / Default */}
                      <td className="px-6 py-4">
                        {item.isDefault ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            ★ Primary
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetPrimary(item.phoneId)}
                            className="text-xs text-slate-500 hover:text-slate-800 font-semibold hover:underline"
                          >
                            Set Primary
                          </button>
                        )}
                      </td>

                      {/* Quality */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.quality || "GREEN"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            const defaultService = hasAuth ? "AUTHENTICATION" : hasMarketing ? "MARKETING" : "UTILITY";
                            setTestModal({
                              open: true,
                              phone: item,
                              selectedService: defaultService,
                              to: "",
                              sending: false,
                              result: null
                            });
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
                        >
                          ⚡ Test Message
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Link Number Manually */}
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
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Verified Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ishinna Sadana"
                    value={newNumber.verifiedName}
                    onChange={(e) => setNewNumber({ ...newNumber, verifiedName: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">WABA / Portfolio Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ishinna_b_sadana"
                    value={newNumber.wabaName}
                    onChange={(e) => setNewNumber({ ...newNumber, wabaName: e.target.value })}
                    className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Multi-Service Checkboxes in Modal */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1.5">Assign Services (Check all that apply)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["AUTHENTICATION", "MARKETING", "UTILITY"] as const).map((svc) => {
                    const isChecked = newNumber.services.includes(svc);
                    const label = svc === "AUTHENTICATION" ? "🔑 OTP & Auth" : svc === "MARKETING" ? "📢 Marketing" : "📦 Utility";
                    return (
                      <label
                        key={svc}
                        className={`border rounded-lg p-2.5 flex items-center gap-2 cursor-pointer text-xs font-semibold select-none ${
                          isChecked ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setNewNumber({ ...newNumber, services: newNumber.services.filter((s) => s !== svc) });
                            } else {
                              setNewNumber({ ...newNumber, services: [...newNumber.services, svc] });
                            }
                          }}
                          className="rounded text-emerald-600"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
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
                  Save & Link Number
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Test Message */}
      {testModal.open && testModal.phone && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Send Test WhatsApp Message</h3>
                <p className="text-xs text-slate-500 font-mono">From: {testModal.phone.displayPhone}</p>
              </div>
              <button
                onClick={() => setTestModal((prev) => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Select Service Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["AUTHENTICATION", "MARKETING", "UTILITY"] as const).map((svc) => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => setTestModal((prev) => ({ ...prev, selectedService: svc }))}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                        testModal.selectedService === svc
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {svc === "AUTHENTICATION" ? "🔑 OTP" : svc === "MARKETING" ? "📢 Promo" : "📦 Utility"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Recipient Phone Number (with Country Code)</label>
                <input
                  type="text"
                  placeholder="+919876543210"
                  value={testModal.to}
                  onChange={(e) => setTestModal((prev) => ({ ...prev, to: e.target.value }))}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  Template Used: <span className="font-mono text-emerald-700">hello_world</span>
                </p>
                <p>Dispatches through Meta Cloud API and checks route mapping.</p>
              </div>

              {testModal.result && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    testModal.result.startsWith("Success")
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {testModal.result}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setTestModal((prev) => ({ ...prev, open: false }))}
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

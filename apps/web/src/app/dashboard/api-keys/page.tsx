"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
  revokedAt: string | null;
}

export default function ApiKeysPage() {
  const { showError, showSuccess } = useModal();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Key Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Revoke Modal
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Interactive Test Widget
  const [testPhone, setTestPhone] = useState("+91");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ requestId?: string; devCode?: string; error?: string; success?: boolean } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success?: boolean; error?: string; message?: string } | null>(null);

  // Quickstart code snippet tab
  const [codeTab, setCodeTab] = useState<"curl" | "node" | "python">("curl");
  const [copiedCode, setCopiedCode] = useState(false);

  const projectId = typeof window !== "undefined" ? localStorage.getItem("projectId") : null;

  const loadKeys = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/v1/api-keys/${projectId}`);
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys || []);
      } else {
        setError(data.error || "Failed to load API keys");
      }
    } catch (e: any) {
      setError(e.message || "Failed to connect to API server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [projectId]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/v1/api-keys/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName || undefined, environment })
      });
      const data = await res.json();
      if (data.success && data.key?.secretKey) {
        setCreatedSecret(data.key.secretKey);
        loadKeys();
      } else {
        showError(data.error || "Failed to create API key", "Key Creation Failed");
      }
    } catch (e: any) {
      showError(e.message || "Network error", "Network Error");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!projectId || !revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/api-keys/${projectId}/${revokeTarget.id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setRevokeTarget(null);
        showSuccess(`Key "${revokeTarget.name}" has been revoked successfully.`, "Key Revoked");
        loadKeys();
      } else {
        showError(data.error || "Failed to revoke key", "Revocation Failed");
      }
    } catch (e: any) {
      showError(e.message || "Network error", "Network Error");
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = (text: string, isSnippet = false) => {
    navigator.clipboard.writeText(text);
    if (isSnippet) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleSendTestOtp = async () => {
    if (!projectId || !testPhone) return;
    setTestSending(true);
    setTestResult(null);
    setVerifyResult(null);
    setVerifyCode("");

    try {
      const res = await fetch(`${getApiUrl()}/v1/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phone: testPhone,
          purpose: "DASHBOARD_TEST",
          simulate: true // Dev simulation mode for instant sandbox testing
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult(data);
        if (data.devCode) {
          setVerifyCode(data.devCode);
        }
      } else {
        setTestResult({ success: false, error: data.error || "Failed to send test OTP" });
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message || "Network error" });
    } finally {
      setTestSending(false);
    }
  };

  const handleVerifyTestOtp = async () => {
    if (!testResult?.requestId || !verifyCode) return;
    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch(`${getApiUrl()}/v1/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: testResult.requestId,
          code: verifyCode
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyResult({ success: true, message: data.message });
      } else {
        setVerifyResult({ success: false, error: data.error || "Verification failed" });
      }
    } catch (e: any) {
      setVerifyResult({ success: false, error: e.message || "Network error" });
    } finally {
      setVerifying(false);
    }
  };

  // Code Snippet generators
  const sampleKey = keys[0]?.prefix ? `${keys[0].prefix.replace("...", "")}abcdef1234567890` : "wotp_test_your_secret_key_here";
  const apiEndpoint = getApiUrl();

  const snippets = {
    curl: `curl -X POST "${apiEndpoint}/v1/otp/send" \\
  -H "Authorization: Bearer ${sampleKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+919876543210",
    "purpose": "AUTHENTICATION"
  }'`,
    node: `// Node.js (v18+)
const res = await fetch("${apiEndpoint}/v1/otp/send", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${sampleKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    phone: "+919876543210",
    purpose: "AUTHENTICATION"
  })
});
const data = await res.json();
console.log("OTP Request ID:", data.requestId);`,
    python: `# Python (requests)
import requests

url = "${apiEndpoint}/v1/otp/send"
headers = {
    "Authorization": "Bearer ${sampleKey}",
    "Content-Type": "application/json"
}
payload = {
    "phone": "+919876543210",
    "purpose": "AUTHENTICATION"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">API Keys</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and manage your secret authentication tokens to dispatch and verify WhatsApp OTPs.
          </p>
        </div>
        <button
          onClick={() => {
            setKeyName("");
            setEnvironment("test");
            setCreatedSecret(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Create New Key
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadKeys} className="underline font-semibold hover:text-red-900">Retry</button>
        </div>
      )}

      {/* Keys Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-sm font-semibold text-slate-700">Active API Keys ({keys.filter(k => !k.revokedAt).length})</h2>
          </div>
          <button
            onClick={loadKeys}
            disabled={loading}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-slate-300 border-t-emerald-600 rounded-full mb-2"></div>
            <p>Loading API keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">No API Keys Yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Generate an API key to authenticate your backend servers, mobile apps, or scripts when sending WhatsApp OTPs.
            </p>
            <button
              onClick={() => {
                setKeyName("");
                setEnvironment("test");
                setCreatedSecret(null);
                setShowCreateModal(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              + Create your first API key
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold">Name & Environment</th>
                  <th className="px-6 py-3 font-semibold">Key Token Prefix</th>
                  <th className="px-6 py-3 font-semibold">Created Date</th>
                  <th className="px-6 py-3 font-semibold">Last Used</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {keys.map((key) => {
                  const isRevoked = !!key.revokedAt;
                  const isTest = key.prefix.includes("test");
                  return (
                    <tr key={key.id} className={isRevoked ? "bg-slate-50/60 opacity-60" : "hover:bg-slate-50/50"}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{key.name}</div>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded ${
                          isTest ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {isTest ? "TEST / DEV" : "PRODUCTION"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-800 border border-slate-200">
                          {key.prefix}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(key.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {key.lastUsed ? new Date(key.lastUsed).toLocaleString() : "Never used"}
                      </td>
                      <td className="px-6 py-4">
                        {isRevoked ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isRevoked ? (
                          <button
                            onClick={() => setRevokeTarget(key)}
                            className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Quick Test Sandbox */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-700/80 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="text-lg font-bold">Interactive Developer Sandbox</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Test sending and verifying an OTP right now directly against your backend.
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 text-emerald-400">
            Rate: ₹0.50 / dispatch
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dispatch Step */}
          <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Step 1: Dispatch OTP</span>
              <span className="text-[11px] text-slate-400">POST /v1/otp/send</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Phone Number</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={handleSendTestOtp}
              disabled={testSending || !testPhone}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {testSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Dispatching OTP...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Send Test OTP
                </>
              )}
            </button>

            {testResult && (
              <div className={`p-3 rounded-lg text-xs font-mono space-y-1.5 ${
                testResult.success ? "bg-emerald-950/60 border border-emerald-700/60 text-emerald-200" : "bg-red-950/60 border border-red-700/60 text-red-200"
              }`}>
                {testResult.success ? (
                  <>
                    <div className="font-bold flex items-center gap-1 text-emerald-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      OTP Dispatched Successfully!
                    </div>
                    <div>Request ID: <span className="text-white select-all">{testResult.requestId}</span></div>
                    {testResult.devCode && (
                      <div className="bg-emerald-900/80 p-2 rounded border border-emerald-600 text-white flex items-center justify-between">
                        <span>Generated Code: <strong className="text-base text-yellow-300 tracking-wider ml-1">{testResult.devCode}</strong></span>
                        <span className="text-[10px] text-emerald-300 uppercase">Test Simulation</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div>Error: {testResult.error}</div>
                )}
              </div>
            )}
          </div>

          {/* Verification Step */}
          <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Step 2: Verify Code</span>
              <span className="text-[11px] text-slate-400">POST /v1/otp/verify</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Enter 6-Digit Verification Code</label>
              <input
                type="text"
                maxLength={8}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="e.g. 505882"
                disabled={!testResult?.requestId}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 font-mono tracking-widest text-center focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
            </div>

            <button
              onClick={handleVerifyTestOtp}
              disabled={verifying || !testResult?.requestId || !verifyCode}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verify OTP Code
                </>
              )}
            </button>

            {verifyResult && (
              <div className={`p-3 rounded-lg text-xs font-mono space-y-1 ${
                verifyResult.success ? "bg-emerald-950/60 border border-emerald-700/60 text-emerald-200" : "bg-red-950/60 border border-red-700/60 text-red-200"
              }`}>
                {verifyResult.success ? (
                  <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {verifyResult.message || "OTP Code Verified Successfully!"}
                  </div>
                ) : (
                  <div>Error: {verifyResult.error}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quickstart Integration Code Snippets */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Developer Quickstart</h3>
            <p className="text-xs text-slate-500">Integrate WhatsApp OTP dispatch into your application in seconds.</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(["curl", "node", "python"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCodeTab(tab)}
                className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
                  codeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "curl" ? "cURL" : tab === "node" ? "Node.js" : "Python"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-900 relative">
          <button
            onClick={() => copyToClipboard(snippets[codeTab], true)}
            className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition-all border border-slate-700"
          >
            {copiedCode ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Code
              </>
            )}
          </button>
          <pre className="text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
            {snippets[codeTab]}
          </pre>
        </div>
      </div>

      {/* Modal: Create API Key */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            {!createdSecret ? (
              <form onSubmit={handleCreateKey} className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">Create New API Key</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key Name / Description</label>
                  <input
                    type="text"
                    required
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g., Staging Server, Mobile App, Production Backend"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Environment</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      onClick={() => setEnvironment("test")}
                      className={`cursor-pointer border p-3 rounded-lg flex flex-col gap-1 transition-all ${
                        environment === "test" ? "border-amber-500 bg-amber-50/50 ring-1 ring-amber-500" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-900">Development / Test</span>
                        <input type="radio" checked={environment === "test"} readOnly className="accent-amber-600" />
                      </div>
                      <span className="text-[11px] text-slate-500">Prefix: wotp_test_...</span>
                    </label>

                    <label
                      onClick={() => setEnvironment("live")}
                      className={`cursor-pointer border p-3 rounded-lg flex flex-col gap-1 transition-all ${
                        environment === "live" ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-900">Production / Live</span>
                        <input type="radio" checked={environment === "live"} readOnly className="accent-emerald-600" />
                      </div>
                      <span className="text-[11px] text-slate-500">Prefix: wotp_live_...</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2"
                  >
                    {creating ? "Generating..." : "Generate API Key"}
                  </button>
                </div>
              </form>
            ) : (
              /* Success: Display Secret Key ONCE */
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-emerald-600">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">API Key Created!</h3>
                    <p className="text-xs text-slate-500">Save this secret key in a secure password manager or .env file.</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    <strong>Important:</strong> You will not be able to view this secret key again. If you lose it, you will need to revoke it and generate a new one.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your Secret API Key</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={createdSecret}
                      className="w-full font-mono text-xs bg-slate-100 border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdSecret)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all"
                    >
                      {copiedKey ? "Copied!" : "Copy Key"}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatedSecret(null);
                    }}
                    className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Revoke Confirmation */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revoke API Key?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Are you sure you want to revoke <strong>{revokeTarget.name}</strong> ({revokeTarget.prefix})? Any server or integration currently using this key will immediately be rejected.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revoking}
                onClick={handleRevokeKey}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                {revoking ? "Revoking..." : "Yes, Revoke Key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

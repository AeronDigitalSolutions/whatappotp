"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";

export default function SetupPage() {
  const { showSuccess, showError, showWarning } = useModal();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Cascading data
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [hasFetchedAccounts, setHasFetchedAccounts] = useState(false);
  const [fetchError, setFetchError] = useState("");
  
  // User selections
  const [selectedBiz, setSelectedBiz] = useState("");
  const [selectedWaba, setSelectedWaba] = useState("");
  const [selectedPhone, setSelectedPhone] = useState("");
  
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const pid = localStorage.getItem("projectId");
    if (pid) {
      setProjectId(pid);
      fetchProjectData(pid);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProjectData = async (pid: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/project/${pid}`);
      const data = await res.json();
      if (data.success) {
        setProject(data.project);
        if (data.project.metaAccessToken && !data.project.metaWabaId) {
          fetchMetaAccounts(pid);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetaAccounts = async (pid: string) => {
    try {
      setFetchError("");
      const res = await fetch(`${getApiUrl()}/v1/meta/accounts/${pid}`);
      const data = await res.json();
      if (data.success) {
        setBusinesses(data.businesses || []); 
      } else {
        setFetchError(data.error || "Failed to fetch accounts");
      }
    } catch (e) {
      console.error(e);
      setFetchError("Server connection error");
    } finally {
      setHasFetchedAccounts(true);
    }
  };

  useEffect(() => {
    (window as any).fbAsyncInit = function () {
      (window as any).FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1831033178050637',
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
    };
  }, []);

  const handleFacebookLogin = () => {
    if (!projectId) return showWarning("Please log in to your account first.", "Login Required");
    
    (window as any).FB.login(function (response: any) {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        
        fetch(`${getApiUrl()}/v1/auth/meta/callback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, projectId })
        })
        .then(res => res.json())
        .then(data => {
          if(data.success) {
             setProject({ ...project, metaAccessToken: accessToken });
             fetchMetaAccounts(projectId);
          } else {
             showError("Failed to save Meta token: " + data.error, "Token Error");
          }
        })
        .catch(err => showError("Error communicating with server", "Network Error"));
      } else {
        console.log('User cancelled login or did not fully authorize.');
      }
    }, {
      scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
      return_scopes: true
    });
  };

  const saveSelection = async () => {
    if (!selectedWaba || !selectedPhone) return showWarning("Please select a WhatsApp Business Account and a phone number.", "Selection Required");
    setSaving(true);
    try {
      const currentBiz = businesses.find(b => b.id === selectedBiz);
      const currentWaba = currentBiz?.wabas?.find((w: any) => w.id === selectedWaba);
      const currentPhone = currentWaba?.phones?.find((p: any) => p.id === selectedPhone);

      const res = await fetch(`${getApiUrl()}/v1/meta/select/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wabaId: selectedWaba,
          phoneId: selectedPhone,
          displayPhone: currentPhone?.number || selectedPhone,
          verifiedName: currentPhone?.verifiedName,
          wabaName: currentWaba?.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setProject({ ...project, metaWabaId: selectedWaba, metaPhoneId: selectedPhone });
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Find currently selected entities to populate cascading dropdowns
  const currentBiz = businesses.find(b => b.id === selectedBiz);
  const currentWabas = currentBiz ? currentBiz.wabas : [];
  
  const currentWaba = currentWabas.find((w: any) => w.id === selectedWaba);
  const currentPhones = currentWaba ? currentWaba.phones : [];

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <>
      <Script async defer crossOrigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js" />
      <div className="max-w-3xl mx-auto py-12">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900">Connect Your WhatsApp Number</h1>
          <p className="text-slate-500 text-lg">Follow the step-by-step setup to connect your official API number.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center">
          
          {/* STATE 1: Connect Meta */}
          {!project?.metaAccessToken && (
            <div className="text-center space-y-6">
              <div className="flex justify-center items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-bold">OS</div>
                <div className="text-slate-300">● ● ●</div>
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Step 1: Connect with Meta</h2>
                <p className="text-slate-500 text-sm mt-1 mb-6">Authorize your Facebook Business Manager to fetch your WhatsApp profiles.</p>
              </div>
              <button onClick={handleFacebookLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-colors flex items-center space-x-2 mx-auto">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span>Login with Facebook</span>
              </button>
            </div>
          )}

          {/* STATE 2: Cascading Profile Selection */}
          {project?.metaAccessToken && (!project?.metaWabaId || isEditing) && (
            <div className="text-center space-y-6 w-full max-w-2xl">
              
              {!hasFetchedAccounts ? (
                <div className="py-8">Fetching accounts from Facebook...</div>
              ) : fetchError || businesses.length === 0 ? (
                <div className="text-left bg-orange-50 border border-orange-200 p-8 rounded-xl space-y-4">
                  <h2 className="text-xl font-bold text-orange-900">Action Required in Facebook</h2>
                  {fetchError ? (
                    <p className="text-orange-800 text-sm">{fetchError}</p>
                  ) : (
                    <p className="text-orange-800 text-sm">
                      We securely connected, but found 0 Business Portfolios with WhatsApp Accounts. 
                    </p>
                  )}
                  
                  <div className="bg-white p-5 rounded-lg border border-orange-100 shadow-sm mt-4">
                    <h3 className="font-bold text-slate-800 mb-3">How to create a WABA:</h3>
                    <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600">
                      <li>Go to <a href="https://business.facebook.com/" target="_blank" className="text-blue-600 hover:underline font-medium">Facebook Business Manager</a>.</li>
                      <li>Select your Business Portfolio (or create one).</li>
                      <li>Go to <strong>Settings</strong> ➔ <strong>WhatsApp accounts</strong>.</li>
                      <li>Click <strong>Add</strong> and verify your phone number.</li>
                      <li>Once done, come back here and click Refresh.</li>
                    </ol>
                  </div>

                  <button 
                    onClick={() => {
                      setHasFetchedAccounts(false);
                      fetchMetaAccounts(projectId!);
                    }} 
                    className="mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm"
                  >
                    Refresh Accounts
                  </button>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Step 2: Select Profile & Number</h2>
                  <p className="text-slate-500 text-sm">Follow the hierarchy to select the exact phone number you want to connect.</p>
                  
                  <div className="text-left space-y-5 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    
                    {/* 1. Business Portfolio */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">1. Facebook Business Portfolio</label>
                      <select 
                        className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={selectedBiz}
                        onChange={(e) => {
                          setSelectedBiz(e.target.value);
                          setSelectedWaba(""); // Reset children
                          setSelectedPhone(""); // Reset children
                        }}
                      >
                        <option value="">-- Select Portfolio --</option>
                        {businesses.map(biz => (
                          <option key={biz.id} value={biz.id}>{biz.name} ({biz.id})</option>
                        ))}
                      </select>
                    </div>

                    {/* 2. WhatsApp Business Account */}
                    {selectedBiz && (
                      <div className="pl-4 border-l-2 border-blue-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2">2. WhatsApp Business Account</label>
                        {currentWabas.length === 0 ? (
                          <div className="text-sm text-red-500 p-2 bg-red-50 rounded">No WhatsApp accounts found in this portfolio.</div>
                        ) : (
                          <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={selectedWaba}
                            onChange={(e) => {
                              setSelectedWaba(e.target.value);
                              setSelectedPhone(""); // Reset child
                            }}
                          >
                            <option value="">-- Select WABA --</option>
                            {currentWabas.map((w: any) => (
                              <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* 3. Phone Number */}
                    {selectedWaba && (
                      <div className="pl-8 border-l-2 border-green-200">
                        <label className="block text-sm font-bold text-slate-700 mb-2">3. Phone Number</label>
                        {currentPhones.length === 0 ? (
                          <div className="text-sm text-orange-800 p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
  <p className="font-semibold">0 phone numbers shared.</p>
  <p>If you have a number, you didn't grant this app permission to see it during Facebook Login.</p>
  <p>If you don't have a number, <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" className="text-blue-600 hover:underline font-bold">click here to register a WhatsApp number in Meta</a>.</p>
</div>
                        ) : (
                          <select 
                            className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-green-500 outline-none"
                            value={selectedPhone}
                            onChange={(e) => setSelectedPhone(e.target.value)}
                          >
                            <option value="">-- Select Phone Number --</option>
                            {currentPhones.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.number}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                    
                  </div>

                  <button 
                    onClick={saveSelection} 
                    disabled={!selectedWaba || !selectedPhone || saving}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-lg transition-colors mt-6 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Confirm Selection"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATE 3: Setup Complete & Wallet Call to Action */}
          {project?.metaAccessToken && project?.metaWabaId && !isEditing && (
            <div className="text-center space-y-6 w-full max-w-md">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Meta Link Complete!</h2>
              <p className="text-slate-500">Your number is successfully registered with our system.</p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl mt-8 overflow-hidden text-left shadow-sm">
                <div className="p-4 bg-slate-100 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800">Step 3: Recharge Wallet</h3>
                </div>
                <div className="p-6">
                  <p className="text-sm text-slate-600 mb-5">
                    Before you can send live OTPs, you need to add credits to your wallet to cover Meta's messaging fees.
                  </p>
                  <Link href="/dashboard/wallet" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                    Go to Wallet & Billing
                  </Link>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function EmbeddedSetupPage() {
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    // 1. Load Facebook SDK
    const loadFbSdk = () => {
      (window as any).fbAsyncInit = function () {
        (window as any).FB.init({
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "YOUR_APP_ID_HERE",
          cookie: true,
          xfbml: true,
          version: "v19.0",
        });
        setIsSdkLoaded(true);
      };

      (function (d, s, id) {
        let js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) { return; }
        js = d.createElement(s) as any;
        js.id = id;
        (js as any).src = "https://connect.facebook.net/en_US/sdk.js";
        if (fjs && fjs.parentNode) fjs.parentNode.insertBefore(js, fjs);
      })(document, "script", "facebook-jssdk");
    };

    loadFbSdk();
  }, []);

  const handleFbLogin = () => {
    if (!isSdkLoaded) {
      alert("Facebook SDK is still loading. Please wait a moment.");
      return;
    }

    setIsLinking(true);
    setStatusMsg("Opening secure Meta popup...");

    // 2. Trigger WhatsApp Embedded Signup
    (window as any).FB.login(
      (response: any) => {
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;
          setStatusMsg("Authenticated! Linking account securely...");
          
          // 3. Send token to our backend for exchange
          fetch("http://localhost:3001/v1/auth/meta/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              accessToken: accessToken,
              projectId: "demo-project-id" // Hardcoded for demo
            }),
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setStatusMsg("✅ WhatsApp Account linked successfully!");
              setIsLinking(false);
            } else {
              setStatusMsg("❌ Failed to link account: " + data.error);
              setIsLinking(false);
            }
          })
          .catch(err => {
            setStatusMsg("❌ Network error connecting to backend.");
            setIsLinking(false);
          });
          
        } else {
          setStatusMsg("❌ User cancelled login or did not fully authorize.");
          setIsLinking(false);
        }
      },
      {
        scope: "whatsapp_business_messaging,whatsapp_business_management",
        // Temporarily removed `extras: { feature: 'whatsapp_embedded_signup' }`
        // until 'Access Verification' (Tech Provider status) is approved by Meta.
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 mt-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900">Connect Your WhatsApp Number</h1>
        <p className="text-slate-500 text-lg max-w-xl mx-auto">
          Link your WhatsApp Business account in one click. No coding required. We will automatically set up your messaging endpoints and templates.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-10">
        <div className="p-8 text-center space-y-8">
          
          <div className="flex justify-center items-center space-x-6">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center shadow-inner">
              <span className="text-2xl font-bold text-slate-800">OS</span>
            </div>
            <div className="flex space-x-2">
              <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              <div className="w-2 h-2 rounded-full bg-slate-300"></div>
            </div>
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center shadow-inner">
              <svg className="w-8 h-8 text-whatsapp" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-800">Connect with Meta</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              You will be redirected to Facebook to securely authorize your WhatsApp Business account.
            </p>
          </div>

          <div className="space-y-4">
            <button 
              disabled={isLinking || !isSdkLoaded}
              className={`inline-flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-md w-full md:w-auto
                ${(isLinking || !isSdkLoaded) ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#1877F2] hover:bg-[#166FE5] text-white hover:shadow-lg'}`}
              onClick={handleFbLogin}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              <span>{isLinking ? "Connecting..." : "Login with Facebook"}</span>
            </button>
            
            {statusMsg && (
              <p className={`text-sm font-medium ${statusMsg.includes('❌') ? 'text-red-600' : 'text-slate-600'}`}>
                {statusMsg}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

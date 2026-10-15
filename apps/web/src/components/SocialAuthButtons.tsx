"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";

interface SocialAuthButtonsProps {
  onError: (err: string) => void;
  onLoading: (loading: boolean) => void;
  loading: boolean;
}

export default function SocialAuthButtons({ onError, onLoading, loading }: SocialAuthButtonsProps) {
  const router = useRouter();
  const [googleClientReady, setGoogleClientReady] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [manualClientId, setManualClientId] = useState("");

  const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "1831033178050637";
  const envGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  // Initialize Meta SDK
  const initFb = () => {
    if (typeof window !== "undefined" && (window as any).FB) {
      (window as any).FB.init({
        appId: fbAppId,
        cookie: true,
        xfbml: true,
        version: "v19.0"
      });
    }
  };

  useEffect(() => {
    initFb();
  }, []);

  // Initialize Google SDK
  const initGoogle = () => {
    if (typeof window !== "undefined" && (window as any).google) {
      setGoogleClientReady(true);
    }
  };

  const handleAuthSuccess = (data: any) => {
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("projectId", data.projectId);
    localStorage.setItem("organizationId", data.organizationId);
    router.push("/dashboard/setup");
  };

  // 1. Meta / Facebook Login
  const handleMetaLogin = () => {
    onError("");
    if (typeof window === "undefined" || !(window as any).FB) {
      return onError("Facebook SDK is still loading. Please wait 2 seconds and try again.");
    }

    onLoading(true);
    (window as any).FB.login((response: any) => {
      if (response.authResponse && response.authResponse.accessToken) {
        fetch(`${getApiUrl()}/v1/auth/meta`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: response.authResponse.accessToken })
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              handleAuthSuccess(data);
            } else {
              onError(data.error || "Meta authentication failed");
              onLoading(false);
            }
          })
          .catch((err) => {
            onError(err.message || "Network error connecting to Meta");
            onLoading(false);
          });
      } else {
        onLoading(false);
      }
    }, { scope: "public_profile,email" });
  };

  // 2. Google Login
  const triggerGoogleOAuth = (clientId: string) => {
    if (!clientId) {
      setShowGoogleModal(true);
      return;
    }

    try {
      if (!(window as any).google?.accounts?.oauth2) {
        onError("Google Sign-In is still loading. Please try again in a moment.");
        return;
      }

      onLoading(true);
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "email profile openid",
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            onError(tokenResponse.error_description || "Google sign-in was cancelled");
            onLoading(false);
            return;
          }

          try {
            const res = await fetch(`${getApiUrl()}/v1/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ accessToken: tokenResponse.access_token })
            });
            const data = await res.json();
            if (data.success) {
              handleAuthSuccess(data);
            } else {
              onError(data.error || "Google sign-in failed");
            }
          } catch (e: any) {
            onError(e.message || "Failed to authenticate with Google");
          } finally {
            onLoading(false);
          }
        }
      });

      client.requestAccessToken();
    } catch (e: any) {
      onError("Google initialization error: " + e.message);
      onLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    onError("");
    const clientId = envGoogleClientId || (typeof window !== "undefined" ? localStorage.getItem("temp_google_client_id") || "" : "");
    if (!clientId) {
      setShowGoogleModal(true);
    } else {
      triggerGoogleOAuth(clientId);
    }
  };

  const handleSaveGoogleClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualClientId.trim()) return;
    localStorage.setItem("temp_google_client_id", manualClientId.trim());
    setShowGoogleModal(false);
    triggerGoogleOAuth(manualClientId.trim());
  };

  return (
    <>
      <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="lazyOnload" onLoad={initFb} />
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" onLoad={initGoogle} />

      <div className="space-y-3">
        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl shadow-xs transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-sm">Continue with Google</span>
        </button>

        {/* Meta / Facebook Sign In Button */}
        <button
          type="button"
          onClick={handleMetaLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-[#0866FF] hover:bg-[#0756d6] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition disabled:opacity-50"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="text-sm">Continue with Meta</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-200"></div>
        <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          or continue with email
        </span>
        <div className="flex-grow border-t border-slate-200"></div>
      </div>

      {/* Google Client ID Modal (If not set in env) */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900">Google OAuth Setup</h3>
              <button onClick={() => setShowGoogleModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              To enable 1-click Google Sign-In, please provide your <strong>Google OAuth Client ID</strong> from Google Cloud Console.
            </p>
            <form onSubmit={handleSaveGoogleClientId} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase">Google Client ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                  value={manualClientId}
                  onChange={(e) => setManualClientId(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="px-3.5 py-1.5 border rounded-lg text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Save & Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

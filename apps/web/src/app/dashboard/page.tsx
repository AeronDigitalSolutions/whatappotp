"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api";

export default function DashboardOverview() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [waData, setWaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pid = localStorage.getItem("projectId");
    if (pid) {
      setProjectId(pid);
      fetch(`${getApiUrl()}/v1/project/${pid}`)
        .then(res => res.json())
        .then(async data => {
          if (data.success) {
            setProject(data.project);
            
            if (data.project.metaAccessToken && data.project.metaWabaId && data.project.metaPhoneId) {
              try {
                const [wabaRes, phoneRes] = await Promise.all([
                  fetch(`https://graph.facebook.com/v19.0/${data.project.metaWabaId}?access_token=${data.project.metaAccessToken}`),
                  fetch(`https://graph.facebook.com/v19.0/${data.project.metaPhoneId}?access_token=${data.project.metaAccessToken}`)
                ]);
                
                const wabaInfo = await wabaRes.json();
                const phoneInfo = await phoneRes.json();
                
                setWaData({
                  wabaName: wabaInfo.name,
                  phoneName: phoneInfo.verified_name || "Unknown",
                  phoneNumber: phoneInfo.display_phone_number,
                  quality: phoneInfo.quality_rating,
                  status: phoneInfo.code_verification_status
                });
              } catch (e) {
                console.error("Failed to fetch WA data", e);
              }
            }
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="text-slate-500">Your OTP metrics for the last 30 days.</p>
      </div>

      {!loading && waData && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-100 shadow-sm mb-8">
          <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 p-2 rounded-full">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-900">WhatsApp API Connected</h2>
              <p className="text-sm text-emerald-700">Your SaaS is ready to send automated messages.</p>
            </div>
          </div>
          <a href="/dashboard/setup" className="text-sm font-medium bg-white border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-50 transition shadow-sm">
            Change / Manage Connection
          </a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Business Portfolio</span>
              <p className="mt-1 font-medium text-slate-900">{waData.wabaName}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Phone Number</span>
              <p className="mt-1 font-medium text-slate-900 text-lg">{waData.phoneNumber}</p>
              <p className="text-xs text-slate-500 mt-1">{waData.phoneName}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</span>
              <p className="mt-1 font-medium text-slate-900">
                {waData.status === 'NOT_VERIFIED' ? (
                  <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-bold">Unverified / Sandbox</span>
                ) : (
                  <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">{waData.status}</span>
                )}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quality Rating</span>
              <p className="mt-1 font-medium text-slate-900">
                <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold">{waData.quality}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !waData && project?.metaAccessToken && (
        <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 shadow-sm mb-8">
           <h2 className="text-xl font-bold text-orange-900">Finish Setup</h2>
           <p className="text-orange-800 mt-2">You haven't selected your WhatsApp phone number yet. Head over to the Setup Guide to connect your account.</p>
        </div>
      )}
      
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

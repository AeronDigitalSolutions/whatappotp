"use client";

import { useState } from "react";
import Link from "next/link";

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState("");
  const [testPhone, setTestPhone] = useState("");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg mb-6">
          <span className="text-2xl font-bold text-white">OS</span>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900">
          Set up your account
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Step {step} of 4
        </p>
        
        {/* Progress bar */}
        <div className="mt-4 flex justify-center space-x-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-2 w-12 rounded-full ${step >= i ? 'bg-whatsapp' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          
          {/* STEP 1: Organization Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-slate-800">Welcome! Let's create your workspace</h3>
                <p className="text-slate-500 mt-2">What is the name of your company or product?</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Organization Name</label>
                <div className="mt-1">
                  <input 
                    type="text" 
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corp" 
                    className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-whatsapp focus:border-whatsapp sm:text-sm" 
                  />
                </div>
              </div>
              <button 
                onClick={() => setStep(2)}
                disabled={!orgName}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 transition-colors"
              >
                Create Workspace
              </button>
            </div>
          )}

          {/* STEP 2: Connect Meta */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-slate-800">Connect your WhatsApp</h3>
                <p className="text-slate-500 mt-2">Link your Meta account to start sending messages.</p>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <svg className="w-12 h-12 text-whatsapp mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                <button className="bg-[#1877F2] hover:bg-[#166FE5] text-white px-6 py-3 rounded-md font-bold transition-colors mb-2 w-full">
                  Login with Facebook
                </button>
                <p className="text-xs text-slate-500">Fast, secure Embedded Signup.</p>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 text-sm font-medium">Back</button>
                <button onClick={() => setStep(3)} className="text-whatsapp hover:text-whatsapp-dark text-sm font-bold">Skip for now &rarr;</button>
              </div>
            </div>
          )}

          {/* STEP 3: Send Test Message */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-slate-800">Send a Test OTP</h3>
                <p className="text-slate-500 mt-2">Let's verify everything is working.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700">Your Phone Number</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                    +
                  </span>
                  <input 
                    type="text" 
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="1234567890" 
                    className="flex-1 min-w-0 block w-full px-3 py-3 border border-slate-300 rounded-none rounded-r-md focus:ring-whatsapp focus:border-whatsapp sm:text-sm" 
                  />
                </div>
              </div>

              <button 
                onClick={() => alert('OTP Sent! (Mock)')}
                className="w-full flex justify-center py-3 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Send Test Message
              </button>

              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-800 text-sm font-medium">Back</button>
                <button onClick={() => setStep(4)} className="text-whatsapp hover:text-whatsapp-dark text-sm font-bold">Next Step &rarr;</button>
              </div>
            </div>
          )}

          {/* STEP 4: API Keys & Code Snippets */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-slate-800">You're all set!</h3>
                <p className="text-slate-500 mt-2">Here is your first API key. Keep it secret.</p>
              </div>
              
              <div className="bg-slate-900 rounded-lg p-4 relative">
                <code className="text-green-400 text-sm break-all font-mono">
                  live_a7f293b18c049d8e7f6a5b4c3d2e1f0a
                </code>
                <button className="absolute top-3 right-3 text-slate-400 hover:text-white">
                  Copy
                </button>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Example Integration (Node.js)</p>
                <div className="bg-slate-100 rounded-lg p-4 overflow-x-auto text-xs font-mono text-slate-700 border border-slate-200">
                  <pre>{`fetch('https://api.otpsaas.com/v1/otp/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer live_a7f2...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phone: '+1234567890'
  })
});`}</pre>
                </div>
              </div>

              <div className="pt-4">
                <Link 
                  href="/dashboard"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-whatsapp hover:bg-whatsapp-dark transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

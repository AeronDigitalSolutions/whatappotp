"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { getApiUrl } from "@/lib/api";
import { useModal } from "@/context/ModalContext";

export default function WalletPage() {
  const { showSuccess, showError, showWarning } = useModal();
  const [balance, setBalance] = useState<string>("0.00");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<number>(500);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("organizationId") || "demo-org-id" : "demo-org-id";
  const userJson = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = userJson ? JSON.parse(userJson) : null;

  const loadWallet = async () => {
    try {
      const res = await fetch(`${getApiUrl()}/v1/wallet/${orgId}`);
      const data = await res.json();
      if (data.success && data.wallet) {
        setBalance(Number(data.wallet.balance).toFixed(2));
        if (data.wallet.transactions) {
          setTransactions(data.wallet.transactions.map((t: any) => ({
            id: t.id,
            type: t.type,
            amount: `${t.amount > 0 ? '+' : ''}₹${Math.abs(Number(t.amount)).toFixed(2)}`,
            desc: t.description || (t.type === 'credit' ? 'Wallet Top-up' : 'Message charge'),
            date: new Date(t.createdAt).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })
          })));
        }
      }
    } catch (e) {
      console.error("Failed to load wallet", e);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [orgId]);

  const handleTopUp = async () => {
    if (amount < 100) return showWarning("Minimum wallet recharge amount is ₹100.", "Minimum Top-up");
    
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/billing/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, organizationId: orgId })
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.error);

      const options = {
        key: data.keyId || "rzp_live_Tl4uH3gYo8IWeO",
        amount: data.amount,
        currency: "INR",
        name: "OTP SaaS",
        description: "Wallet Credit Recharge",
        order_id: data.orderId,
        handler: function (response: any) {
          showSuccess(`Your payment of ₹${amount} was successful!\n\nTransaction ID: ${response.razorpay_payment_id}\nYour wallet balance has been updated.`, "Payment Received");
          setBalance((prev) => (parseFloat(prev) + amount).toFixed(2));
          setTransactions(prev => [
            { id: response.razorpay_payment_id, type: "credit", amount: `+₹${amount}.00`, desc: "Razorpay Wallet Top-up", date: "Just now" },
            ...prev
          ]);
          // Reload real wallet from server
          setTimeout(loadWallet, 2000);
        },
        prefill: {
          name: user?.name || "Customer",
          email: user?.email || "customer@example.com",
          contact: "9999999999"
        },
        theme: { color: "#0f172a" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        showError("Payment Failed: " + response.error.description, "Payment Error");
      });
      rzp.open();
      
    } catch (err: any) {
      showError("Failed to initiate payment: " + err.message, "Recharge Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold text-slate-900">Wallet & Billing</h1>
          <p className="text-slate-500 text-lg">Manage your credits and view transaction history.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Balance Card */}
          <div className="col-span-1 md:col-span-1 bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-slate-500 font-medium mb-1">Current Balance</h3>
              <div className="text-4xl font-extrabold text-slate-900">₹{balance}</div>
            </div>
            
            <div className="mt-6 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 font-bold text-slate-900"
                  min="100"
                />
              </div>
              <button 
                onClick={handleTopUp}
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? "Processing..." : "Add Credits"}
              </button>
            </div>
          </div>

          {/* Pricing Info Card */}
          <div className="col-span-1 md:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Pricing Rules</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600 font-medium flex items-center">🇮🇳 India (+91) - Authentication / OTP</span>
                <span className="font-bold text-slate-900">₹0.50 / message</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600 font-medium flex items-center">🇮🇳 India (+91) - Marketing & Promo</span>
                <span className="font-bold text-slate-900">₹1.00 / message</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-600 font-medium flex items-center">🇺🇸 United States (+1) - Utility & Alerts</span>
                <span className="font-bold text-slate-900">₹1.20 / message</span>
              </div>
              <p className="text-xs text-slate-500 mt-4">
                Charges are automatically deducted when an OTP or campaign message is dispatched. If your balance drops to ₹0, dispatch stops automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-8">
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Transaction History</h3>
            <button onClick={loadWallet} className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline">Refresh</button>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No transactions yet. Add credits to get started.</div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${tx.type === 'credit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {tx.type === 'credit' ? '↓' : '↑'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{tx.desc}</p>
                      <p className="text-xs text-slate-500">{tx.date}</p>
                    </div>
                  </div>
                  <div className={`font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-slate-900'}`}>
                    {tx.amount}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/api";
import { ALL_MODULES } from "@/context/PermissionContext";
import {
  TeamIcon,
  Shield2DIcon,
  SparklesIcon,
  Plus2DIcon,
  User2DIcon,
  Close2DIcon,
  CheckCircle2DIcon,
  InboxIcon,
  BotIcon,
  ShoppingBagIcon,
  CampaignIcon,
  TemplateIcon,
  PhoneRoutingIcon,
  ShieldCheckIcon,
  AuditLogsIcon,
  WalletIcon,
  PricingAdminIcon,
  KeyIcon,
  SettingsIcon,
  SuperAdminIcon
} from "@/components/Icons";

interface TeamMember {
  membershipId: string;
  userId: string;
  baseRole: string;
  roleId: string | null;
  joinedAt: string;
  name: string;
  email: string;
  customRoleName: string | null;
  rolePermissions: string[];
  roleDescription: string | null;
}

interface OrgRole {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemDefault: boolean;
  createdAt: string;
}

// 2D Vector Icon helper for module tags
function getModule2DIcon(moduleKey: string) {
  switch (moduleKey) {
    case "inbox":
      return <InboxIcon className="w-3.5 h-3.5" />;
    case "automations":
      return <BotIcon className="w-3.5 h-3.5" />;
    case "ecommerce":
      return <ShoppingBagIcon className="w-3.5 h-3.5" />;
    case "campaigns":
      return <CampaignIcon className="w-3.5 h-3.5" />;
    case "templates":
      return <TemplateIcon className="w-3.5 h-3.5" />;
    case "numbers":
      return <PhoneRoutingIcon className="w-3.5 h-3.5" />;
    case "green-tick":
      return <ShieldCheckIcon className="w-3.5 h-3.5" />;
    case "logs":
      return <AuditLogsIcon className="w-3.5 h-3.5" />;
    case "wallet":
      return <WalletIcon className="w-3.5 h-3.5" />;
    case "pricing_admin":
      return <PricingAdminIcon className="w-3.5 h-3.5" />;
    case "api_keys":
      return <KeyIcon className="w-3.5 h-3.5" />;
    case "settings":
      return <SettingsIcon className="w-3.5 h-3.5" />;
    case "team":
      return <TeamIcon className="w-3.5 h-3.5" />;
    case "super_admin":
      return <SuperAdminIcon className="w-3.5 h-3.5" />;
    default:
      return <Shield2DIcon className="w-3.5 h-3.5" />;
  }
}

export default function TeamPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"members" | "roles">("members");

  // Plan and Seat Capacity Info
  const [planInfo, setPlanInfo] = useState<{
    plan: string;
    seatsAllowed: number;
    extraSeats: number;
    totalSeats: number;
    usedSeats: number;
  }>({
    plan: "BASIC",
    seatsAllowed: 4,
    extraSeats: 0,
    totalSeats: 4,
    usedSeats: 1
  });

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRoleId, setInviteRoleId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Role Edit/Create Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState("");
  const [roleFormDesc, setRoleFormDesc] = useState("");
  const [roleFormPerms, setRoleFormPerms] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);

  // Change Role Modal
  const [changeRoleMember, setChangeRoleMember] = useState<TeamMember | null>(null);
  const [selectedNewRoleId, setSelectedNewRoleId] = useState("");

  // Status feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async (orgId: string) => {
    setLoading(true);
    try {
      const [membersRes, rolesRes] = await Promise.all([
        fetch(`${getApiUrl()}/v1/team/${orgId}`),
        fetch(`${getApiUrl()}/v1/roles/${orgId}`)
      ]);

      const [membersData, rolesData] = await Promise.all([
        membersRes.json(),
        rolesRes.json()
      ]);

      if (membersData.success) {
        setMembers(membersData.members || []);
        if (membersData.plan) {
          setPlanInfo({
            plan: membersData.plan,
            seatsAllowed: membersData.seatsAllowed || (membersData.plan === "TRIAL" ? 1 : membersData.plan === "PROFESSIONAL" ? 6 : 4),
            extraSeats: membersData.extraSeats || 0,
            totalSeats: membersData.totalSeats || 4,
            usedSeats: membersData.usedSeats || (membersData.members?.length || 1)
          });
        }
      }
      if (rolesData.success) setRoles(rolesData.roles || []);
    } catch (err) {
      console.error("Failed to load team data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let orgId = typeof window !== "undefined" ? localStorage.getItem("organizationId") : null;
    if (!orgId) {
      const userJson = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (userJson) {
        try {
          const u = JSON.parse(userJson);
          orgId = u.organizationId || null;
        } catch {}
      }
    }

    if (orgId) {
      setOrganizationId(orgId);
      loadData(orgId);
    } else {
      setLoading(false);
    }
  }, []);

  // Handle Invite Member
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/team/invite/${organizationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || "Colleague",
          roleId: inviteRoleId || null
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Team member added!");
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteName("");
        setInviteRoleId("");
        loadData(organizationId);
      } else {
        alert(data.error || "Failed to invite member");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle Save Role (Create or Edit)
  const handleRoleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !roleFormName.trim()) return;

    setRoleSaving(true);
    try {
      const res = await fetch(`${getApiUrl()}/v1/roles/${organizationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: editingRoleId || undefined,
          name: roleFormName.trim(),
          description: roleFormDesc.trim(),
          permissions: roleFormPerms
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Role saved successfully!");
        setShowRoleModal(false);
        setEditingRoleId(null);
        setRoleFormName("");
        setRoleFormDesc("");
        setRoleFormPerms([]);
        loadData(organizationId);
      } else {
        alert(data.error || "Failed to save role");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setRoleSaving(false);
    }
  };

  // Handle Delete Role
  const handleDeleteRole = async (roleId: string) => {
    if (!organizationId) return;
    if (!confirm("Are you sure you want to delete this custom role? Members with this role will revert to default permissions.")) return;

    try {
      const res = await fetch(`${getApiUrl()}/v1/roles/${organizationId}/${roleId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        showToast("Role deleted successfully.");
        loadData(organizationId);
      } else {
        alert(data.error || "Failed to delete role");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Handle Change Member Role
  const handleChangeRoleSubmit = async () => {
    if (!changeRoleMember) return;
    try {
      const res = await fetch(`${getApiUrl()}/v1/team/member/${changeRoleMember.membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selectedNewRoleId || null })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Member role updated!");
        setChangeRoleMember(null);
        if (organizationId) loadData(organizationId);
      } else {
        alert(data.error || "Failed to update member role");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (membershipId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from this workspace?`)) return;

    try {
      const res = await fetch(`${getApiUrl()}/v1/team/member/${membershipId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        showToast("Member removed from workspace.");
        if (organizationId) loadData(organizationId);
      } else {
        alert(data.error || "Failed to remove member");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const openCreateRoleModal = () => {
    setEditingRoleId(null);
    setRoleFormName("");
    setRoleFormDesc("");
    setRoleFormPerms(["inbox", "templates"]);
    setShowRoleModal(true);
  };

  const openEditRoleModal = (role: OrgRole) => {
    setEditingRoleId(role.id);
    setRoleFormName(role.name);
    setRoleFormDesc(role.description || "");
    setRoleFormPerms(role.permissions || []);
    setShowRoleModal(true);
  };

  const toggleFormPerm = (moduleKey: string) => {
    setRoleFormPerms((prev) =>
      prev.includes(moduleKey) ? prev.filter((k) => k !== moduleKey) : [...prev, moduleKey]
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-slate-700">
          <SparklesIcon className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/90">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/90 flex items-center justify-center text-indigo-700 shrink-0 font-bold shadow-2xs">
            <TeamIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                {members.length} Team Member{members.length !== 1 ? "s" : ""} • {roles.length} Custom Role{roles.length !== 1 ? "s" : ""}
              </span>
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {planInfo.plan} Plan: {members.length} / {planInfo.totalSeats} Seats Used
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {planInfo.seatsAllowed} seat(s) included {planInfo.extraSeats ? `+ ${planInfo.extraSeats} add-ons` : ""} • Extra seats at ₹500/mo
            </p>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={openCreateRoleModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <SparklesIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Create Custom Role</span>
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus2DIcon className="w-3.5 h-3.5" />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

      {/* Seat Limit Warning Banner */}
      {members.length >= planInfo.totalSeats && planInfo.plan !== "ENTERPRISE" && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <span className="font-bold">Team Seat Limit Reached ({members.length}/{planInfo.totalSeats}): </span>
              <span>All seats for your {planInfo.plan} plan are allocated. Add extra team seats for ₹500/month or upgrade your plan.</span>
            </div>
          </div>
          <a
            href="/dashboard/wallet"
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold transition text-xs shrink-0 text-center"
          >
            + Add Seats in Wallet ➔
          </a>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 inline-flex items-center gap-1.5 shadow-2xs">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === "members"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <TeamIcon className="w-4 h-4" />
          <span>Team Members ({members.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === "roles"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Shield2DIcon className="w-4 h-4" />
          <span>Roles & Permissions ({roles.length})</span>
        </button>
      </div>

      {/* Tab 1: Team Members List */}
      {activeTab === "members" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Workspace Members</h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Colleagues with access to this business workspace and their assigned module powers.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100/90 border border-slate-200 px-3 py-1 rounded-lg">
              {members.length} Total Users
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Colleague</th>
                  <th className="py-3.5 px-5">Assigned Role</th>
                  <th className="py-3.5 px-5">Active Module Powers</th>
                  <th className="py-3.5 px-5">Joined Workspace</th>
                  <th className="py-3.5 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                      No members added yet. Click &quot;Invite Member&quot; above to add colleagues.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => {
                    const isOwner = m.baseRole === "owner";
                    return (
                      <tr key={m.membershipId} className="hover:bg-slate-50/70 transition">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center font-extrabold text-indigo-700 text-xs shrink-0 shadow-2xs">
                              {(m.name || m.email || "U").charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                <span>{m.name || "Colleague"}</span>
                                {isOwner && (
                                  <span className="text-[10px] uppercase font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{m.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-5">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isOwner
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : m.customRoleName
                              ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            <Shield2DIcon className="w-3.5 h-3.5" />
                            <span>{m.customRoleName || (isOwner ? "Company Owner" : "Member")}</span>
                          </div>
                          {m.roleDescription && (
                            <div className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-xs font-medium">
                              {m.roleDescription}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-5">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>All Modules Unrestricted</span>
                            </span>
                          ) : m.rolePermissions && m.rolePermissions.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {m.rolePermissions.map((p) => {
                                const modDef = ALL_MODULES.find((mod) => mod.key === p);
                                return (
                                  <span
                                    key={p}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100/90 text-slate-700 border border-slate-200/80 px-2 py-0.5 rounded-md"
                                  >
                                    {getModule2DIcon(p)}
                                    <span>{modDef?.label || p}</span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Default View Access</span>
                          )}
                        </td>

                        <td className="py-4 px-5 text-slate-600 text-xs font-medium">
                          {new Date(m.joinedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>

                        <td className="py-4 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setChangeRoleMember(m);
                                setSelectedNewRoleId(m.roleId || "");
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-xl transition shadow-2xs cursor-pointer"
                            >
                              Change Role
                            </button>
                            {!isOwner && (
                              <button
                                onClick={() => handleRemoveMember(m.membershipId, m.email)}
                                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition cursor-pointer"
                                title="Remove member"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Custom Roles & Powers Manager */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs hover:border-slate-300 flex flex-col justify-between space-y-4 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 tracking-tight">{r.name}</h3>
                      <p className="text-xs text-slate-600 font-medium mt-1 min-h-[32px] leading-relaxed">
                        {r.description || "Custom configured workspace role."}
                      </p>
                    </div>
                    {r.isSystemDefault ? (
                      <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full shrink-0">
                        Default
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full shrink-0">
                        Custom
                      </span>
                    )}
                  </div>

                  {/* Modules Tagged */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2.5">
                      Permitted Modules ({r.permissions.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {r.permissions.map((p) => {
                        const modDef = ALL_MODULES.find((m) => m.key === p);
                        return (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg"
                          >
                            {getModule2DIcon(p)}
                            <span>{modDef?.label || p}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditRoleModal(r)}
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-2xs cursor-pointer"
                  >
                    Edit Powers
                  </button>
                  {!r.isSystemDefault && (
                    <button
                      onClick={() => handleDeleteRole(r.id)}
                      className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition cursor-pointer"
                      title="Delete Role"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal 1: Invite Team Member */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleInviteSubmit}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                  <User2DIcon className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">Invite Team Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <Close2DIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Colleague Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Email Address <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Assign Initial Role</label>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800 text-xs"
                >
                  <option value="">Default Member (Standard Access)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.permissions.length} modules)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-5 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {inviteLoading ? "Adding..." : "Add Team Member"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Create / Edit Custom Role */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <form
            onSubmit={handleRoleSave}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                  <Shield2DIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {editingRoleId ? "Edit Role Powers" : "Create New Custom Role"}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Name any role and assign granular module permissions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <Close2DIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Role Title / Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Customer Support Lead, Catalog Editor"
                    value={roleFormName}
                    onChange={(e) => setRoleFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Brief description of job powers"
                    value={roleFormDesc}
                    onChange={(e) => setRoleFormDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Module Checkbox Grid */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-extrabold text-slate-800 text-xs">
                    Permitted Dashboard Modules ({roleFormPerms.length} selected)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRoleFormPerms(ALL_MODULES.filter(m => m.key !== "super_admin").map(m => m.key))}
                      className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFormPerms([])}
                      className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
                  {ALL_MODULES.filter(m => m.key !== "super_admin").map((mod) => {
                    const isChecked = roleFormPerms.includes(mod.key);
                    return (
                      <label
                        key={mod.key}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                          isChecked
                            ? "bg-indigo-50/80 border-indigo-200 text-indigo-950 font-semibold"
                            : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFormPerm(mod.key)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700">{getModule2DIcon(mod.key)}</span>
                        <span className="text-xs font-bold">{mod.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={roleSaving}
                className="px-5 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {roleSaving ? "Saving Role..." : editingRoleId ? "Update Role" : "Create Role"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Change Member Role */}
      {changeRoleMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-slate-900">Change Member Role</h3>
              <button
                onClick={() => setChangeRoleMember(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <Close2DIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Select a new role for <strong className="text-slate-900">{changeRoleMember.name || changeRoleMember.email}</strong>:
            </p>

            <select
              value={selectedNewRoleId}
              onChange={(e) => setSelectedNewRoleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Default Member (Standard Access)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.permissions.length} modules)
                </option>
              ))}
            </select>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                onClick={() => setChangeRoleMember(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeRoleSubmit}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

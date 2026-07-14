"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";

interface Patient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  patient_category: string;
  village: string;
  district: string;
  created_at: string;
  registration_completed_at: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function hasAnyPermission(permissions: string[], needed: string[]): boolean {
  return needed.some((p) => permissions.includes(p));
}

function RoleActions({
  roles,
  permissions,
}: {
  roles: string[];
  permissions: string[];
}) {
  const isReceptionist = roles.includes("Receptionist") || hasAnyPermission(permissions, ["registration.create"]);
  const isNurse = roles.includes("Nurse") || hasAnyPermission(permissions, ["triage.create"]);
  const isClinician = roles.includes("Doctor") || roles.includes("Clinical Officer") || hasAnyPermission(permissions, ["consultation.create"]);
  const isLab = roles.includes("Lab Technician") || hasAnyPermission(permissions, ["lab.view_results"]);
  const isRadiographer = roles.includes("Radiographer") || hasAnyPermission(permissions, ["imaging.view"]);
  const isPharmacist = roles.includes("Pharmacist") || hasAnyPermission(permissions, ["prescription.view"]);
  const isBilling = roles.includes("Billing Officer") || hasAnyPermission(permissions, ["billing.view"]);
  const isAdmin = roles.includes("Administrator") || roles.includes("Super Admin") || hasAnyPermission(permissions, ["user.manage"]);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {isReceptionist && (
        <>
          <Link
            href="/patients/register"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-clinical-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-clinical-primary/10 flex items-center justify-center text-clinical-primary group-hover:bg-clinical-primary group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-clinical-primary transition-colors">Standard Registration</p>
              <p className="text-xs text-gray-500 truncate">Register a new patient</p>
            </div>
          </Link>
          <Link
            href="/patients/register?emergency=true"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-amber-400/60 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-amber-700 transition-colors">Emergency Registration</p>
              <p className="text-xs text-gray-500 truncate">Quick intake for emergency cases</p>
            </div>
          </Link>
          <Link
            href="/patients"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-clinical-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Find Patient</p>
              <p className="text-xs text-gray-500 truncate">Search existing patient records</p>
            </div>
          </Link>
        </>
      )}

      {isNurse && (
        <>
          <Link
            href="/triage"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-clinical-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Triage Queue</p>
              <p className="text-xs text-gray-500 truncate">Prioritise and assess patients</p>
            </div>
          </Link>
          <Link
            href="/patients"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-clinical-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Find Patient</p>
              <p className="text-xs text-gray-500 truncate">Search and record vitals</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded border border-amber-200">
            <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center text-amber-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">NEWS2 Alerts</p>
              <p className="text-xs text-amber-700">Alerts & escalations appear here</p>
            </div>
          </div>
        </>
      )}

      {isClinician && (
        <>
          <Link
            href="/patients"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-clinical-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-clinical-primary/10 flex items-center justify-center text-clinical-primary group-hover:bg-clinical-primary group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-clinical-primary transition-colors">My Patients</p>
              <p className="text-xs text-gray-500 truncate">Open patient records and consult</p>
            </div>
          </Link>
          <Link
            href="/patients"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-teal-400/60 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-teal-700 transition-colors">New Consultation</p>
              <p className="text-xs text-gray-500 truncate">SOAP notes, diagnosis, orders</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded border border-blue-200">
            <div className="w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center text-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900">Pending Results</p>
              <p className="text-xs text-blue-700">Lab and imaging results appear here</p>
            </div>
          </div>
        </>
      )}

      {isLab && (
        <>
          <Link
            href="/lab"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-indigo-400/60 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">Lab Queue</p>
              <p className="text-xs text-gray-500 truncate">View pending test requests</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded border border-red-200">
            <div className="w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">Critical Results</p>
              <p className="text-xs text-red-700">Flagged results appear here</p>
            </div>
          </div>
        </>
      )}

      {isRadiographer && (
        <>
          <Link
            href="/patients"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-sky-400/60 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-sky-700 transition-colors">Imaging Requests</p>
              <p className="text-xs text-gray-500 truncate">Pending radiology studies</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 rounded border border-yellow-200">
            <div className="w-10 h-10 rounded-lg bg-yellow-200 flex items-center justify-center text-yellow-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-yellow-900">Safety Checks</p>
              <p className="text-xs text-yellow-700">Pregnancy & contrast allergy checks</p>
            </div>
          </div>
        </>
      )}

      {isPharmacist && (
        <>
          <Link
            href="/pharmacy"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-emerald-400/60 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">Prescriptions</p>
              <p className="text-xs text-gray-500 truncate">Verify and dispense medications</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 rounded border border-rose-200">
            <div className="w-10 h-10 rounded-lg bg-rose-200 flex items-center justify-center text-rose-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-900">Drug Alerts</p>
              <p className="text-xs text-rose-700">Allergy & interaction checks</p>
            </div>
          </div>
        </>
      )}

      {isBilling && (
        <>
          <Link
            href="/billing"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-clinical-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-clinical-primary/10 flex items-center justify-center text-clinical-primary group-hover:bg-clinical-primary group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-clinical-primary transition-colors">New Bill</p>
              <p className="text-xs text-gray-500 truncate">Create charges for a patient</p>
            </div>
          </Link>
          <Link
            href="/patients"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-clinical-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Patient Account</p>
              <p className="text-xs text-gray-500 truncate">View account and payment history</p>
            </div>
          </Link>
        </>
      )}

      {isAdmin && (
        <>
          <Link
            href="/admin"
            className="group flex items-center gap-3 px-4 py-3 bg-white rounded border border-[#becab7]/50 hover:border-clinical-primary/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-clinical-primary/10 flex items-center justify-center text-clinical-primary group-hover:bg-clinical-primary group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 group-hover:text-clinical-primary transition-colors">User Management</p>
              <p className="text-xs text-gray-500 truncate">Manage staff accounts and roles</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded border border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Audit & Reports</p>
              <p className="text-xs text-gray-500">System activity and performance</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function RoleMetrics({ patients, loading }: { patients: Patient[]; loading: boolean }) {
  const { user } = useAuth();
  const roles = user?.roles || [];

  const today = new Date().toISOString().split("T")[0];
  const registeredToday = patients.filter((p) => p.created_at.startsWith(today)).length;
  const incompleteReg = patients.filter((p) => !p.registration_completed_at).length;

  if (roles.includes("Receptionist") || roles.includes("Nurse")) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Registered Today</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : registeredToday}</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Incomplete Intake</dt>
          <dd className={`text-4xl font-extrabold font-mono ${incompleteReg > 0 ? "text-yellow-600" : "text-[#1b1c1c]"}`}>
            {loading ? "..." : incompleteReg}
          </dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Queue</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : patients.length}</dd>
        </div>
      </section>
    );
  }

  if (roles.includes("Doctor") || roles.includes("Clinical Officer")) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Today&apos;s Encounters</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Pending Orders</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Admissions</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Discharges</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">--</dd>
        </div>
      </section>
    );
  }

  if (roles.includes("Lab Technician")) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Pending Tests</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Completed Today</dt>
          <dd className="text-4xl font-extrabold text-green-600 font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-red-200 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Critical Flags</dt>
          <dd className="text-4xl font-extrabold text-red-600 font-mono">--</dd>
        </div>
      </section>
    );
  }

  if (roles.includes("Pharmacist")) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Pending Verification</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Dispensed Today</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-rose-200 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Drug Alerts</dt>
          <dd className="text-4xl font-extrabold text-rose-600 font-mono">--</dd>
        </div>
      </section>
    );
  }

  if (roles.includes("Billing Officer")) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Bills Today</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Pending Waivers</dt>
          <dd className="text-4xl font-extrabold text-amber-600 font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Payments</dt>
          <dd className="text-4xl font-extrabold text-green-600 font-mono">--</dd>
        </div>
      </section>
    );
  }

  if (roles.includes("Administrator") || roles.includes("Super Admin")) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Active Users</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Patients Today</dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : registeredToday}</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Active Alerts</dt>
          <dd className="text-4xl font-extrabold text-amber-600 font-mono">--</dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">System Uptime</dt>
          <dd className="text-4xl font-extrabold text-green-600 font-mono">99.9%</dd>
        </div>
      </section>
    );
  }

  return null;
}

function RoleLabel({ roles }: { roles: string[] }) {
  if (roles.length === 0) return null;
  const primaryRole = roles[0];
  const roleColors: Record<string, string> = {
    "Super Admin": "bg-purple-100 text-purple-800 border-purple-200",
    Administrator: "bg-gray-100 text-gray-800 border-gray-200",
    Receptionist: "bg-blue-100 text-blue-800 border-blue-200",
    Nurse: "bg-purple-100 text-purple-800 border-purple-200",
    "Clinical Officer": "bg-teal-100 text-teal-800 border-teal-200",
    Doctor: "bg-clinical-primary/10 text-clinical-primary border-clinical-primary/20",
    Pharmacist: "bg-emerald-100 text-emerald-800 border-emerald-200",
    "Lab Technician": "bg-indigo-100 text-indigo-800 border-indigo-200",
    Radiographer: "bg-sky-100 text-sky-800 border-sky-200",
    "Billing Officer": "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleColors[primaryRole] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
      {primaryRole}
    </span>
  );
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const response = await api.get("/patients?per_page=10", token);
        if (response && response.data) {
          setPatients(response.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const staffName = user?.name?.split(" ")[0] || "Staff";
  const roles = user?.roles || [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold text-brand-green tracking-widest uppercase">
              Clinical Workspace
            </span>
            <RoleLabel roles={roles} />
          </div>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">
            {getGreeting()}, {staffName}
          </h1>
          <p className="text-sm text-[#5f5e5e] mt-1 font-mono">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </section>

      <RoleMetrics patients={patients} loading={loading} />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-brand-green rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
        </div>
        <RoleActions roles={roles} permissions={user?.permissions || []} />
      </section>

      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">
            Recent Patient Registrations
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500 font-mono">
            Loading patient records from server...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">
            Error: {error}
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            No patient registrations recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8]">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Hospital Number</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Gender / Category</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Village / District</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Status / Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {patients.map((patient) => {
                  const hasIncompleteReg = !patient.registration_completed_at;
                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-[#fcf9f8]/40 hover:border-l-4 hover:border-brand-green/80 transition-all divide-x divide-gray-100"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {patient.first_name} {patient.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-xs text-gray-500">
                        {patient.hospital_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {patient.gender} &middot; {patient.patient_category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.village || "N/A"}, {patient.district || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-between gap-4">
                          {hasIncompleteReg ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                              Emergency Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Registered
                            </span>
                          )}

                          <div className="flex gap-3">
                            {hasIncompleteReg ? (
                              <Link
                                href={`/patients/register?complete=${patient.id}`}
                                className="text-xs font-bold text-[#0ea5e9] hover:text-[#0288c4] uppercase tracking-wider"
                              >
                                Complete
                              </Link>
                            ) : (
                              <>
                                <Link
                                  href={`/patients/${patient.id}/triage`}
                                  className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider"
                                >
                                  Triage
                                </Link>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/patients/${patient.id}/consultation`}
                                  className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider"
                                >
                                  Consult
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

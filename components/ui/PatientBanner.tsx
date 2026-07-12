"use client";

import React from "react";

export interface Patient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  patient_category: string;
  national_id?: string;
  health_passport_number?: string;
  village?: string;
  traditional_authority?: string;
  district?: string;
}

export interface Allergy {
  id: number;
  allergen: string;
  severity: string;
  reaction?: string;
}

interface PatientBannerProps {
  patient: Patient;
  allergies?: Allergy[];
  allergiesConfirmed?: boolean;
  isPregnant?: boolean;
}

export default function PatientBanner({
  patient,
  allergies = [],
  allergiesConfirmed = false,
  isPregnant = false,
}: PatientBannerProps) {
  const birthDate = new Date(patient.date_of_birth);
  const age = new Date().getFullYear() - birthDate.getFullYear();

  // Allergies banner message logic
  let allergiesBadge;
  if (allergies.length > 0) {
    allergiesBadge = (
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Allergies:</span>
        {allergies.map((a) => (
          <span
            key={a.id}
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase font-mono"
            title={a.reaction || "No reaction specified"}
          >
            {a.allergen} ({a.severity})
          </span>
        ))}
      </div>
    );
  } else if (allergiesConfirmed) {
    allergiesBadge = (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
        NO KNOWN ALLERGIES (NKA)
      </span>
    );
  } else {
    allergiesBadge = (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-700 font-mono">
        <svg className="w-4 h-4 text-yellow-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        ALLERGIES UNCONFIRMED
      </span>
    );
  }

  return (
    <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden shadow-sm font-sans mb-6">
      {/* Top Accent Line */}
      <div className="h-1 bg-brand-green"></div>

      <div className="p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Patient Demographics */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar / Gender Symbol Representation */}
          <div className={`w-12 h-12 rounded flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0 ${
            patient.gender === "Male" ? "bg-sky-600" : patient.gender === "Female" ? "bg-rose-500" : "bg-gray-500"
          }`}>
            {patient.gender === "Male" ? "M" : patient.gender === "Female" ? "F" : "O"}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                {patient.first_name} {patient.last_name}
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                {patient.patient_category}
              </span>
              {isPregnant && patient.gender === "Female" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase font-mono">
                  Active Pregnancy
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5f5e5e] font-mono text-xs">
              <div>
                <span className="text-gray-400 uppercase font-sans font-semibold text-[10px] tracking-wider mr-1">Hospital No:</span>
                <span className="text-gray-900 font-bold">{patient.hospital_number}</span>
              </div>
              <div className="hidden sm:block text-gray-300">|</div>
              <div>
                <span className="text-gray-400 uppercase font-sans font-semibold text-[10px] tracking-wider mr-1">DOB:</span>
                <span className="text-gray-900">
                  {birthDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </span>
                <span className="text-gray-500 ml-1 font-sans">({age} yrs)</span>
              </div>
              {patient.district && (
                <>
                  <div className="hidden sm:block text-gray-300">|</div>
                  <div>
                    <span className="text-gray-400 uppercase font-sans font-semibold text-[10px] tracking-wider mr-1">Location:</span>
                    <span className="text-gray-900 font-sans">{patient.village || "N/A"}, {patient.district}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Summary & Alerts (Right side) */}
        <div className="w-full md:w-auto p-3 bg-[#fcf9f8] rounded border border-gray-100 self-stretch md:self-auto flex flex-col justify-center min-w-[260px]">
          {allergiesBadge}
        </div>
      </div>
    </div>
  );
}

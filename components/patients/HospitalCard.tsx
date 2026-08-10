"use client";

import React, { useState } from "react";
import { Printer, CreditCard, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { getApiBaseUrl } from "@/lib/config";
import type { Patient } from "@/types/patient";

interface HospitalCardProps {
  patient: Patient;
  onClose?: () => void;
}

export default function HospitalCard({ patient, onClose }: HospitalCardProps) {
  const { token } = useAuth();
  const [isFlipped, setIsFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = async () => {
    try {
      setDownloading(true);
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/patients/${patient.id}/card`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patient_card_${patient.hospital_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert("Failed to download patient card PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const dobFormatted = patient.date_of_birth
    ? new Date(patient.date_of_birth).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 bg-background rounded-xl">
      {/* Card Header Actions */}
      <div className="flex items-center justify-between w-full max-w-md">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Card Preview
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            title="Flip Card"
          >
            <RefreshCw className={`h-3.5 w-3.5 transition-transform duration-500 ${isFlipped ? "rotate-180" : ""}`} />
            Flip
          </button>
          <button
            onClick={handlePrint}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-clinical-primary hover:bg-clinical-primary-hover rounded-lg shadow-sm transition-all disabled:opacity-50"
            style={{ backgroundColor: "#0d7c3f" }}
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
            Download PDF
          </button>
        </div>
      </div>

      {/* Interactive preview matching the PDF structure */}
      <div
        className="w-[360px] h-[225px] cursor-pointer group [perspective:1000px] select-none"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full duration-700 ease-out transform-gpu [transform-style:preserve-3d] ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          {/* FRONT SIDE */}
          <div className="absolute inset-0 w-full h-full rounded-xl bg-white text-slate-800 shadow-lg border-2 flex flex-col justify-between overflow-hidden [backface-visibility:hidden]" style={{ borderColor: "#0d7c3f" }}>
            {/* Header info */}
            <div className="text-white p-3 flex justify-between items-center" style={{ backgroundColor: "#0d7c3f" }}>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">ClinOps Medical Center</h4>
                <p className="text-[8px] text-emerald-100 font-medium leading-none mt-0.5">Attendance Identity Pass</p>
              </div>
              <div className="text-[8px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded uppercase">
                Patient
              </div>
            </div>

            {/* Details and Photo Box */}
            <div className="flex gap-4 items-center px-4 py-2 my-auto">
              {/* Photo Box */}
              <div className="w-[68px] h-[82px] border-2 border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase shrink-0">
                Photo
              </div>
              
              {/* Patient Fields */}
              <div className="space-y-1.5 min-w-0">
                <div>
                  <span className="block text-[7px] uppercase tracking-wider text-slate-500 font-bold leading-none">Hospital Number</span>
                  <span className="text-sm font-mono font-bold tracking-wider" style={{ color: "#0d7c3f" }}>
                    {patient.hospital_number || "CO-000000"}
                  </span>
                </div>
                <div>
                  <span className="block text-[7px] uppercase tracking-wider text-slate-500 font-bold leading-none">Full Name</span>
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {patient.first_name} {patient.last_name}
                  </span>
                </div>
                <div className="flex gap-3 text-[9px]">
                  <div>
                    <span className="block text-[7px] uppercase tracking-wider text-slate-500 font-bold leading-none">DOB</span>
                    <span className="font-semibold text-slate-800">{dobFormatted}</span>
                  </div>
                  <div>
                    <span className="block text-[7px] uppercase tracking-wider text-slate-500 font-bold leading-none">Gender</span>
                    <span className="font-semibold text-slate-800">{patient.gender}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center border-t border-slate-200 px-4 py-1.5 text-[8px] text-slate-500 font-semibold uppercase bg-slate-50">
              <span>Category: {patient.patient_category || "General"}</span>
              <span>Issued: {new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          </div>

          {/* BACK SIDE */}
          <div className="absolute inset-0 w-full h-full rounded-xl bg-slate-50 text-slate-700 shadow-lg border-2 flex flex-col justify-between overflow-hidden [transform:rotateY(180deg)] [backface-visibility:hidden]" style={{ borderColor: "#2d3748" }}>
            {/* Magnetic Stripe representation */}
            <div className="w-full h-8 bg-slate-800 mt-3" />

            <div className="px-4 py-2 space-y-1.5 text-[9px] leading-snug">
              <span className="font-bold text-slate-900 block border-b border-slate-200 pb-0.5">
                Emergency Contacts & Info:
              </span>
              <p className="text-slate-600 font-medium">
                • In case of emergency, present this card at triage immediately.<br />
                • Kin: <span className="text-slate-900 font-bold">{patient.guardian_name || "—"}</span> ({patient.guardian_phone || "—"})<br />
                • Phone: {patient.phone || "—"}
              </p>
            </div>

            {/* Faux Barcode Representation */}
            <div className="flex items-end justify-between border-t border-slate-200 px-4 py-2 bg-white">
              <div className="flex flex-col">
                <span className="text-[6px] text-slate-400 uppercase tracking-widest font-bold">Verification Barcode</span>
                <div className="h-5 w-32 mt-0.5 border border-slate-200 p-0.5 rounded flex items-center justify-between">
                  <div className="w-[2px] h-full bg-black" />
                  <div className="w-[1px] h-full bg-black" />
                  <div className="w-[3px] h-full bg-black" />
                  <div className="w-[1px] h-full bg-black" />
                  <div className="w-[2px] h-full bg-black" />
                  <div className="w-[1px] h-full bg-black" />
                  <div className="w-[4px] h-full bg-black" />
                  <div className="w-[1px] h-full bg-black" />
                  <div className="w-[2px] h-full bg-black" />
                  <div className="w-[1px] h-full bg-black" />
                  <div className="w-[3.5px] h-full bg-black" />
                </div>
              </div>
              <div className="text-[6px] text-right text-slate-400 max-w-[120px] leading-tight">
                This card remains property of ClinOps Medical. Return if found.
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        💡 Click on the card to preview the front and back sides.
      </p>
    </div>
  );
}

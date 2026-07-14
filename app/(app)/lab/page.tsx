"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";

export default function LabQueuePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      <div>
        <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Laboratory</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Lab Queue</h1>
        <p className="text-sm text-[#5f5e5e] mt-1">Manage test requests, specimens, and results.</p>
      </div>

      <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-brand-green rounded-full"></div>
            <h2 className="text-lg font-bold text-gray-900">Pending Lab Requests</h2>
          </div>
          <div className="flex gap-2">
            <select className="text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-600 bg-white">
              <option>All Tests</option>
              <option>Blood</option>
              <option>Urine</option>
              <option>Microbiology</option>
            </select>
            <select className="text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-600 bg-white">
              <option>All Priority</option>
              <option>STAT</option>
              <option>Routine</option>
            </select>
          </div>
        </div>
        <div className="p-12 text-center text-sm text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          No pending lab requests.{user ? " Test requests ordered by clinicians will appear here." : ""}
        </div>
      </div>
    </div>
  );
}

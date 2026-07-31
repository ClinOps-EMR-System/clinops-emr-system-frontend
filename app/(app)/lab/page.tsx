"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import { FlaskConical, Search, Clock, AlertTriangle, CheckCircle2, TestTube } from "lucide-react";

interface LabWorklistItem {
  lab_request_id: number;
  patient: { id: number; hospital_number: string; full_name: string };
  encounter_id: number;
  test_name: string;
  loinc_code: string | null;
  specimen_type: string | null;
  status: string;
  ordered_by: string | null;
  ordered_at: string;
  specimen_collected_at: string | null;
}

type TabKey = "ordered" | "collected" | "in_progress" | "released";

const tabs: { key: TabKey; label: string; apiStatus: string; icon: React.ReactNode; color: string }[] = [
  { key: "ordered", label: "Awaiting Collection", apiStatus: "Ordered", icon: <Clock className="h-4 w-4" />, color: "amber" },
  { key: "collected", label: "Results Entry", apiStatus: "Collected", icon: <TestTube className="h-4 w-4" />, color: "sky" },
  { key: "in_progress", label: "Verify Results", apiStatus: "In-Progress", icon: <AlertTriangle className="h-4 w-4" />, color: "purple" },
  { key: "released", label: "Released", apiStatus: "Released", icon: <CheckCircle2 className="h-4 w-4" />, color: "emerald" },
];

export default function LabPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("ordered");
  const [items, setItems] = useState<LabWorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Result entry modal
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LabWorklistItem | null>(null);
  const [resultForm, setResultForm] = useState({ result_value_text: "", result_value_numeric: "", unit: "", reference_range: "", is_abnormal: false, is_critical: false });
  const currentTab = tabs.find((t) => t.key === activeTab)!;

  async function fetchWorklist() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/worklist/lab?status=${encodeURIComponent(currentTab.apiStatus)}`, token);
      const data = res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load lab worklist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) fetchWorklist(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [token, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.test_name?.toLowerCase().includes(q) ||
      item.patient?.full_name?.toLowerCase().includes(q) ||
      item.patient?.hospital_number?.includes(q)
    );
  });

  // ── Collect Specimen ──
  const handleCollectSpecimen = async (item: LabWorklistItem) => {
    setSubmitting(true);
    try {
      await api.post(`/lab-requests/${item.lab_request_id}/collect-specimen`, {}, token);
      fetchWorklist();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to collect specimen");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Enter Result ──
  const handleSubmitResult = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        lab_request_id: selectedItem.lab_request_id,
        unit: resultForm.unit || null,
        reference_range: resultForm.reference_range || null,
        is_abnormal: resultForm.is_abnormal,
        is_critical: resultForm.is_critical,
      };
      if (resultForm.result_value_numeric && !isNaN(parseFloat(resultForm.result_value_numeric))) {
        payload.result_value_numeric = parseFloat(resultForm.result_value_numeric);
      } else {
        payload.result_value_text = resultForm.result_value_text;
      }
      await api.post("/lab-results", payload, token);
      setResultModalOpen(false);
      setSelectedItem(null);
      setResultForm({ result_value_text: "", result_value_numeric: "", unit: "", reference_range: "", is_abnormal: false, is_critical: false });
      fetchWorklist();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit result");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Load results for verify tab ──
  const [verifyResults, setVerifyResults] = useState<{ id: number; status: string; result_value_numeric: number | null; result_value_text: string | null; unit: string | null; is_abnormal: boolean; is_critical: boolean; lab_request: { test_name: string; patient: { full_name: string; hospital_number: string } } }[]>([]);

  async function fetchEnteredResults() {
    try {
      setLoading(true);
      const res = await api.get("/lab-results", token);
      const data = res?.data?.data ?? res?.data ?? [];
      const allResults = Array.isArray(data) ? data : [];
      setVerifyResults(allResults.filter((r: { status: string }) => r.status === "entered" || r.status === "verified"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "in_progress" || activeTab === "released") {
      fetchEnteredResults(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Verify / Release ──
  const handleVerify = async (resultId: number) => {
    setSubmitting(true);
    try {
      await api.post(`/lab-results/${resultId}/verify`, {}, token);
      fetchEnteredResults();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to verify result");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (resultId: number) => {
    setSubmitting(true);
    try {
      await api.post(`/lab-results/${resultId}/release`, {}, token);
      fetchEnteredResults();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to release result");
    } finally {
      setSubmitting(false);
    }
  };

  const enteredResults = verifyResults.filter((r) => r.status === "entered");
  const releasedResults = verifyResults.filter((r) => r.status === "released");

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Laboratory</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Lab Worklist</h1>
          <p className="text-sm text-[#5f5e5e] mt-1">Collect specimens, enter results, verify and release reports</p>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-amber-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Awaiting Collection</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : filteredItems.length}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-sky-100 flex items-center justify-center">
            <TestTube className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Results Pending</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : (activeTab === "collected" ? filteredItems.length : enteredResults.length)}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-purple-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Awaiting Verification</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : enteredResults.length}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Released</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : releasedResults.length}</p>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="flex gap-1 bg-white rounded border border-[#becab7]/50 p-1" role="tablist" aria-label="Lab pipeline views">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded transition-all min-h-[44px] ${
              activeTab === tab.key
                ? "bg-clinical-primary text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </section>

      {/* Search */}
      <section className="bg-white rounded border border-[#becab7]/50 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by test name, patient name, or hospital #..."
            aria-label="Search lab worklist"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Content */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">{currentTab.label}</h2>
        </div>

        {loading ? (
          <LoadingState message="Loading lab worklist..." />
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Specimen</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Ordered By</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {/* ── Tab: Ordered (awaiting collection) ── */}
                {activeTab === "ordered" && (
                  filteredItems.length === 0 ? (
                    <tr><td colSpan={5}><EmptyState icon={<FlaskConical className="h-6 w-6 text-gray-400" />} title="No orders awaiting collection" description="All specimens have been collected" /></td></tr>
                  ) : filteredItems.map((item) => (
                    <tr key={item.lab_request_id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{item.patient?.full_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{item.patient?.hospital_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{item.test_name}</div>
                        {item.loinc_code && <div className="text-xs text-gray-400 font-mono">LOINC: {item.loinc_code}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.specimen_type || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.ordered_by || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleCollectSpecimen(item)}
                            disabled={submitting}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wider cursor-pointer disabled:opacity-50"
                          >
                            Collect Specimen
                          </button>
                          <Link href={`/patients/${item.patient?.id}`} className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider">
                            Profile
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {/* ── Tab: Collected (results entry) ── */}
                {activeTab === "collected" && (
                  filteredItems.length === 0 ? (
                    <tr><td colSpan={5}><EmptyState title="No specimens awaiting results" description="All collected specimens have results entered" /></td></tr>
                  ) : filteredItems.map((item) => (
                    <tr key={item.lab_request_id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{item.patient?.full_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{item.patient?.hospital_number}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.test_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <StatusBadge label="Collected" variant="info" />
                        {item.specimen_collected_at && (
                          <div className="text-xs text-gray-400 mt-1">{new Date(item.specimen_collected_at).toLocaleString()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.ordered_by || "—"}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => { setSelectedItem(item); setResultModalOpen(true); }}
                          className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider cursor-pointer"
                        >
                          Enter Result
                        </button>
                      </td>
                    </tr>
                  ))
                )}

                {/* ── Tab: In-Progress (verify results) ── */}
                {activeTab === "in_progress" && (
                  enteredResults.length === 0 ? (
                    <tr><td colSpan={5}><EmptyState title="No results awaiting verification" description="All entered results have been verified" /></td></tr>
                  ) : enteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{result.lab_request?.patient?.full_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{result.lab_request?.patient?.hospital_number}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{result.lab_request?.test_name}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold">{result.result_value_numeric ?? result.result_value_text ?? "—"}</span>
                        {result.unit && <span className="text-xs text-gray-400 ml-1">{result.unit}</span>}
                        {result.is_abnormal && <StatusBadge label="Abnormal" variant="warning" className="ml-2" />}
                        {result.is_critical && <StatusBadge label="Critical" variant="error" pulse className="ml-2" />}
                      </td>
                      <td className="px-6 py-4"><StatusBadge label="Entered" variant="info" /></td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleVerify(result.id)}
                          disabled={submitting}
                          className="text-xs font-bold text-purple-600 hover:text-purple-800 uppercase tracking-wider cursor-pointer disabled:opacity-50"
                        >
                          Verify
                        </button>
                      </td>
                    </tr>
                  ))
                )}

                {/* ── Tab: Released ── */}
                {activeTab === "released" && (
                  releasedResults.length === 0 ? (
                    <tr><td colSpan={5}><EmptyState title="No released results" description="Results will appear here after release" /></td></tr>
                  ) : releasedResults.map((result) => (
                    <tr key={result.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{result.lab_request?.patient?.full_name}</div>
                        <div className="text-xs text-gray-400 font-mono">{result.lab_request?.patient?.hospital_number}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{result.lab_request?.test_name}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold">{result.result_value_numeric ?? result.result_value_text ?? "—"}</span>
                        {result.unit && <span className="text-xs text-gray-400 ml-1">{result.unit}</span>}
                        {result.is_abnormal && <StatusBadge label="Abnormal" variant="warning" className="ml-2" />}
                        {result.is_critical && <StatusBadge label="Critical" variant="error" className="ml-2" />}
                      </td>
                      <td className="px-6 py-4"><StatusBadge label="Released" variant="success" /></td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleRelease(result.id)}
                          disabled={submitting}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wider cursor-pointer disabled:opacity-50"
                        >
                          Release
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Enter Result Modal */}
      <Modal
        open={resultModalOpen}
        onClose={() => { setResultModalOpen(false); setSelectedItem(null); }}
        title="Enter Lab Result"
        subtitle={selectedItem ? `${selectedItem.test_name} for ${selectedItem.patient?.full_name}` : ""}
        size="lg"
        footer={
          <>
            <button onClick={() => { setResultModalOpen(false); setSelectedItem(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSubmitResult} disabled={submitting || (!resultForm.result_value_text.trim() && !resultForm.result_value_numeric.trim())} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Result"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Numeric Result</label>
              <input
                type="number"
                step="any"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={resultForm.result_value_numeric}
                onChange={(e) => setResultForm({ ...resultForm, result_value_numeric: e.target.value })}
                placeholder="e.g., 12.5, 120"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Text Result</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={resultForm.result_value_text}
                onChange={(e) => setResultForm({ ...resultForm, result_value_text: e.target.value })}
                placeholder="e.g., Positive, 120/80"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Unit</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={resultForm.unit}
                onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })}
                placeholder="e.g., g/dL, mmol/L"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Reference Range</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={resultForm.reference_range}
                onChange={(e) => setResultForm({ ...resultForm, reference_range: e.target.value })}
                placeholder="e.g., 12.0-16.0"
              />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={resultForm.is_abnormal}
                onChange={(e) => setResultForm({ ...resultForm, is_abnormal: e.target.checked })}
                className="rounded border-gray-300 text-clinical-primary focus:ring-clinical-primary"
              />
              <span className="font-semibold text-gray-700">Abnormal Result</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={resultForm.is_critical}
                onChange={(e) => setResultForm({ ...resultForm, is_critical: e.target.checked })}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="font-semibold text-gray-700">Critical Result</span>
            </label>
          </div>
          {resultForm.is_critical && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 font-semibold">
              Critical results require immediate clinician notification and acknowledgment workflow.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

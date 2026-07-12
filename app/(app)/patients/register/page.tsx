"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../store/RoleContext";
import { api } from "../../../../lib/api";

interface DuplicatePatient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  village: string;
  district: string;
}

// ─── Input validation helpers ───────────────────────────────────────────────
/** Strip all non-digit characters */
const digitsOnly = (v: string) => v.replace(/\D/g, "");
/** Strip everything except digits and uppercase letters */
const alphaNumOnly = (v: string) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
/** Format a raw digit string as +265 XXXXXXXXX (max 9 trailing digits) */
const formatMalawiPhone = (raw: string) => {
  const digits = digitsOnly(raw).slice(0, 9);
  return digits;
};
// ─────────────────────────────────────────────────────────────────────────────

function PatientRegistrationForm() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeId = searchParams.get("complete");

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Female");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [healthPassport, setHealthPassport] = useState("");
  const [address, setAddress] = useState("");
  const [village, setVillage] = useState("");
  const [ta, setTa] = useState("");
  const [district, setDistrict] = useState("Zomba");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [category, setCategory] = useState("Outpatient");
  
  // Consent
  const [consentCare, setConsentCare] = useState(false);
  const [consentTeaching, setConsentTeaching] = useState(false);
  const [consentResearch, setConsentResearch] = useState(false);

  // Emergency fields
  const [approximateAge, setApproximateAge] = useState("");
  const [presentingComplaint, setPresentingComplaint] = useState("");

  // States
  const [isEmergency, setIsEmergency] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [duplicates, setDuplicates] = useState<DuplicatePatient[]>([]);

  const duplicateDialogRef = useRef<HTMLDialogElement>(null);

  // Load existing data if we are completing an emergency registration
  useEffect(() => {
    async function loadPatientDetails() {
      if (!completeId || !token) return;
      try {
        setFetchLoading(true);
        const response = await api.get(`/patients/${completeId}`, token);
        if (response && response.data && response.data.patient) {
          const p = response.data.patient;
          setFirstName(p.first_name || "");
          setLastName(p.last_name || "");
          setGender(p.gender || "Female");
          setCategory(p.patient_category || "Outpatient");
          if (p.date_of_birth) {
            setDob(new Date(p.date_of_birth).toISOString().split("T")[0]);
          }
          setConsentCare(!!p.consent_care);
          setConsentTeaching(!!p.consent_teaching);
          setConsentResearch(!!p.consent_research);
        }
      } catch {
        setError("Failed to retrieve emergency patient records.");
      } finally {
        setFetchLoading(false);
      }
    }

    loadPatientDetails();
  }, [completeId, token]);

  // Pre-select emergency mode if query param is set
  useEffect(() => {
    const isEmergencyParam = searchParams.get("emergency");
    if (isEmergencyParam === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEmergency(true);
    }
  }, [searchParams]);

  // Handle standard patient check for duplicates before saving
  const checkDuplicates = async () => {
    if (!firstName.trim() || !lastName.trim()) return false;
    try {
      const response = await api.get(
        `/patients?search=${encodeURIComponent(firstName + " " + lastName)}`,
        token
      );
      if (response && response.data && response.data.length > 0) {
        setDuplicates(response.data);
        duplicateDialogRef.current?.showModal();
        return true;
      }
    } catch {
      // Ignore checks error, save directly as fallback
    }
    return false;
  };

  const handleSave = async (bypassDuplicate = false) => {
    setError(null);
    setErrors({});
    setLoading(true);

    if (!bypassDuplicate && !completeId && !isEmergency) {
      const foundDuplicates = await checkDuplicates();
      if (foundDuplicates) {
        setLoading(false);
        return; // Wait for clerk confirmation via modal
      }
    }

    // Map payload
    const payload = isEmergency
      ? {
          first_name: firstName,
          last_name: lastName,
          gender,
          patient_category: "Emergency",
          approximate_age: approximateAge ? parseInt(approximateAge) : null,
          presenting_complaint: presentingComplaint,
          consent_care: consentCare,
        }
      : {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob,
          gender,
          phone: phone ? `+265${phone}` : null,
          national_id: nationalId || null,
          health_passport_number: healthPassport || null,
          address,
          village,
          traditional_authority: ta,
          district,
          guardian_name: guardianName || null,
          guardian_phone: guardianPhone ? `+265${guardianPhone}` : null,
          patient_category: category,
          consent_care: consentCare,
          consent_teaching: consentTeaching,
          consent_research: consentResearch,
        };

    try {
      let response;
      if (completeId) {
        // Complete emergency registration
        response = await api.put(`/patients/${completeId}/complete-registration`, payload, token);
      } else if (isEmergency) {
        // Emergency quick check-in
        response = await api.post("/emergency/register", payload, token);
      } else {
        // Standard check-in
        response = await api.post("/patients", payload, token);
      }

      if (response) {
        router.push("/patients");
      }
    } catch (err: unknown) {
      const apiError = err as { message?: string; errors?: Record<string, string[]> };
      if (apiError.errors) {
        setErrors(apiError.errors);
      }
      setError(apiError.message || "An error occurred while saving the record.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentCare) {
      setError("Consent to Care is mandatory to create a patient profile.");
      return;
    }
    handleSave(false);
  };

  if (fetchLoading) {
    return <div className="p-8 text-center text-sm font-mono text-gray-500">Loading emergency record details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div>
        <h1 className="text-3xl font-bold text-[#1b1c1c]">
          {completeId ? "Complete Emergency Intake" : "Patient Registration"}
        </h1>
        <p className="text-sm text-[#5f5e5e] mt-1">
          {completeId
            ? "Enter full demographic data to finalize emergency registration."
            : "Record patient identities, locate coordinates, and log care consent."}
        </p>
      </div>

      <div className="bg-white rounded border border-[#becab7]/50 p-6">
        {/* Toggle standard vs quick emergency mode */}
        {!completeId && (
          <div className="flex gap-4 border-b border-gray-100 pb-4 mb-6">
            <button
              type="button"
              onClick={() => setIsEmergency(false)}
              className={`pb-2 text-sm font-bold uppercase tracking-wider ${
                !isEmergency ? "border-b-2 border-clinical-primary text-clinical-primary" : "text-gray-400"
              }`}
            >
              Standard Registration
            </button>
            <button
              type="button"
              onClick={() => setIsEmergency(true)}
              className={`pb-2 text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isEmergency ? "border-b-2 border-clinical-primary text-clinical-primary" : "text-gray-400"
              }`}
            >
              <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Quick Emergency Registration
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identifiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">First Name *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name.join(" ")}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Last Name *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name.join(" ")}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Gender *</label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {!isEmergency && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Date of Birth *</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
                {errors.date_of_birth && <p className="text-xs text-red-600 mt-1">{errors.date_of_birth.join(" ")}</p>}
              </div>
            )}

            {isEmergency && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Approximate Age (Years) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="150"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900 font-mono"
                  value={approximateAge}
                  onChange={(e) => setApproximateAge(e.target.value)}
                  placeholder="e.g. 35"
                />
                {errors.approximate_age && <p className="text-xs text-red-600 mt-1">{errors.approximate_age.join(" ")}</p>}
              </div>
            )}
          </div>

          {!isEmergency && (
            <>
              {/* Secondary Identifiers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-100 pt-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Phone Number</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l bg-gray-50 text-gray-500 text-sm font-mono select-none">+265</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={9}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900 font-mono"
                      value={phone}
                      onChange={(e) => setPhone(formatMalawiPhone(e.target.value))}
                      placeholder="999 999 999"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">9 digits after country code (+265)</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">National ID</label>
                  <input
                    type="text"
                    maxLength={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900 font-mono uppercase"
                    value={nationalId}
                    onChange={(e) => setNationalId(alphaNumOnly(e.target.value))}
                    placeholder="E.g. AB12345"
                  />
                  {errors.national_id && <p className="text-xs text-red-600 mt-1">{errors.national_id.join(" ")}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Health Passport #</label>
                  <input
                    type="text"
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900 font-mono uppercase"
                    value={healthPassport}
                    onChange={(e) => setHealthPassport(alphaNumOnly(e.target.value))}
                    placeholder="E.g. HP000123"
                  />
                </div>
              </div>

              {/* Geographic Coordinates */}
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Contact & Address</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Physical Address</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Village</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">T.A. / Traditional Authority</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                      value={ta}
                      onChange={(e) => setTa(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">District</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    >
                      <option value="Zomba">Zomba</option>
                      <option value="Blantyre">Blantyre</option>
                      <option value="Lilongwe">Lilongwe</option>
                      <option value="Mzuzu">Mzuzu</option>
                      <option value="Thyolo">Thyolo</option>
                      <option value="Neno">Neno</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Patient Payer Category</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Outpatient">Outpatient</option>
                      <option value="Inpatient">Inpatient</option>
                      <option value="Student">Student (MUST)</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Next of Kin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Next of Kin / Guardian Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Next of Kin Contact Phone</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l bg-gray-50 text-gray-500 text-sm font-mono select-none">+265</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={9}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900 font-mono"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(formatMalawiPhone(e.target.value))}
                      placeholder="999 999 999"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">9 digits after country code (+265)</p>
                </div>
              </div>
            </>
          )}

          {/* Legal / Care Consent Checkboxes */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Patient Consent Gates</h3>
            
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-[#1b1c1c] cursor-pointer font-medium">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 h-4 w-4 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                  checked={consentCare}
                  onChange={(e) => setConsentCare(e.target.checked)}
                />
                <span>Consent to Care (Mandatory - Authorization for clinical examination and vital signs recording) *</span>
              </label>

              {!isEmergency && (
                <>
                  <label className="flex items-start gap-2 text-sm text-[#5f5e5e] cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                      checked={consentTeaching}
                      onChange={(e) => setConsentTeaching(e.target.checked)}
                    />
                    <span>Consent to Teaching (Authorize supervised Medical Student observers to review files)</span>
                  </label>

                  <label className="flex items-start gap-2 text-sm text-[#5f5e5e] cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                      checked={consentResearch}
                      onChange={(e) => setConsentResearch(e.target.checked)}
                    />
                    <span>Consent to Research (Authorize use of de-identified vitals/diagnoses in aggregate research)</span>
                  </label>
                </>
              )}
            </div>
          </div>

          {isEmergency && (
            <div className="space-y-1 pt-4 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Presenting Complaint *</label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-medium text-gray-900"
                value={presentingComplaint}
                onChange={(e) => setPresentingComplaint(e.target.value)}
                placeholder="Describe the initial emergency triage presenting complaint..."
              ></textarea>
              {errors.presenting_complaint && <p className="text-xs text-red-600 mt-1">{errors.presenting_complaint.join(" ")}</p>}
            </div>
          )}

          {/* Action Errors display */}
          {error && (
            <div className="rounded bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
              {Object.keys(errors).length > 0 && (
                <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                  {Object.entries(errors).map(([f, msg]) => (
                    <li key={f}>
                      <span className="font-semibold capitalize">{f.replace("_", " ")}:</span> {msg.join(" ")}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Submit Row */}
          <div className="flex gap-4 border-t border-gray-100 pt-6 justify-end">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2 border border-gray-300 rounded text-sm font-bold text-[#5f5e5e] hover:bg-gray-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-clinical-primary hover:bg-clinical-primary-hover text-white rounded font-bold text-sm shadow-sm transition-all focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading
                ? "Saving Records..."
                : completeId
                ? "Complete & Verify Record"
                : isEmergency
                ? "Initiate Emergency Triage"
                : "Save & Open Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Duplicate Patient Warning Modal */}
      <dialog
        ref={duplicateDialogRef}
        className="rounded border border-[#becab7] p-6 shadow-xl max-w-xl w-full bg-white backdrop:bg-black/40 backdrop:backdrop-blur-sm focus:outline-none font-sans"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-yellow-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-bold">Duplicate Records Detected</h3>
          </div>
          <p className="text-sm text-gray-600">
            The system flagged existing patient registrations that match this name. Review these files below to avoid creating duplicate cards:
          </p>

          <div className="border border-gray-100 rounded divide-y divide-gray-100 max-h-48 overflow-y-auto">
            {duplicates.map((dup) => (
              <div key={dup.id} className="p-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-gray-900">{dup.first_name} {dup.last_name}</p>
                  <p className="text-gray-500 font-mono">Hospital #: {dup.hospital_number} · DOB: {new Date(dup.date_of_birth).toLocaleDateString()}</p>
                  <p className="text-gray-400">Village: {dup.village || "N/A"}, TA: {dup.district || "N/A"}</p>
                </div>
                <Link
                  href={`/patients`}
                  onClick={() => duplicateDialogRef.current?.close()}
                  className="text-xs font-bold text-clinical-primary hover:text-green-800"
                >
                  Open Card
                </Link>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => {
                duplicateDialogRef.current?.close();
                setDuplicates([]);
              }}
              className="px-4 py-2 border border-gray-300 rounded text-xs font-bold text-gray-500 hover:bg-gray-50"
            >
              Go Back & Edit
            </button>
            <button
              type="button"
              onClick={() => {
                duplicateDialogRef.current?.close();
                handleSave(true); // Bypass duplicate check
              }}
              className="px-4 py-2 bg-clinical-primary text-white rounded text-xs font-bold hover:bg-clinical-primary-hover"
            >
              Yes, Save as New Patient
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default function PatientRegistration() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-gray-500">Loading intake desk...</div>}>
      <PatientRegistrationForm />
    </Suspense>
  );
}

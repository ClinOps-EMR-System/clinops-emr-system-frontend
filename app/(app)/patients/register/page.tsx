"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../store/RoleContext";
import { api } from "../../../../lib/api";
import { DuplicatePatient } from "../../../../types/patient";
import FormField from "../../../../components/ui/FormField";
import SelectField from "../../../../components/ui/SelectField";
import TextareaField from "../../../../components/ui/TextareaField";
import PhoneField from "../../../../components/ui/PhoneField";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog";
import { SectionHeader, PageCard, FormActions } from "../../../../components/ui/PageLayout";
import { useToast } from "../../../../components/ui/Toast";

const alphaNumOnly = (v: string) => v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

function PatientRegistrationForm() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeId = searchParams.get("complete");
  const editId = searchParams.get("edit");
  const { success, error: toastError } = useToast();

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

  const [consentCare, setConsentCare] = useState(false);
  const [consentTeaching, setConsentTeaching] = useState(false);
  const [consentResearch, setConsentResearch] = useState(false);

  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("Chichewa");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [occupation, setOccupation] = useState("");
  const [referralSource, setReferralSource] = useState("Self");
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState("");

  const [approximateAge, setApproximateAge] = useState("");
  const [presentingComplaint, setPresentingComplaint] = useState("");

  const [isEmergency, setIsEmergency] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [duplicates, setDuplicates] = useState<DuplicatePatient[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  useEffect(() => {
    async function loadPatientDetails() {
      const targetId = editId || completeId;
      if (!targetId || !token) return;
      try {
        setFetchLoading(true);
        const response = await api.get(`/patients/${targetId}`, token);
        if (response && response.data && response.data.patient) {
          const p = response.data.patient;
          setFirstName(p.first_name || "");
          setLastName(p.last_name || "");
          setGender(p.gender || "Female");
          setCategory(p.patient_category || "Outpatient");
          if (p.date_of_birth) {
            setDob(new Date(p.date_of_birth).toISOString().split("T")[0]);
          }
          setPhone(p.phone ? p.phone.replace("+265", "") : "");
          setNationalId(p.national_id || "");
          setHealthPassport(p.health_passport_number || "");
          setAddress(p.address || "");
          setVillage(p.village || "");
          setTa(p.traditional_authority || "");
          if (p.district) setDistrict(p.district);
          setGuardianName(p.guardian_name || "");
          setGuardianPhone(p.guardian_phone ? p.guardian_phone.replace("+265", "") : "");
          setConsentCare(!!p.consent_care);
          setConsentTeaching(!!p.consent_teaching);
          setConsentResearch(!!p.consent_research);
        }
      } catch {
        setError("Failed to retrieve patient records.");
      } finally {
        setFetchLoading(false);
      }
    }
    loadPatientDetails();
  }, [completeId, editId, token]);

  useEffect(() => {
    if (searchParams.get("emergency") === "true") {
      setIsEmergency(true); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [searchParams]);

  const checkDuplicates = async (): Promise<boolean> => {
    if (!firstName.trim() || !lastName.trim()) return false;
    try {
      const response = await api.get(
        `/patients?search=${encodeURIComponent(firstName + " " + lastName)}`,
        token
      );
      if (response && response.data && response.data.length > 0) {
        setDuplicates(response.data);
        setShowDuplicateDialog(true);
        return true;
      }
    } catch {
      // Ignore check errors
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
        return;
      }
    }

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
          next_of_kin_relationship: nextOfKinRelationship || null,
          insurance_provider: insuranceProvider || null,
          insurance_policy_number: insurancePolicy || null,
          preferred_language: preferredLanguage,
          marital_status: maritalStatus || null,
          occupation: occupation || null,
          referral_source: referralSource,
          patient_category: category,
          consent_care: consentCare,
          consent_teaching: consentTeaching,
          consent_research: consentResearch,
        };

    try {
      let response;
      if (editId) {
        response = await api.put(`/patients/${editId}`, payload, token);
      } else if (completeId) {
        response = await api.put(`/patients/${completeId}/complete-registration`, payload, token);
      } else if (isEmergency) {
        response = await api.post("/emergency/register", payload, token);
      } else {
        response = await api.post("/patients", payload, token);
      }

      if (response) {
        const patientId = response?.data?.id ?? response?.data?.patient?.id;
        success(editId ? "Patient record updated successfully." : "Patient registered successfully.");
        if (editId) {
          router.push(`/patients/${editId}`);
        } else if (completeId) {
          // Emergency intake completed — go to patient profile
          router.push(`/patients/${completeId}`);
        } else if (isEmergency) {
          // Quick emergency reg — go to patients list (rapid triage next)
          router.push("/patients");
        } else {
          // Standard registration — go straight to patient profile
          router.push(patientId ? `/patients/${patientId}` : "/patients");
        }
      }
    } catch (err: unknown) {
      const apiError = err as { message?: string; errors?: Record<string, string[]> };
      if (apiError.errors) {
        setErrors(apiError.errors);
      }
      setError(apiError.message || "An error occurred while saving the record.");
      toastError(apiError.message || "Failed to save patient record.");
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
    return <div className="p-8 text-center text-sm font-mono text-gray-500">Loading patient details...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <SectionHeader
        title={
          editId ? "Edit Patient Profile" : completeId ? "Complete Emergency Intake" : "Patient Registration"
        }
        description={
          editId
            ? "Update demographic details, contact numbers, and consent gates."
            : completeId
            ? "Enter full demographic data to finalize emergency registration."
            : "Record patient identities, locate coordinates, and log care consent."
        }
      />

      <PageCard>
        {!completeId && (
          <div className="flex gap-4 border-b border-gray-100 pb-4 mb-6" role="tablist" aria-label="Registration type">
            <button
              type="button"
              role="tab"
              aria-selected={!isEmergency}
              onClick={() => setIsEmergency(false)}
              className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                !isEmergency ? "border-b-2 border-clinical-primary text-clinical-primary" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Standard Registration
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isEmergency}
              onClick={() => setIsEmergency(true)}
              className={`pb-2 text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                isEmergency ? "border-b-2 border-clinical-primary text-clinical-primary" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Quick Emergency Registration
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" aria-label={isEmergency ? "Emergency registration form" : "Patient registration form"}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={errors.first_name}
            />
            <FormField
              label="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={errors.last_name}
            />
            <SelectField
              label="Gender"
              required
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={[
                { value: "Female", label: "Female" },
                { value: "Male", label: "Male" },
                { value: "Other", label: "Other" },
              ]}
            />
            {!isEmergency ? (
              <FormField
                label="Date of Birth"
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                error={errors.date_of_birth}
              />
            ) : (
              <FormField
                label="Approximate Age (Years)"
                type="number"
                required
                min={0}
                max={150}
                value={approximateAge}
                onChange={(e) => setApproximateAge(e.target.value)}
                error={errors.approximate_age}
                placeholder="e.g. 35"
              />
            )}
          </div>

          {!isEmergency && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-gray-100 pt-4">
                <PhoneField
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  hint="9 digits after country code (+265)"
                />
                <FormField
                  label="National ID"
                  maxLength={12}
                  value={nationalId}
                  onChange={(e) => setNationalId(alphaNumOnly(e.target.value))}
                  error={errors.national_id}
                  placeholder="E.g. AB12345"
                />
                <FormField
                  label="Health Passport #"
                  maxLength={20}
                  value={healthPassport}
                  onChange={(e) => setHealthPassport(alphaNumOnly(e.target.value))}
                  placeholder="E.g. HP000123"
                />
              </div>

              <div className="space-y-4 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Contact & Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <FormField
                    label="Physical Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="md:col-span-2"
                  />
                  <FormField
                    label="Village"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                  />
                  <FormField
                    label="T.A. / Traditional Authority"
                    value={ta}
                    onChange={(e) => setTa(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SelectField
                    label="District"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    options={[
                      { value: "Balaka", label: "Balaka" },
                      { value: "Blantyre", label: "Blantyre" },
                      { value: "Chikwawa", label: "Chikwawa" },
                      { value: "Chiradzulu", label: "Chiradzulu" },
                      { value: "Chitipa", label: "Chitipa" },
                      { value: "Dedza", label: "Dedza" },
                      { value: "Dowa", label: "Dowa" },
                      { value: "Karonga", label: "Karonga" },
                      { value: "Kasungu", label: "Kasungu" },
                      { value: "Likoma", label: "Likoma" },
                      { value: "Lilongwe", label: "Lilongwe" },
                      { value: "Machinga", label: "Machinga" },
                      { value: "Mangochi", label: "Mangochi" },
                      { value: "Mchinji", label: "Mchinji" },
                      { value: "Mulanje", label: "Mulanje" },
                      { value: "Mwanza", label: "Mwanza" },
                      { value: "Mzimba", label: "Mzimba" },
                      { value: "Ncheu", label: "Ncheu" },
                      { value: "Nkhata Bay", label: "Nkhata Bay" },
                      { value: "Nkhotakota", label: "Nkhotakota" },
                      { value: "Nsanje", label: "Nsanje" },
                      { value: "Ntcheu", label: "Ntcheu" },
                      { value: "Ntchisi", label: "Ntchisi" },
                      { value: "Phalombe", label: "Phalombe" },
                      { value: "Rumphi", label: "Rumphi" },
                      { value: "Salima", label: "Salima" },
                      { value: "Thyolo", label: "Thyolo" },
                      { value: "Zomba", label: "Zomba" },
                    ]}
                  />
                  <SelectField
                    label="Patient Payer Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={[
                      { value: "Outpatient", label: "Outpatient" },
                      { value: "Inpatient", label: "Inpatient" },
                      { value: "Student", label: "Student (MUST)" },
                      { value: "Staff", label: "Staff" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-4">
                <FormField
                  label="Next of Kin / Guardian Name"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                />
                <PhoneField
                  label="Next of Kin Contact Phone"
                  value={guardianPhone}
                  onChange={setGuardianPhone}
                  hint="9 digits after country code (+265)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SelectField
                  label="Next of Kin Relationship"
                  value={nextOfKinRelationship}
                  onChange={(e) => setNextOfKinRelationship(e.target.value)}
                  options={[
                    { value: "", label: "Select relationship" },
                    { value: "Mother", label: "Mother" },
                    { value: "Father", label: "Father" },
                    { value: "Spouse", label: "Spouse" },
                    { value: "Sibling", label: "Sibling" },
                    { value: "Child", label: "Child" },
                    { value: "Other", label: "Other" },
                  ]}
                />
                <SelectField
                  label="Preferred Language"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  options={[
                    { value: "Chichewa", label: "Chichewa" },
                    { value: "Tumbuka", label: "Tumbuka" },
                    { value: "Yao", label: "Yao" },
                    { value: "English", label: "English" },
                    { value: "Other", label: "Other" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SelectField
                  label="Marital Status"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  options={[
                    { value: "", label: "Select status" },
                    { value: "Single", label: "Single" },
                    { value: "Married", label: "Married" },
                    { value: "Divorced", label: "Divorced" },
                    { value: "Widowed", label: "Widowed" },
                  ]}
                />
                <FormField
                  label="Occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Farmer, Teacher"
                />
                <SelectField
                  label="Referral Source"
                  value={referralSource}
                  onChange={(e) => setReferralSource(e.target.value)}
                  options={[
                    { value: "Self", label: "Self (Walk-in)" },
                    { value: "CHW", label: "Community Health Worker" },
                    { value: "Health Center", label: "Health Center" },
                    { value: "Other Facility", label: "Other Facility" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-4">
                <FormField
                  label="Insurance Provider"
                  value={insuranceProvider}
                  onChange={(e) => setInsuranceProvider(e.target.value)}
                  placeholder="e.g. NHM, CIMAS, First Mutual"
                />
                <FormField
                  label="Insurance Policy Number"
                  value={insurancePolicy}
                  onChange={(e) => setInsurancePolicy(e.target.value)}
                  placeholder="Policy or member number"
                />
              </div>
            </>
          )}

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
            <div className="pt-4 border-t border-gray-100">
              <TextareaField
                label="Presenting Complaint"
                required
                rows={3}
                value={presentingComplaint}
                onChange={(e) => setPresentingComplaint(e.target.value)}
                error={errors.presenting_complaint}
                placeholder="Describe the initial emergency triage presenting complaint..."
              />
            </div>
          )}

          {error && (
            <div className="rounded bg-red-50 border border-red-200 p-4 text-sm text-red-700" role="alert">
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

          <FormActions
            onCancel={() => router.push("/dashboard")}
            submitLabel={
              completeId ? "Complete & Verify Record" : isEmergency ? "Initiate Emergency Triage" : "Save & Open Profile"
            }
            loading={loading}
            loadingLabel="Saving Records..."
          />
        </form>
      </PageCard>

      <ConfirmDialog
        open={showDuplicateDialog}
        onClose={() => { setShowDuplicateDialog(false); setDuplicates([]); }}
        onConfirm={() => { setShowDuplicateDialog(false); handleSave(true); }}
        title="Duplicate Records Detected"
        message={`The system flagged ${duplicates.length} existing patient registration${duplicates.length > 1 ? "s" : ""} matching this name. Review below to avoid creating duplicate cards.`}
        confirmLabel="Yes, Save as New Patient"
        cancelLabel="Go Back & Edit"
        variant="warning"
      >
        <div className="border border-gray-100 rounded divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {duplicates.map((dup) => (
            <div key={dup.id} className="p-3 flex justify-between items-center text-xs">
              <div>
                <p className="font-semibold text-gray-900">{dup.first_name} {dup.last_name}</p>
                <p className="text-gray-500 font-mono">Hospital #: {dup.hospital_number} · DOB: {new Date(dup.date_of_birth).toLocaleDateString()}</p>
                <p className="text-gray-400">Village: {dup.village || "N/A"}, TA: {dup.district || "N/A"}</p>
              </div>
              <Link
                href="/patients"
                onClick={() => setShowDuplicateDialog(false)}
                className="text-xs font-bold text-clinical-primary hover:text-green-800"
              >
                Open Card
              </Link>
            </div>
          ))}
        </div>
      </ConfirmDialog>
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

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../store/RoleContext";
import { api } from "../../lib/api";
import { DuplicatePatient } from "../../types/patient";
import ConfirmDialog from "../ui/ConfirmDialog";
import BillingConfirmation from "../billing/BillingConfirmation";
import { parseBilling, type BillingSummary } from "../../types/billing";
import { SectionHeader, PageCard } from "../ui/PageLayout";
import { useToast } from "../ui/Toast";
import { Button } from "../ui/button";
import { StepIndicator } from "./StepIndicator";
import {
  PersonalInfoStep, EmergencyDetailsStep, ContactLocationStep,
  KinSocialStep, InsuranceConsentStep, EmergencyConsentStep,
} from "./StepContent";
import { STANDARD_STEPS, EMERGENCY_STEPS } from "./registration-steps";

function alphaNumOnly(v: string) {
  return v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export default function PatientRegistrationForm() {
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

  const [isEmergency, setIsEmergency] = useState(searchParams.get("emergency") === "true");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [duplicates, setDuplicates] = useState<DuplicatePatient[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(0);

  const steps = isEmergency ? EMERGENCY_STEPS : STANDARD_STEPS;
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;

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

  const fields = {
    firstName, lastName, dob, gender, phone, nationalId, healthPassport,
    address, village, ta, district, guardianName, guardianPhone, category,
    consentCare, consentTeaching, consentResearch,
    insuranceProvider, insurancePolicy, preferredLanguage,
    maritalStatus, occupation, referralSource, nextOfKinRelationship,
    approximateAge, presentingComplaint, errors,
  };

  const setters = {
    setFirstName, setLastName, setDob, setGender,
    setPhone, setNationalId, setHealthPassport,
    setAddress, setVillage, setTa, setDistrict,
    setGuardianName, setGuardianPhone, setCategory,
    setConsentCare, setConsentTeaching, setConsentResearch,
    setInsuranceProvider, setInsurancePolicy, setPreferredLanguage,
    setMaritalStatus, setOccupation, setReferralSource, setNextOfKinRelationship,
    setApproximateAge, setPresentingComplaint,
  };

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string[]> = {};

    if (isEmergency) {
      if (step === 0) {
        if (!firstName.trim()) newErrors.first_name = ["First name is required"];
        if (!lastName.trim()) newErrors.last_name = ["Last name is required"];
        if (!approximateAge || parseInt(approximateAge) < 0) newErrors.approximate_age = ["Valid age is required"];
        if (!presentingComplaint.trim()) newErrors.presenting_complaint = ["Presenting complaint is required"];
      }
      if (step === 1) {
        if (!consentCare) {
          setError("Consent to Care is mandatory to create a patient profile.");
          return false;
        }
      }
    } else {
      if (step === 0) {
        if (!firstName.trim()) newErrors.first_name = ["First name is required"];
        if (!lastName.trim()) newErrors.last_name = ["Last name is required"];
        if (!dob) newErrors.date_of_birth = ["Date of birth is required"];
      }
      if (step === 3) {
        if (!consentCare) {
          setError("Consent to Care is mandatory to create a patient profile.");
          return false;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [firstName, lastName, dob, approximateAge, presentingComplaint, consentCare, isEmergency]);

  const nextStep = useCallback(() => {
    if (!validateStep(currentStep)) return;
    if (isLastStep) return;
    setCurrentStep((s) => s + 1);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep, isLastStep, validateStep]);

  const prevStep = useCallback(() => {
    if (currentStep === 0) return;
    setCurrentStep((s) => s - 1);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step < 0 || step >= totalSteps) return;
    setCurrentStep(step);
    setError(null);
  }, [totalSteps]);

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
          health_passport_number: alphaNumOnly(healthPassport) || null,
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
        const billing = parseBilling(response);

        if (!editId && !completeId && billing) {
          setBillingSummary(billing);
          setPendingNav(isEmergency ? "/patients" : patientId ? `/patients/${patientId}` : "/patients");
          return;
        }

        success(editId ? "Patient record updated successfully." : "Patient registered successfully.");
        if (editId) {
          router.push(`/patients/${editId}`);
        } else if (completeId) {
          router.push(`/patients/${completeId}`);
        } else if (isEmergency) {
          router.push("/patients");
        } else {
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

  const handleSubmit = async () => {
    if (!consentCare) {
      setError("Consent to Care is mandatory to create a patient profile.");
      return;
    }
    await handleSave(false);
  };

  if (fetchLoading) {
    return <div className="p-8 text-center text-sm font-mono text-muted-foreground">Loading patient details...</div>;
  }

  const pageTitle = editId ? "Edit Patient Profile" : completeId ? "Complete Emergency Intake" : "Patient Registration";
  const pageDescription = editId
    ? "Update demographic details, contact numbers, and consent gates."
    : completeId
    ? "Enter full demographic data to finalize emergency registration."
    : "Record patient identities, locate coordinates, and log care consent.";

  function renderCurrentStep() {
    if (isEmergency) {
      if (currentStep === 0) return <EmergencyDetailsStep fields={fields} setters={setters} />;
      if (currentStep === 1) return <EmergencyConsentStep fields={fields} setters={setters} />;
      return null;
    }

    switch (currentStep) {
      case 0: return <PersonalInfoStep fields={fields} setters={setters} />;
      case 1: return <ContactLocationStep fields={fields} setters={setters} />;
      case 2: return <KinSocialStep fields={fields} setters={setters} />;
      case 3: return <InsuranceConsentStep fields={fields} setters={setters} />;
      default: return null;
    }
  }

  const submitLabel = completeId
    ? "Complete & Verify"
    : isEmergency
    ? "Register for Triage"
    : "Register Patient";

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <SectionHeader title={pageTitle} description={pageDescription} />

      <PageCard>
        {!completeId && (
          <div className="flex gap-4 pb-4 mb-6 border-b border-border" role="tablist" aria-label="Registration type">
            <button
              type="button"
              role="tab"
              aria-selected={!isEmergency}
              onClick={() => { setIsEmergency(false); setCurrentStep(0); setErrors({}); setError(null); }}
              className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                !isEmergency ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Standard Registration
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isEmergency}
              onClick={() => { setIsEmergency(true); setCurrentStep(0); setErrors({}); setError(null); }}
              className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                isEmergency ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Quick Emergency Registration
            </button>
          </div>
        )}

        <StepIndicator steps={steps} currentStep={currentStep} onStepClick={goToStep} />

        <form onSubmit={(e) => { e.preventDefault(); if (isLastStep) handleSubmit(); }} className="space-y-6">
          <div key={`${isEmergency ? "emergency" : "standard"}-${currentStep}`} className="animate-[fadeIn_0.25s_ease-in-out]">
            {renderCurrentStep()}
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive" role="alert">
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

          <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
            <div>
              {currentStep > 0 ? (
                <Button type="button" variant="outline" onClick={prevStep} disabled={loading}>
                  Back
                </Button>
              ) : (
                <div />
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Step {currentStep + 1} of {totalSteps}
            </span>
            <div>
              {isLastStep ? (
                <Button type="button" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Saving..." : submitLabel}
                </Button>
              ) : (
                <Button type="button" onClick={nextStep}>
                  Continue
                </Button>
              )}
            </div>
          </div>
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
        <div className="border border-border rounded divide-y divide-border max-h-48 overflow-y-auto">
          {duplicates.map((dup) => (
            <div key={dup.id} className="p-3 flex justify-between items-center text-xs">
              <div>
                <p className="font-semibold text-foreground">{dup.first_name} {dup.last_name}</p>
                <p className="text-muted-foreground font-mono">Hospital #: {dup.hospital_number} · DOB: {new Date(dup.date_of_birth).toLocaleDateString()}</p>
                <p className="text-muted-foreground/60">Village: {dup.village || "N/A"}, TA: {dup.district || "N/A"}</p>
              </div>
              <Link
                href="/patients"
                onClick={() => setShowDuplicateDialog(false)}
                className="text-xs font-bold text-primary hover:text-primary/80"
              >
                Open Card
              </Link>
            </div>
          ))}
        </div>
      </ConfirmDialog>

      {billingSummary && (
        <BillingConfirmation
          billing={billingSummary}
          onDone={() => {
            const to = pendingNav;
            setBillingSummary(null);
            setPendingNav(null);
            if (to) router.push(to);
          }}
          onClose={() => {
            setBillingSummary(null);
            setPendingNav(null);
          }}
        />
      )}
    </div>
  );
}

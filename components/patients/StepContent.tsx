"use client";

import FormField from "../ui/FormField";
import SelectField from "../ui/SelectField";
import TextareaField from "../ui/TextareaField";
import PhoneField from "../ui/PhoneField";
import {
  GENDERS, CATEGORIES, KIN_RELATIONSHIPS, LANGUAGES,
  MARITAL_STATUSES, REFERRAL_SOURCES, MALAWI_DISTRICTS,
} from "./registration-steps";
import { Separator } from "../ui/separator";

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-border/50 last:border-0">
      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</span>
      <span className="text-foreground font-medium text-right ml-4">{value}</span>
    </div>
  );
}

interface StepFields {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone: string;
  nationalId: string;
  healthPassport: string;
  address: string;
  village: string;
  ta: string;
  district: string;
  guardianName: string;
  guardianPhone: string;
  category: string;
  consentCare: boolean;
  consentTeaching: boolean;
  consentResearch: boolean;
  insuranceProvider: string;
  insurancePolicy: string;
  preferredLanguage: string;
  maritalStatus: string;
  occupation: string;
  referralSource: string;
  nextOfKinRelationship: string;
  approximateAge: string;
  presentingComplaint: string;
  errors: Record<string, string[]>;
}

interface StepSetters {
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setDob: (v: string) => void;
  setGender: (v: string) => void;
  setPhone: (v: string) => void;
  setNationalId: (v: string) => void;
  setHealthPassport: (v: string) => void;
  setAddress: (v: string) => void;
  setVillage: (v: string) => void;
  setTa: (v: string) => void;
  setDistrict: (v: string) => void;
  setGuardianName: (v: string) => void;
  setGuardianPhone: (v: string) => void;
  setCategory: (v: string) => void;
  setConsentCare: (v: boolean) => void;
  setConsentTeaching: (v: boolean) => void;
  setConsentResearch: (v: boolean) => void;
  setInsuranceProvider: (v: string) => void;
  setInsurancePolicy: (v: string) => void;
  setPreferredLanguage: (v: string) => void;
  setMaritalStatus: (v: string) => void;
  setOccupation: (v: string) => void;
  setReferralSource: (v: string) => void;
  setNextOfKinRelationship: (v: string) => void;
  setApproximateAge: (v: string) => void;
  setPresentingComplaint: (v: string) => void;
}

export function PersonalInfoStep({ fields, setters }: { fields: StepFields; setters: StepSetters }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FormField
        label="First Name"
        required
        value={fields.firstName}
        onChange={(e) => setters.setFirstName(e.target.value)}
        error={fields.errors.first_name}
      />
      <FormField
        label="Last Name"
        required
        value={fields.lastName}
        onChange={(e) => setters.setLastName(e.target.value)}
        error={fields.errors.last_name}
      />
      <SelectField
        label="Gender"
        required
        value={fields.gender}
        onChange={(e) => setters.setGender(e.target.value)}
        options={GENDERS}
      />
      <FormField
        label="Date of Birth"
        type="date"
        required
        value={fields.dob}
        onChange={(e) => setters.setDob(e.target.value)}
        error={fields.errors.date_of_birth}
      />
    </div>
  );
}

export function EmergencyDetailsStep({ fields, setters }: { fields: StepFields; setters: StepSetters }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          label="First Name"
          required
          value={fields.firstName}
          onChange={(e) => setters.setFirstName(e.target.value)}
          error={fields.errors.first_name}
        />
        <FormField
          label="Last Name"
          required
          value={fields.lastName}
          onChange={(e) => setters.setLastName(e.target.value)}
          error={fields.errors.last_name}
        />
        <SelectField
          label="Gender"
          required
          value={fields.gender}
          onChange={(e) => setters.setGender(e.target.value)}
          options={GENDERS}
        />
        <FormField
          label="Approximate Age (Years)"
          type="number"
          required
          min={0}
          max={150}
          value={fields.approximateAge}
          onChange={(e) => setters.setApproximateAge(e.target.value)}
          error={fields.errors.approximate_age}
          placeholder="e.g. 35"
        />
      </div>
      <TextareaField
        label="Presenting Complaint"
        required
        rows={3}
        value={fields.presentingComplaint}
        onChange={(e) => setters.setPresentingComplaint(e.target.value)}
        error={fields.errors.presenting_complaint}
        placeholder="Describe the initial emergency triage presenting complaint..."
      />
    </div>
  );
}

export function ContactLocationStep({ fields, setters }: { fields: StepFields; setters: StepSetters }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Contact Identifiers</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PhoneField
            label="Phone Number"
            value={fields.phone}
            onChange={setters.setPhone}
            hint="9 digits after country code (+265)"
          />
          <FormField
            label="National ID"
            maxLength={12}
            value={fields.nationalId}
            onChange={(e) => setters.setNationalId(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
            error={fields.errors.national_id}
            placeholder="E.g. AB12345"
          />
          <FormField
            label="Health Passport #"
            maxLength={20}
            value={fields.healthPassport}
            onChange={(e) => setters.setHealthPassport(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
            placeholder="E.g. HP000123"
          />
        </div>
      </div>
      <Separator />
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Physical Location</h4>
        <div className="space-y-4">
          <FormField
            label="Physical Address"
            value={fields.address}
            onChange={(e) => setters.setAddress(e.target.value)}
            placeholder="Street, landmark, or plot number"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Village"
              value={fields.village}
              onChange={(e) => setters.setVillage(e.target.value)}
              placeholder="e.g. Mphezulu"
            />
            <FormField
              label="T.A."
              value={fields.ta}
              onChange={(e) => setters.setTa(e.target.value)}
              placeholder="Traditional Authority"
            />
          </div>
        </div>
      </div>
      <Separator />
      <div>
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Classification</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label="District"
            value={fields.district}
            onChange={(e) => setters.setDistrict(e.target.value)}
            options={MALAWI_DISTRICTS.map((d) => ({ value: d, label: d }))}
          />
          <SelectField
            label="Patient Payer Category"
            value={fields.category}
            onChange={(e) => setters.setCategory(e.target.value)}
            options={CATEGORIES}
          />
        </div>
      </div>
    </div>
  );
}

export function KinSocialStep({ fields, setters }: { fields: StepFields; setters: StepSetters }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          label="Next of Kin / Guardian Name"
          value={fields.guardianName}
          onChange={(e) => setters.setGuardianName(e.target.value)}
        />
        <PhoneField
          label="Next of Kin Contact Phone"
          value={fields.guardianPhone}
          onChange={setters.setGuardianPhone}
          hint="9 digits after country code (+265)"
        />
      </div>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SelectField
          label="Next of Kin Relationship"
          value={fields.nextOfKinRelationship}
          onChange={(e) => setters.setNextOfKinRelationship(e.target.value)}
          options={KIN_RELATIONSHIPS}
        />
        <SelectField
          label="Preferred Language"
          value={fields.preferredLanguage}
          onChange={(e) => setters.setPreferredLanguage(e.target.value)}
          options={LANGUAGES}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SelectField
          label="Marital Status"
          value={fields.maritalStatus}
          onChange={(e) => setters.setMaritalStatus(e.target.value)}
          options={MARITAL_STATUSES}
        />
        <FormField
          label="Occupation"
          value={fields.occupation}
          onChange={(e) => setters.setOccupation(e.target.value)}
          placeholder="e.g. Farmer, Teacher"
        />
        <SelectField
          label="Referral Source"
          value={fields.referralSource}
          onChange={(e) => setters.setReferralSource(e.target.value)}
          options={REFERRAL_SOURCES}
        />
      </div>
    </div>
  );
}

export function InsuranceConsentStep({ fields, setters }: { fields: StepFields; setters: StepSetters }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField
          label="Insurance Provider"
          value={fields.insuranceProvider}
          onChange={(e) => setters.setInsuranceProvider(e.target.value)}
          placeholder="e.g. NHM, CIMAS, First Mutual"
        />
        <FormField
          label="Insurance Policy Number"
          value={fields.insurancePolicy}
          onChange={(e) => setters.setInsurancePolicy(e.target.value)}
          placeholder="Policy or member number"
        />
      </div>

      <div className="rounded-lg bg-muted/30 border border-border p-5 space-y-2">
        <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Review Summary</h4>
        <Separator />
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <SummaryRow label="Full Name" value={`${fields.firstName} ${fields.lastName}`.trim()} />
          <SummaryRow label="Gender" value={fields.gender} />
          <SummaryRow label="Date of Birth" value={fields.dob} />
          <SummaryRow label="Phone" value={fields.phone ? `+265 ${fields.phone}` : ""} />
          <SummaryRow label="National ID" value={fields.nationalId} />
          <SummaryRow label="Health Passport" value={fields.healthPassport} />
          <SummaryRow label="Address" value={fields.address} />
          <SummaryRow label="Village" value={fields.village} />
          <SummaryRow label="T.A." value={fields.ta} />
          <SummaryRow label="District" value={fields.district} />
          <SummaryRow label="Patient Category" value={fields.category} />
          <SummaryRow label="Guardian" value={fields.guardianName} />
          <SummaryRow label="Guardian Phone" value={fields.guardianPhone ? `+265 ${fields.guardianPhone}` : ""} />
          <SummaryRow label="Relationship" value={fields.nextOfKinRelationship} />
          <SummaryRow label="Language" value={fields.preferredLanguage} />
          <SummaryRow label="Marital Status" value={fields.maritalStatus} />
          <SummaryRow label="Occupation" value={fields.occupation} />
          <SummaryRow label="Referral Source" value={fields.referralSource} />
          <SummaryRow label="Insurance" value={fields.insuranceProvider} />
          <SummaryRow label="Policy No." value={fields.insurancePolicy} />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Patient Consent Gates</h3>
        <Separator />
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-foreground cursor-pointer font-medium">
            <input
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 text-primary rounded border-border focus:ring-primary/50"
              checked={fields.consentCare}
              onChange={(e) => setters.setConsentCare(e.target.checked)}
            />
            <span>Consent to Care (Mandatory — Authorization for clinical examination and vital signs recording) *</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 text-primary rounded border-border focus:ring-primary/50"
              checked={fields.consentTeaching}
              onChange={(e) => setters.setConsentTeaching(e.target.checked)}
            />
            <span>Consent to Teaching (Authorize supervised Medical Student observers to review files)</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 text-primary rounded border-border focus:ring-primary/50"
              checked={fields.consentResearch}
              onChange={(e) => setters.setConsentResearch(e.target.checked)}
            />
            <span>Consent to Research (Authorize use of de-identified vitals/diagnoses in aggregate research)</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export function EmergencyConsentStep({ fields, setters }: { fields: StepFields; setters: StepSetters }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/30 border border-border p-5 space-y-2">
        <h4 className="text-sm font-bold text-foreground uppercase tracking-wide">Review Summary</h4>
        <Separator />
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <SummaryRow label="Full Name" value={`${fields.firstName} ${fields.lastName}`.trim()} />
          <SummaryRow label="Gender" value={fields.gender} />
          <SummaryRow label="Approx. Age" value={fields.approximateAge ? `${fields.approximateAge} yrs` : ""} />
          <SummaryRow label="Complaint" value={fields.presentingComplaint} />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Patient Consent</h3>
        <Separator />
        <label className="flex items-start gap-3 text-sm text-foreground cursor-pointer font-medium">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 text-primary rounded border-border focus:ring-primary/50"
            checked={fields.consentCare}
            onChange={(e) => setters.setConsentCare(e.target.checked)}
          />
          <span>Consent to Care (Mandatory — Authorization for emergency clinical examination) *</span>
        </label>
      </div>
    </div>
  );
}

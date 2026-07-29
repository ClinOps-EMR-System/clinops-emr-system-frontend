"use client";

import { Suspense } from "react";
import PatientRegistrationForm from "../../../../components/patients/PatientRegistrationForm";

export default function PatientRegistration() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-muted-foreground">Loading intake desk...</div>}>
      <PatientRegistrationForm />
    </Suspense>
  );
}

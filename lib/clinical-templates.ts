export interface ClinicalTemplate {
  id: string;
  name: string;
  category: "objective" | "plan";
  content: string;
}

export const CLINICAL_TEMPLATES: ClinicalTemplate[] = [
  {
    id: "progress-note",
    name: "Progress Note",
    category: "plan",
    content: `Subjective: [Patient's complaints and symptoms]\n\nObjective:\nVitals: [BP, HR, Temp, SpO2]\nExam findings: [Relevant physical exam]\n\nAssessment:\n1. [Primary diagnosis]\n\nPlan:\n1. [Medications]\n2. [Investigations ordered]\n3. [Follow-up instructions]`,
  },
  {
    id: "admission-note",
    name: "Admission Note",
    category: "plan",
    content: `ADMISSION NOTE\n\nCC: [Chief complaint]\nHPI: [History of present illness]\nPMH: [Past medical history]\nMedications: [Current medications]\nAllergies: [Known allergies]\n\nExamination:\nVS: [Vital signs]\nGeneral: [Appearance]\nSystems: [Relevant system review]\n\nInvestigations on admission:\n- [Lab work]\n- [Imaging]\n\nAdmission Diagnosis:\n1. [Primary diagnosis]\n\nPlan:\n1. [Medications]\n2. [Diet/activity]\n3. [Monitoring]\n4. [Consultations]`,
  },
  {
    id: "procedure-note",
    name: "Procedure Note",
    category: "objective",
    content: `PROCEDURE NOTE\n\nProcedure: [Name of procedure]\nDate/Time: [Date and time]\nIndication: [Why the procedure was performed]\nConsent: [Informed consent obtained]\n\nPre-procedure:\n- Diagnosis: [Working diagnosis]\n- Site: [Anatomical site]\n\nProcedure details:\n[Step-by-step description of what was done]\n\nFindings:\n[Procedure findings]\n\nComplications: [None / Describe]\n\nPost-procedure:\n- Condition: [Patient status]\n- Orders: [Post-procedure orders]\n- Follow-up: [Plans]`,
  },
  {
    id: "discharge-summary",
    name: "Discharge Summary",
    category: "plan",
    content: `DISCHARGE SUMMARY\n\nAdmission Date: [Date]\nDischarge Date: [Date]\n\nAdmission Diagnosis:\n1. [Diagnosis]\n\nDischarge Diagnosis:\n1. [Final diagnosis]\n\nHospital Course:\n[Brief summary of hospital stay]\n\nDischarge Medications:\n1. [Medication — dose — frequency — duration]\n\nFollow-up:\n- [Outpatient appointment details]\n- [Lab/imaging follow-up]\n\nDischarge Instructions:\n- [Activity restrictions]\n- [Diet]\n- [Warning signs to return]`,
  },
  {
    id: "paediatric-note",
    name: "Paediatric Note",
    category: "objective",
    content: `PAEDIATRIC ASSESSMENT\n\nAge: [Age]\nWeight: [Weight in kg]\nHeight: [Height in cm]\nBMI percentile: [If applicable]\n\nImmunisation status: [Up to date / Incomplete]\nFeeding: [Breast/formula/solids]\nDevelopment: [Milestones]\n\nExamination:\nGeneral: [Appearance, activity]\nVS: [Age-appropriate vitals]\nSystems: [Relevant findings]\n\nGrowth parameters:\nWeight-for-age: [Percentile]\nHeight-for-age: [Percentile]\n\nAssessment:\n1. [Diagnosis]\n\nPlan:\n1. [Management]`,
  },
  {
    id: "ob-gyn-note",
    name: "OB/GYN Note",
    category: "objective",
    content: `OB/GYN ASSESSMENT\n\nLMP: [Last menstrual period]\nEDD: [Estimated date of delivery]\nGravida/Para: [G/P]\n\nAntenatal profile:\nBP: [Blood pressure]\nFundal height: [weeks]\nFetal heart rate: [rate]\nPresentation: [Lie]\n\nAncient history:\n[Previous pregnancies, complications]\n\nExamination:\n[Relevant findings]\n\nPlan:\n1. [Antenatal care plan]\n2. [Investigations]\n3. [Follow-up]`,
  },
];

export function getTemplatesByCategory(category: "objective" | "plan"): ClinicalTemplate[] {
  return CLINICAL_TEMPLATES.filter((t) => t.category === category);
}

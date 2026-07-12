export type AVPU = "A" | "V" | "P" | "U" | "C"; // Alert, Voice, Pain, Unresponsive, New Confusion
export type SpO2Scale = 1 | 2; // 1 = Standard, 2 = Hypercapnic target 88-92%

export interface VitalsPayload {
  respirationRate: number; // breaths/min
  spo2: number; // percentage
  spo2Scale: SpO2Scale;
  supplementalOxygen: boolean; // true = Oxygen, false = Air
  systolicBp: number; // mmHg
  pulseRate: number; // bpm
  temperature: number; // Celsius
  consciousness: AVPU;
}

export interface NEWS2Result {
  score: number;
  riskLevel: "Low" | "Medium" | "High";
  triggerColor: "green" | "yellow" | "red";
  frequencyText: string;
}

export function calculateNEWS2(vitals: Partial<VitalsPayload>): NEWS2Result {
  let score = 0;

  // 1. Respiration Rate (breaths/min)
  if (vitals.respirationRate !== undefined) {
    const rr = vitals.respirationRate;
    if (rr <= 8) score += 3;
    else if (rr >= 9 && rr <= 11) score += 1;
    else if (rr >= 12 && rr <= 20) score += 0;
    else if (rr >= 21 && rr <= 24) score += 2;
    else if (rr >= 25) score += 3;
  }

  // 2. SpO2 & Oxygen Scale
  if (vitals.spo2 !== undefined) {
    const spo2 = vitals.spo2;
    const scale = vitals.spo2Scale ?? 1;

    if (scale === 1) {
      if (spo2 <= 91) score += 3;
      else if (spo2 >= 92 && spo2 <= 93) score += 2;
      else if (spo2 >= 94 && spo2 <= 95) score += 1;
      else if (spo2 >= 96) score += 0;
    } else {
      // Scale 2 (Target 88-92% for hypercapnic respiratory failure)
      if (spo2 <= 83) score += 3;
      else if (spo2 >= 84 && spo2 <= 85) score += 2;
      else if (spo2 >= 86 && spo2 <= 87) score += 1;
      else if (spo2 >= 88 && spo2 <= 92) score += 0;
      else if (spo2 >= 93 && spo2 <= 94) score += 1;
      else if (spo2 >= 95 && spo2 <= 96) score += 2;
      else if (spo2 >= 97) score += 3;
    }
  }

  // 3. Air or Oxygen (Supplemental Oxygen)
  if (vitals.supplementalOxygen !== undefined) {
    if (vitals.supplementalOxygen) {
      score += 2;
    }
  }

  // 4. Systolic BP (mmHg)
  if (vitals.systolicBp !== undefined) {
    const bp = vitals.systolicBp;
    if (bp <= 90) score += 3;
    else if (bp >= 91 && bp <= 100) score += 2;
    else if (bp >= 101 && bp <= 110) score += 1;
    else if (bp >= 111 && bp <= 219) score += 0;
    else if (bp >= 220) score += 3;
  }

  // 5. Heart Rate / Pulse (bpm)
  if (vitals.pulseRate !== undefined) {
    const hr = vitals.pulseRate;
    if (hr <= 40) score += 3;
    else if (hr >= 41 && hr <= 50) score += 1;
    else if (hr >= 51 && hr <= 90) score += 0;
    else if (hr >= 91 && hr <= 110) score += 1;
    else if (hr >= 111 && hr <= 130) score += 2;
    else if (hr >= 131) score += 3;
  }

  // 6. Temperature (Celsius)
  if (vitals.temperature !== undefined) {
    const temp = vitals.temperature;
    if (temp <= 35.0) score += 3;
    else if (temp >= 35.1 && temp <= 36.0) score += 1;
    else if (temp >= 36.1 && temp <= 38.0) score += 0;
    else if (temp >= 38.1 && temp <= 39.0) score += 1;
    else if (temp >= 39.1) score += 2;
  }

  // 7. Consciousness / AVPU
  if (vitals.consciousness !== undefined) {
    const avpu = vitals.consciousness;
    if (avpu !== "A") {
      score += 3; // Voice, Pain, Unresponsive, or New Confusion (C)
    }
  }

  // Determine Risk Level, Color, and Clinical Response Frequency
  let riskLevel: "Low" | "Medium" | "High" = "Low";
  let triggerColor: "green" | "yellow" | "red" = "green";
  let frequencyText = "12-hourly monitoring";

  // Score thresholds according to RCP guidelines:
  // - Low risk: 1-4 points (Frequency: 4 to 6-hourly)
  // - Medium risk: 5-6 points or a single red score of 3 (Frequency: Hourly monitoring)
  // - High risk: 7 or more points (Frequency: Continuous monitoring)
  const hasSingleScoreOfThree = (): boolean => {
    // Check if any single parameter scores a 3
    if (vitals.respirationRate !== undefined && (vitals.respirationRate <= 8 || vitals.respirationRate >= 25)) return true;
    if (vitals.spo2 !== undefined) {
      const scale = vitals.spo2Scale ?? 1;
      if (scale === 1 && vitals.spo2 <= 91) return true;
      if (scale === 2 && (vitals.spo2 <= 83 || vitals.spo2 >= 97)) return true;
    }
    if (vitals.systolicBp !== undefined && (vitals.systolicBp <= 90 || vitals.systolicBp >= 220)) return true;
    if (vitals.pulseRate !== undefined && (vitals.pulseRate <= 40 || vitals.pulseRate >= 131)) return true;
    if (vitals.temperature !== undefined && vitals.temperature <= 35.0) return true;
    if (vitals.consciousness !== undefined && vitals.consciousness !== "A") return true;
    return false;
  };

  if (score >= 7) {
    riskLevel = "High";
    triggerColor = "red";
    frequencyText = "Continuous monitoring & immediate clinical escalation";
  } else if (score >= 5 || hasSingleScoreOfThree()) {
    riskLevel = "Medium";
    triggerColor = "yellow";
    frequencyText = "Hourly monitoring & urgent clinician review";
  } else if (score >= 1) {
    riskLevel = "Low";
    triggerColor = "green";
    frequencyText = "4 to 6-hourly monitoring";
  }

  return {
    score,
    riskLevel,
    triggerColor,
    frequencyText,
  };
}

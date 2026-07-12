import { describe, it, expect } from "vitest";
import { calculateNEWS2, VitalsPayload } from "../lib/ews";

describe("NEWS2 Clinical Early Warning Score Engine", () => {
  it("should return a score of 0, Low risk, and green color for a perfectly stable patient", () => {
    const stableVitals: Partial<VitalsPayload> = {
      respirationRate: 16,
      spo2: 98,
      spo2Scale: 1,
      supplementalOxygen: false,
      systolicBp: 120,
      pulseRate: 72,
      temperature: 36.6,
      consciousness: "A",
    };

    const result = calculateNEWS2(stableVitals);
    expect(result.score).toBe(0);
    expect(result.riskLevel).toBe("Low");
    expect(result.triggerColor).toBe("green");
    expect(result.frequencyText).toBe("12-hourly monitoring");
  });

  it("should score 3 points for a single red-score criteria and trigger Medium risk", () => {
    // A patient with normal vitals except severe hypothermia (Temp <= 35)
    // Temp = 34.8 -> scores 3. Overall score = 3, but risk level is Medium because of single red-parameter rule.
    const hypothermiaVitals: Partial<VitalsPayload> = {
      respirationRate: 16,
      spo2: 98,
      spo2Scale: 1,
      supplementalOxygen: false,
      systolicBp: 120,
      pulseRate: 72,
      temperature: 34.8,
      consciousness: "A",
    };

    const result = calculateNEWS2(hypothermiaVitals);
    expect(result.score).toBe(3);
    expect(result.riskLevel).toBe("Medium");
    expect(result.triggerColor).toBe("yellow");
    expect(result.frequencyText).toBe("Hourly monitoring & urgent clinician review");
  });

  it("should correctly handle SpO2 Scale 2 (COPD Target 88-92%) scoring", () => {
    // COPD Patient with SpO2 of 89% on supplemental oxygen (should score 0 for SpO2, and 2 for supplemental oxygen)
    const copdOxygenVitals: Partial<VitalsPayload> = {
      respirationRate: 16,
      spo2: 89,
      spo2Scale: 2,
      supplementalOxygen: true,
      systolicBp: 120,
      pulseRate: 72,
      temperature: 36.6,
      consciousness: "A",
    };

    const result = calculateNEWS2(copdOxygenVitals);
    expect(result.score).toBe(2); // Only 2 points (for supplemental oxygen)
    expect(result.riskLevel).toBe("Low");
    expect(result.triggerColor).toBe("green");

    // Hyperoxia test (SpO2 = 98% on Scale 2 should score 3 points for hyperoxia risk!)
    const hyperoxiaVitals: Partial<VitalsPayload> = {
      respirationRate: 16,
      spo2: 98,
      spo2Scale: 2,
      supplementalOxygen: true,
      systolicBp: 120,
      pulseRate: 72,
      temperature: 36.6,
      consciousness: "A",
    };

    const hyperoxiaResult = calculateNEWS2(hyperoxiaVitals);
    expect(hyperoxiaResult.score).toBe(5); // 3 (SpO2 >= 97) + 2 (Oxygen)
    expect(hyperoxiaResult.riskLevel).toBe("Medium");
    expect(hyperoxiaResult.triggerColor).toBe("yellow");
  });

  it("should classify scores >= 7 as High Risk with red trigger alerts", () => {
    // Severe multi-system distress:
    // RR = 26 (+3), SpO2 = 88% (+3), supplementalOxygen = true (+2), pulse = 135 (+3)
    const criticalVitals: Partial<VitalsPayload> = {
      respirationRate: 26,
      spo2: 88,
      spo2Scale: 1,
      supplementalOxygen: true,
      systolicBp: 115,
      pulseRate: 135,
      temperature: 37.0,
      consciousness: "A",
    };

    const result = calculateNEWS2(criticalVitals);
    expect(result.score).toBe(11);
    expect(result.riskLevel).toBe("High");
    expect(result.triggerColor).toBe("red");
    expect(result.frequencyText).toBe("Continuous monitoring & immediate clinical escalation");
  });
});

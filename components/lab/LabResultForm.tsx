"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import type { LabTest, LabTestComponent, LabResultValue } from "@/types/lab";
import { Loader2 } from "lucide-react";

interface LabResultFormProps {
  labTestId: number;
  onValuesChange: (values: LabResultValue[]) => void;
  onMetadataChange: (meta: { specimen_quality?: string; clinical_comment?: string; interpretation?: string }) => void;
}

function parseReferenceRange(ref: string | null): { low: number | null; high: number | null } {
  if (!ref) return { low: null, high: null };
  const match = ref.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (match) return { low: parseFloat(match[1]), high: parseFloat(match[2]) };
  const ltMatch = ref.match(/<\s*([\d.]+)/);
  if (ltMatch) return { low: null, high: parseFloat(ltMatch[1]) };
  const gtMatch = ref.match(/>\s*([\d.]+)/);
  if (gtMatch) return { low: parseFloat(gtMatch[1]), high: null };
  return { low: null, high: null };
}

function getAbnormalFlag(value: number | null, low: number | null, high: number | null): string | null {
  if (value === null || (low === null && high === null)) return null;
  if (low !== null && value < low) return 'L';
  if (high !== null && value > high) return 'H';
  return null;
}

function ComponentInput({
  component,
  value,
  onChange,
}: {
  component: LabTestComponent;
  value: LabResultValue;
  onChange: (val: Partial<LabResultValue>) => void;
}) {
  const ref = parseReferenceRange(component.reference_range);
  const flag = value.numeric_value !== null ? getAbnormalFlag(value.numeric_value, ref.low, ref.high) : null;

  if (component.result_type === 'NUMERIC' || component.result_type === 'COUNT' || component.result_type === 'PERCENTAGE' || component.result_type === 'RATIO') {
    return (
      <div className="flex items-center gap-3">
        <input
          type="number"
          step="any"
          className="flex-1 px-3 py-2 border border-input rounded-lg text-sm font-mono focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
          value={value.numeric_value ?? ''}
          onChange={(e) => onChange({ numeric_value: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder="—"
        />
        {component.unit && <span className="text-xs text-muted-foreground whitespace-nowrap">{component.unit}</span>}
        {flag && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${flag === 'H' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {flag}
          </span>
        )}
      </div>
    );
  }

  if (component.result_type === 'QUALITATIVE') {
    const options = component.reference_range?.split('/').map(s => s.trim()).filter(Boolean) || ['Positive', 'Negative'];
    return (
      <select
        value={value.coded_value ?? ''}
        onChange={(e) => onChange({ coded_value: e.target.value || null })}
        className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
      >
        <option value="">Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  if (component.result_type === 'ORDINAL') {
    const options = ['Negative', 'Trace', '1+', '2+', '3+', '4+'];
    return (
      <select
        value={value.coded_value ?? ''}
        onChange={(e) => onChange({ coded_value: e.target.value || null })}
        className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
      >
        <option value="">Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  if (component.result_type === 'CODED') {
    const options = component.reference_range?.split('/').map(s => s.trim()).filter(Boolean) || [];
    return (
      <select
        value={value.coded_value ?? ''}
        onChange={(e) => onChange({ coded_value: e.target.value || null })}
        className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
      >
        <option value="">Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }

  // TEXT, NARRATIVE, TITRE
  return (
    <input
      type="text"
      className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
      value={value.text_value ?? ''}
      onChange={(e) => onChange({ text_value: e.target.value || null })}
      placeholder="—"
    />
  );
}

export default function LabResultForm({ labTestId, onValuesChange, onMetadataChange }: LabResultFormProps) {
  const { token } = useAuth();
  const [labTest, setLabTest] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<number, LabResultValue>>({});
  const [specimenQuality, setSpecimenQuality] = useState("");
  const [clinicalComment, setClinicalComment] = useState("");
  const [interpretation, setInterpretation] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/lab-tests/${labTestId}`, token)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        setLabTest(data);
        // Initialize values from components
        const initialValues: Record<number, LabResultValue> = {};
        (data.components || []).forEach((comp: LabTestComponent) => {
          const ref = parseReferenceRange(comp.reference_range);
          initialValues[comp.id] = {
            component_id: comp.id,
            numeric_value: null,
            text_value: null,
            coded_value: null,
            unit: comp.unit,
            reference_low: ref.low,
            reference_high: ref.high,
            reference_text: comp.reference_range,
            abnormal_flag: null,
            critical_flag: null,
            method: null,
            display_order: comp.display_order,
          };
        });
        setValues(initialValues);
      })
      .catch(() => { if (!cancelled) setError("Failed to load test definition."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [labTestId, token]);

  // Propagate values up
  useEffect(() => {
    const arr = Object.values(values).filter(v => v.numeric_value !== null || v.text_value !== null || v.coded_value !== null);
    onValuesChange(arr);
  }, [values, onValuesChange]);

  useEffect(() => {
    onMetadataChange({
      specimen_quality: specimenQuality || undefined,
      clinical_comment: clinicalComment || undefined,
      interpretation: interpretation || undefined,
    });
  }, [specimenQuality, clinicalComment, interpretation, onMetadataChange]);

  const updateValue = useCallback((componentId: number, patch: Partial<LabResultValue>) => {
    setValues(prev => {
      const existing = prev[componentId];
      if (!existing) return prev;
      const updated = { ...existing, ...patch };
      // Auto-calculate flags for numeric
      if (updated.numeric_value !== null && (updated.reference_low !== null || updated.reference_high !== null)) {
        updated.abnormal_flag = getAbnormalFlag(updated.numeric_value, updated.reference_low, updated.reference_high);
      }
      return { ...prev, [componentId]: updated };
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading test definition...
      </div>
    );
  }

  if (error || !labTest) {
    return <div className="p-4 text-sm text-destructive">{error || "Test not found."}</div>;
  }

  const components = labTest.components || [];

  return (
    <div className="space-y-4">
      {/* Test header */}
      <div className="flex items-center gap-3 pb-3 border-b">
        <div>
          <p className="text-sm font-semibold text-foreground">{labTest.name}</p>
          <p className="text-xs text-muted-foreground">
            {labTest.category?.name} · {labTest.specimen_type?.name || "Specimen TBD"}
            {labTest.is_panel && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Panel</span>}
          </p>
        </div>
      </div>

      {/* Component inputs */}
      {labTest.result_type === 'NARRATIVE' ? (
        <div className="space-y-3">
          {components.map(comp => (
            <div key={comp.id}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{comp.name}</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={values[comp.id]?.text_value ?? ''}
                onChange={(e) => updateValue(comp.id, { text_value: e.target.value || null })}
                placeholder={`Enter ${comp.name.toLowerCase()}...`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parameter</th>
                <th className="py-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Result</th>
                <th className="py-2 pl-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference</th>
              </tr>
            </thead>
            <tbody>
              {components.map(comp => (
                <tr key={comp.id} className="border-b last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="text-sm font-medium text-foreground">{comp.name}</span>
                    {comp.unit && <span className="text-xs text-muted-foreground ml-1">({comp.unit})</span>}
                  </td>
                  <td className="py-2.5 px-4 min-w-[180px]">
                    <ComponentInput
                      component={comp}
                      value={values[comp.id] || { component_id: comp.id, numeric_value: null, text_value: null, coded_value: null, display_order: comp.display_order }}
                      onChange={(patch) => updateValue(comp.id, patch)}
                    />
                  </td>
                  <td className="py-2.5 pl-4 text-xs text-muted-foreground whitespace-nowrap">
                    {comp.reference_range || "Lab-specific"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Result envelope */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Specimen Quality</label>
          <select
            value={specimenQuality}
            onChange={(e) => setSpecimenQuality(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
          >
            <option value="">N/A</option>
            <option value="adequate">Adequate</option>
            <option value="suboptimal">Suboptimal</option>
            <option value="insufficient">Insufficient</option>
            <option value="clotted">Clotted</option>
            <option value="haemolysed">Haemolysed</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Interpretation</label>
          <input
            type="text"
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            placeholder="Clinical interpretation (optional)"
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Clinical Comment</label>
        <textarea
          rows={2}
          value={clinicalComment}
          onChange={(e) => setClinicalComment(e.target.value)}
          placeholder="Additional laboratory comments (optional)"
          className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
        />
      </div>
    </div>
  );
}

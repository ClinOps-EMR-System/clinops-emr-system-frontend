'use client';

import { useState, useEffect } from 'react';
import { SectionHeader, FormActions } from '@/components/ui/PageLayout';
import { Button } from '@/components/ui/button';
import { DoorOpen, Plus, Search } from 'lucide-react';
import { useAuth } from '@/store/RoleContext';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import SelectField from '@/components/ui/SelectField';
import { useToast } from '@/components/ui/Toast';

type Ward = {
  id: number;
  name: string;
  code: string;
  ward_type: string;
  total_beds: number;
  beds_count?: number;
  created_at: string;
};

const WARD_TYPES = [
  { label: 'General', value: 'General' },
  { label: 'ICU', value: 'ICU' },
  { label: 'HDU', value: 'HDU' },
  { label: 'Maternity', value: 'Maternity' },
  { label: 'Paediatric', value: 'Paediatric' },
  { label: 'Isolation', value: 'Isolation' },
  { label: 'Surgical', value: 'Surgical' },
  { label: 'Medical', value: 'Medical' },
  { label: 'Emergency', value: 'Emergency' },
  { label: 'Observation', value: 'Observation' },
];

export default function WardsManagementPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    ward_type: '',
    total_beds: 0,
  });

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (token) fetchWards();
  }, [token, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchWards = async () => {
    try {
      setLoading(true);
      let endpoint = `/wards`;
      if (debouncedSearch.trim()) endpoint += `?search=${encodeURIComponent(debouncedSearch)}`;
      const response = await api.get(endpoint, token);
      if (response && response.data) {
        setWards(response.data);
      }
    } catch (err) {
      console.error("Failed to load wards", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWard = () => {
    setEditingWard(null);
    setErrors({});
    setFormData({ name: '', code: '', ward_type: '', total_beds: 0 });
    setIsModalOpen(true);
  };

  const handleEditWard = (ward: Ward) => {
    setEditingWard(ward);
    setErrors({});
    setFormData({
      name: ward.name,
      code: ward.code,
      ward_type: ward.ward_type,
      total_beds: ward.total_beds,
    });
    setIsModalOpen(true);
  };

  const handleSaveWard = async () => {
    setErrors({});
    setIsSubmitting(true);
    try {
      if (editingWard) {
        await api.put(`/wards/${editingWard.id}`, formData, token);
        addToast("Success", "Ward updated successfully", "success");
      } else {
        await api.post(`/wards`, formData, token);
        addToast("Success", "Ward created successfully", "success");
      }
      setIsModalOpen(false);
      fetchWards();
    } catch (err: any) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        addToast("Error", err.message || "Failed to save ward", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans pb-12">
      <SectionHeader
        title="Ward Management"
        description="Configure and manage hospital wards, bed capacities, and status."
        action={
          <div className="flex gap-2">
            <Button variant="default" size="default" onClick={handleAddWard}>
              <Plus className="w-4 h-4 mr-2" />
              Add Ward
            </Button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search wards by name or code..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#becab7] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-clinical-primary focus:border-transparent transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded border border-[#becab7]/50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
             <div className="w-8 h-8 border-4 border-gray-200 border-t-clinical-primary rounded-full animate-spin"></div>
          </div>
        ) : wards.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-[#5f5e5e] uppercase text-[11px] font-bold tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Ward Name</th>
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Total Beds</th>
                  <th className="px-6 py-4">Configured Beds</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wards.map((ward) => (
                  <tr key={ward.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#1b1c1c]">{ward.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-[#5f5e5e] px-2 py-1 rounded text-xs font-bold uppercase">
                        {ward.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#5f5e5e]">{ward.ward_type}</td>
                    <td className="px-6 py-4 text-[#1b1c1c] font-medium">{ward.total_beds}</td>
                    <td className="px-6 py-4 text-[#1b1c1c] font-medium">
                      {ward.beds_count !== undefined ? ward.beds_count : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditWard(ward)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <DoorOpen className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-[#1b1c1c] mb-2">No Wards Found</h3>
            <p className="text-[#5f5e5e] max-w-sm mb-6">
              No wards matched your search, or none have been created yet. Create your first ward to start tracking bed occupancy and admissions.
            </p>
            <Button variant="outline" size="default" onClick={() => { if(search) setSearch(''); else handleAddWard(); }}>
              {search ? 'Clear Search' : 'Add Ward'}
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWard ? "Edit Ward" : "Add New Ward"}
        subtitle="Provide the ward details and capacity below."
        size="md"
        footer={
          <FormActions
            onCancel={() => setIsModalOpen(false)}
            onSubmit={handleSaveWard}
            submitLabel={editingWard ? "Save Changes" : "Create Ward"}
            loading={isSubmitting}
            loadingLabel="Saving..."
          />
        }
      >
        <div className="space-y-4 pt-2">
          <FormField
            label="Ward Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. Male Surgical Ward"
          />
          <FormField
            label="Ward Code"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            error={errors.code}
            placeholder="e.g. MSW-01"
            hint="A unique short code for the ward."
          />
          <SelectField
            label="Ward Type"
            required
            value={formData.ward_type}
            onChange={(e) => setFormData({ ...formData, ward_type: e.target.value })}
            options={WARD_TYPES}
            error={errors.ward_type}
            placeholder="Select a ward type..."
          />
          <FormField
            label="Total Capacity (Beds)"
            required
            type="number"
            min="0"
            value={formData.total_beds}
            onChange={(e) => setFormData({ ...formData, total_beds: parseInt(e.target.value) || 0 })}
            error={errors.total_beds}
            hint="Maximum number of beds this ward can accommodate."
          />
        </div>
      </Modal>
    </div>
  );
}

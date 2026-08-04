'use client';

import { useState, useEffect } from 'react';
import { Bed, Clock, LogIn, RefreshCw, X, ChevronRight } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { SectionHeader } from '@/components/ui/PageLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/RoleContext';
import { api } from '@/lib/api';

type Patient = {
  id: number;
  first_name: string;
  last_name: string;
};

type Admission = {
  id: number;
  admission_date: string;
  acuity_level: string;
  patient: Patient;
};

type BedType = {
  id: number;
  bed_number: string;
  occupancy_status: string;
  current_admission?: Admission;
  currentAdmission?: Admission;
};

type Ward = {
  id: number;
  name: string;
  code: string;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
  beds: BedType[];
};

export default function OccupancyMap() {
  const { token } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState<BedType | null>(null);

  useEffect(() => {
    if (token) fetchWards();
  }, [token]);

  const fetchWards = async () => {
    try {
      setLoading(true);
      const data = await api.get('/v1/wards/occupancy', token);
      if (data && data.data) {
        setWards(data.data);
      } else if (Array.isArray(data)) {
        setWards(data);
      }
    } catch (err) {
      console.error('Failed to load wards', err);
    } finally {
      setLoading(false);
    }
  };

  const getAcuityColor = (acuity: string) => {
    switch (acuity?.toLowerCase()) {
      case 'critical': return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'urgent': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'stable': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getBedStyles = (status: string) => {
    switch (status) {
      case 'Occupied': return 'bg-rose-50/50 border-rose-200 hover:border-rose-400 text-rose-900';
      case 'Available': return 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400 text-emerald-900';
      case 'Cleaning': 
      case 'Maintenance': return 'bg-amber-50/50 border-amber-200 hover:border-amber-400 text-amber-900';
      case 'Reserved': 
      case 'Isolation': return 'bg-indigo-50/50 border-indigo-200 hover:border-indigo-400 text-indigo-900';
      default: return 'bg-gray-50/50 border-gray-200 hover:border-gray-400 text-gray-900';
    }
  };

  const getInitials = (patient?: Patient) => {
    if (!patient) return '';
    return `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase();
  };

  const calculateDaysAdmitted = (dateString?: string) => {
    if (!dateString) return 0;
    return differenceInDays(new Date(), new Date(dateString));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans pb-12">
      <SectionHeader
        title="Ward & Bed Occupancy"
        description="Real-time interactive map of all hospital beds and current admissions."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchWards} disabled={loading} size="default">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="default" size="default">
              View Admissions
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded border border-[#becab7]/50 shadow-sm">
        <span className="text-sm font-semibold text-[#5f5e5e] mr-2">Legend:</span>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-800">
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Available
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded bg-rose-50 border border-rose-100 text-rose-800">
           <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Occupied
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded bg-amber-50 border border-amber-100 text-amber-800">
           <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Cleaning / Maintenance
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-800">
           <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> Reserved / Isolation
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded border border-[#becab7]/50 shadow-sm">
           <div className="w-8 h-8 border-4 border-gray-200 border-t-clinical-primary rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {wards.map((ward) => (
            <div key={ward.id} className="bg-white rounded border border-[#becab7]/50 p-6 shadow-sm relative overflow-hidden">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 pb-6 border-b border-gray-100 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1b1c1c] flex items-center gap-3">
                    {ward.name} 
                    <span className="text-xs font-bold bg-gray-100 text-[#5f5e5e] px-2 py-0.5 rounded uppercase tracking-wider">{ward.code}</span>
                  </h2>
                </div>
                <div className="flex gap-8">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Occupancy</span>
                    <span className="text-xl font-bold text-[#1b1c1c]">{ward.occupancy_rate}%</span>
                  </div>
                  <div className="w-px h-10 bg-gray-100 self-center hidden sm:block"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Available</span>
                    <span className="text-xl font-bold text-emerald-600">{ward.available_beds}</span>
                  </div>
                  <div className="w-px h-10 bg-gray-100 self-center hidden sm:block"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-[#5f5e5e] uppercase tracking-wider mb-1">Total Beds</span>
                    <span className="text-xl font-bold text-[#1b1c1c]">{ward.total_beds}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {ward.beds.map((bed) => {
                  const admission = bed.current_admission || (bed as any).currentAdmission;
                  return (
                    <div 
                      key={bed.id} 
                      onClick={() => setSelectedBed(bed)}
                      className={`relative flex flex-col justify-between p-4 h-[120px] rounded border transition-all cursor-pointer hover:shadow-md active:translate-y-[1px] group/bed ${getBedStyles(bed.occupancy_status)}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-base font-bold opacity-80 tracking-tight">
                          {bed.bed_number}
                        </span>
                        <Bed className="w-4 h-4 opacity-40 mix-blend-multiply" />
                      </div>
                      
                      {bed.occupancy_status === 'Occupied' && admission ? (
                        <div className="mt-auto">
                          <div className="flex items-center justify-between mb-2">
                             <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center font-bold text-[#1b1c1c] text-xs border border-gray-100">
                               {getInitials(admission.patient)}
                             </div>
                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm ${getAcuityColor(admission.acuity_level)}`}>
                               {admission.acuity_level}
                             </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold opacity-75 uppercase tracking-wide">
                            <Clock className="w-3 h-3" /> 
                            {calculateDaysAdmitted(admission.admission_date)} days
                          </div>
                        </div>
                      ) : bed.occupancy_status === 'Available' ? (
                        <div className="mt-auto flex justify-center py-2 h-full items-end">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover/bed:opacity-100 transition-opacity translate-y-1 group-hover/bed:translate-y-0 duration-200">
                             <LogIn className="w-3.5 h-3.5" /> Quick Admit
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto flex justify-center py-2 h-full items-end">
                           <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-center">
                             {bed.occupancy_status}
                           </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Drawer */}
      {selectedBed && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-gray-900/20 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedBed(null)} 
          />
          <div className="relative w-full max-w-[400px] bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-gray-200">
            <div className={`h-32 flex items-end p-6 relative overflow-hidden border-b ${
              selectedBed.occupancy_status === 'Occupied' ? 'bg-rose-50 border-rose-200 text-rose-900' : 
              selectedBed.occupancy_status === 'Available' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}>
              <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-2 -translate-y-2">
                <Bed className="w-24 h-24" />
              </div>
              <h2 className="text-2xl font-bold flex items-center gap-3 relative z-10">
                 Bed {selectedBed.bed_number}
              </h2>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
              <div className="mb-6 flex justify-between items-center bg-white p-3 rounded border border-gray-200 shadow-sm">
                 <span className="text-[10px] font-bold text-[#5f5e5e] uppercase tracking-wider">Current Status</span>
                 <span className={`px-2.5 py-1 rounded text-xs font-bold ${getBedStyles(selectedBed.occupancy_status).split(' ')[0]} text-${getBedStyles(selectedBed.occupancy_status).split('text-')[1]} border border-transparent`}>
                   {selectedBed.occupancy_status}
                 </span>
              </div>
              
              {selectedBed.occupancy_status === 'Occupied' && (selectedBed.current_admission || (selectedBed as any).currentAdmission) && (
                <div className="space-y-4">
                  {(() => {
                    const admission = selectedBed.current_admission || (selectedBed as any).currentAdmission;
                    return (
                      <>
                        <div className="bg-white rounded p-5 shadow-sm border border-gray-200">
                          <h3 className="text-[10px] font-bold text-[#5f5e5e] uppercase tracking-wider mb-4 border-b pb-2">Patient Details</h3>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="w-14 h-14 rounded-full bg-gray-100 text-[#1b1c1c] font-bold text-lg flex items-center justify-center border border-gray-200 shadow-sm">
                              {getInitials(admission.patient)}
                            </div>
                            <div>
                              <p className="text-base font-bold text-[#1b1c1c]">{admission.patient?.first_name} {admission.patient?.last_name}</p>
                              <p className="text-xs font-medium text-[#5f5e5e] mt-0.5">Admitted: {new Date(admission.admission_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded p-5 shadow-sm border border-gray-200">
                          <h3 className="text-[10px] font-bold text-[#5f5e5e] uppercase tracking-wider mb-4 border-b pb-2">Clinical Info</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[#5f5e5e] text-sm font-medium">Acuity Level</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${getAcuityColor(admission.acuity_level)}`}>
                                {admission.acuity_level}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[#5f5e5e] text-sm font-medium">Duration</span>
                              <span className="font-bold text-[#1b1c1c] bg-gray-100 px-2 py-0.5 rounded text-sm border border-gray-200">
                                {calculateDaysAdmitted(admission.admission_date)} Days
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <Button className="w-full h-10" variant="default">
                            Open Full Record
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {selectedBed.occupancy_status === 'Available' && (
                <div className="flex flex-col items-center justify-center h-48 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100">
                    <LogIn className="w-8 h-8 ml-1" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-[#1b1c1c]">Bed is Ready</h3>
                    <p className="text-[#5f5e5e] text-sm mt-1">Available for immediate admission.</p>
                  </div>
                  <Button className="mt-2" variant="default">
                    Quick Admit Patient
                  </Button>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setSelectedBed(null)}
              className="absolute top-4 right-4 w-8 h-8 bg-black/5 hover:bg-black/10 text-[#1b1c1c] rounded-full flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

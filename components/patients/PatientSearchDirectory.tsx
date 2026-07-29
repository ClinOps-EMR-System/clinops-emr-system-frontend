"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { Patient } from "@/types/patient";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/PageLayout";
import PatientSearchToolbar from "./PatientSearchToolbar";
import PatientSearchTable from "./PatientSearchTable";

export default function PatientSearchDirectory() {
  const { token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  async function fetchPatients(page = 1) {
    try {
      setLoading(true);
      setError(null);
      let endpoint = `/patients?page=${page}&per_page=10`;
      if (debouncedSearch.trim()) endpoint += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (genderFilter) endpoint += `&gender=${genderFilter}`;
      if (categoryFilter) endpoint += `&patient_category=${categoryFilter}`;
      if (incompleteFilter) endpoint += `&incomplete=1`;

      const response = await api.get(endpoint, token);
      if (response) {
        setPatients(response.data || []);
        setCurrentPage(response.meta?.current_page || 1);
        setTotalPages(response.meta?.last_page || 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to retrieve patients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) fetchPatients(1); // eslint-disable-line react-hooks/set-state-in-effect
  }, [token, debouncedSearch, genderFilter, categoryFilter, incompleteFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearFilters = () => {
    setSearch("");
    setGenderFilter("");
    setCategoryFilter("");
    setIncompleteFilter(false);
  };

  const hasFilters = !!(search || genderFilter || categoryFilter || incompleteFilter);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <SectionHeader
        title="Patient Search"
        description="Lookup, filter, and access clinical logs for patients active in the hospital."
        action={
          <Button render={<Link href="/patients/register" />} nativeButton={false}>
            Patient Registration
          </Button>
        }
      />

      <PatientSearchToolbar
        search={search}
        onSearchChange={setSearch}
        genderFilter={genderFilter}
        onGenderFilterChange={setGenderFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        incompleteFilter={incompleteFilter}
        onIncompleteFilterChange={setIncompleteFilter}
        onClear={clearFilters}
        hasFilters={hasFilters}
      />

      <PatientSearchTable
        patients={patients}
        loading={loading}
        error={error}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={fetchPatients}
      />
    </div>
  );
}

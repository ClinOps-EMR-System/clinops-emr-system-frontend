"use client";

export function PaymentFormSkeleton() {
  return (
    <div className="bg-white rounded border border-[#becab7]/50 p-6">
      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse mb-2"></div>
          <div className="h-10 w-full bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div>
          <div className="h-3 w-20 bg-gray-100 rounded animate-pulse mb-2"></div>
          <div className="h-10 w-full bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="md:col-span-2">
          <div className="h-3 w-28 bg-gray-100 rounded animate-pulse mb-2"></div>
          <div className="h-10 w-full bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="mt-4 h-10 w-40 bg-gray-200 rounded animate-pulse opacity-50 cursor-not-allowed" title="Backend billing endpoints required"></div>
    </div>
  );
}

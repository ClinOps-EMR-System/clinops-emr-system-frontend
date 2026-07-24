"use client";

export function ReceiptPreviewSkeleton() {
  return (
    <div className="bg-white rounded border border-[#becab7]/50 p-6">
      <div className="border-2 border-dashed border-gray-200 rounded p-6 text-center">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mx-auto mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 w-64 bg-gray-100 rounded animate-pulse mx-auto"></div>
          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse mx-auto"></div>
          <div className="h-3 w-56 bg-gray-100 rounded animate-pulse mx-auto"></div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mx-auto mb-2"></div>
          <div className="h-3 w-40 bg-gray-100 rounded animate-pulse mx-auto"></div>
        </div>
        <div className="mt-4 h-9 w-36 bg-gray-200 rounded animate-pulse mx-auto opacity-50 cursor-not-allowed" title="Backend billing endpoints required"></div>
      </div>
    </div>
  );
}

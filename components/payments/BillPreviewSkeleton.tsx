"use client";

export function BillPreviewSkeleton() {
  return (
    <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center">
        <div className="w-1.5 h-6 bg-gray-300 rounded-full mr-3 animate-pulse"></div>
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
            <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${40 + i * 10}%` }}></div>
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

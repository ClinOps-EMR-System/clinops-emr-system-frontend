export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/40">
        <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-4 text-slate-600">The requested auth page could not be found.</p>
      </div>
    </div>
  );
}

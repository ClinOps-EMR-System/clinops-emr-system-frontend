"use client";

import Modal from "../ui/Modal";
import type { BillingSummary } from "../../types/billing";

interface BillingConfirmationProps {
  billing: BillingSummary;
  onDone: () => void;
  onClose?: () => void;
}

function formatMk(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `MK ${amount.toLocaleString()}` : "MK 0";
}

export default function BillingConfirmation({ billing, onDone, onClose }: BillingConfirmationProps) {
  return (
    <Modal
      open
      onClose={onClose ?? onDone}
      title="Charges Added to Bill"
      subtitle={`Bill ${billing.bill_number}`}
      size="md"
      footer={
        <>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Close
            </button>
          )}
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700"
          >
            Done
          </button>
        </>
      }
    >
      <ul className="divide-y divide-gray-100">
        {billing.items_added.map((item, index) => (
          <li key={index} className="py-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.item_name}</p>
              <p className="text-xs text-gray-500">
                {formatMk(item.unit_price)} × {item.quantity}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-900">{formatMk(item.total)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">{billing.payment_status}</span>
        <span className="text-base font-bold text-gray-900">{formatMk(billing.running_total)}</span>
      </div>
    </Modal>
  );
}

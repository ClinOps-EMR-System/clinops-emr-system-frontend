"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "@/lib/services/admin";
import type {
  PayChanguChargeResult,
  PayChanguOperator,
} from "@/lib/services/admin";

export const PAYCHANGU_POLL_INTERVAL_MS = 5000;
export const PAYCHANGU_POLL_LIMIT_MS = 120000;

interface UsePayChanguChargeOptions {
  token: string | null;
  onCompleted?: (charge: PayChanguChargeResult) => void;
}

export function usePayChanguCharge({ token, onCompleted }: UsePayChanguChargeOptions) {
  const [operators, setOperators] = useState<PayChanguOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [operatorRef, setOperatorRef] = useState("");
  const [charge, setCharge] = useState<PayChanguChargeResult | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billIdRef = useRef<number | null>(null);
  const onCompletedRef = useRef(onCompleted);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
  });

  const loadOperators = useCallback(async () => {
    setOperatorsLoading(true);
    setOperatorsError(null);
    try {
      const res = await adminApi.getPayChanguOperators(token);
      setOperators(res.operators ?? []);
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      setOperators([]);
      setOperatorsError(
        apiError.status === 404
          ? "PayChangu is not configured on the backend."
          : apiError.message || "Unable to load PayChangu operators."
      );
    } finally {
      setOperatorsLoading(false);
    }
  }, [token]);

  const ensureOperatorsLoaded = useCallback(() => {
    if (operators.length === 0 && !operatorsLoading && !operatorsError) {
      void loadOperators();
    }
  }, [operators.length, operatorsLoading, operatorsError, loadOperators]);

  const initialize = useCallback(
    async (billId: number, amount: number) => {
      if (!token) throw new Error("Not authenticated.");
      billIdRef.current = billId;
      const result = await adminApi.initializePayChanguPayment(token, billId, {
        mobile,
        operator_ref_id: operatorRef,
        amount,
      });
      setCharge(result);
      setPolling(true);
      setError(null);
      return result;
    },
    [token, mobile, operatorRef]
  );

  const retry = useCallback(() => {
    setError(null);
    setOperatorsError(null);
    setPolling(true);
  }, []);

  const reset = useCallback(() => {
    billIdRef.current = null;
    setCharge(null);
    setPolling(false);
    setError(null);
    setMobile("");
    setOperatorRef("");
  }, []);

  useEffect(() => {
    const billId = billIdRef.current;
    if (!charge || !polling || !token || !billId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt >= PAYCHANGU_POLL_LIMIT_MS) {
        setPolling(false);
        setError(
          "Payment is still pending on the patient's phone. You can close this dialog; the payment will still be confirmed automatically if completed."
        );
        return;
      }
      try {
        const result = await adminApi.verifyPayChanguPayment(
          token,
          billId,
          charge.charge_id
        );
        if (cancelled) return;
        if (result.status === "completed") {
          setPolling(false);
          setCharge(null);
          onCompletedRef.current?.(charge);
          return;
        }
        timer = setTimeout(poll, PAYCHANGU_POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setPolling(false);
        setError(
          "Unable to check the payment status. The payment will still be confirmed by webhook if the patient completes it."
        );
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [charge, polling, token]);

  return {
    operators,
    operatorsLoading,
    operatorsError,
    mobile,
    setMobile,
    operatorRef,
    setOperatorRef,
    charge,
    polling,
    error,
    ensureOperatorsLoaded,
    initialize,
    retry,
    reset,
  };
}

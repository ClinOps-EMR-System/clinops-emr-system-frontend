const UNSUPPORTED_PAYMENT_METHOD_MESSAGE =
  "This payment method is not supported. Choose: Cash, Bank Transfer, Mobile Money, Insurance, Card.";

interface ApiErrorLike {
  status?: number;
  message?: string;
  errors?: Record<string, string[]>;
}

export function getPaymentMethodError(err: unknown): string | null {
  const apiError = err as ApiErrorLike | null;

  if (!apiError || typeof apiError !== "object") {
    return null;
  }

  if (!apiError.errors || !Array.isArray(apiError.errors.payment_method)) {
    return null;
  }

  return UNSUPPORTED_PAYMENT_METHOD_MESSAGE;
}

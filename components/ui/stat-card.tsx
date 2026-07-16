import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardAction, CardContent } from "@/components/ui/card";
import { tv, type VariantProps } from "tailwind-variants";

const statCardStyles = tv({
  slots: {
    stripe: "absolute left-0 top-0 bottom-0 w-[3px]",
    label: "text-xs font-bold uppercase tracking-wider m-0",
    value: "font-mono font-extrabold text-3xl m-0",
    iconBadge:
      "h-10 w-10 rounded flex items-center justify-center",
    trend: "inline-flex items-center gap-1 text-xs font-bold mt-1",
    trendArrow: "h-3 w-3",
  },
  variants: {
    color: {
      default: {
        stripe: "bg-[#368D80]",
        label: "text-[#5f5e5e]",
        value: "text-[#1b1c1c]",
        iconBadge: "bg-teal-100 text-[#368D80]",
      },
      warning: {
        stripe: "bg-amber-500",
        label: "text-[#5f5e5e]",
        value: "text-amber-600",
        iconBadge: "bg-amber-100 text-amber-600",
      },
      danger: {
        stripe: "bg-red-600",
        label: "text-[#5f5e5e]",
        value: "text-red-600",
        iconBadge: "bg-red-100 text-red-600",
      },
      info: {
        stripe: "bg-sky-500",
        label: "text-[#5f5e5e]",
        value: "text-sky-600",
        iconBadge: "bg-sky-100 text-sky-600",
      },
      success: {
        stripe: "bg-emerald-500",
        label: "text-[#5f5e5e]",
        value: "text-emerald-600",
        iconBadge: "bg-emerald-100 text-emerald-600",
      },
    },
  },
  defaultVariants: {
    color: "default",
  },
});

export interface StatCardProps
  extends Omit<React.ComponentProps<typeof Card>, "color">,
    VariantProps<typeof statCardStyles> {
  label: string;
  value: number | string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: { value: number; direction: "up" | "down" };
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  loading = false,
  className,
  ...props
}: StatCardProps) {
  const styles = statCardStyles({ color });

  if (loading) {
    return (
      <Card className={`relative overflow-hidden ${className ?? ""}`} {...props}>
        <div className={styles.stripe()} />
        <Skeleton className="h-3 w-24 mb-4" />
        <Skeleton className="h-8 w-16" />
      </Card>
    );
  }

  return (
    <Card className={`relative overflow-hidden ${className ?? ""}`} {...props}>
      <div className={styles.stripe()} />
      <CardHeader>
        <dt className={styles.label()}>{label}</dt>
        {Icon && (
          <CardAction>
            <div className={styles.iconBadge()}>
              <Icon className="h-5 w-5" />
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <dd
          className={
            typeof value === "number" && value > 0
              ? styles.value()
              : `${styles.value()} text-[#1b1c1c]`
          }
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </dd>
        {trend && (
          <div
            className={`${styles.trend()} ${
              trend.direction === "up" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {trend.direction === "up" ? (
              <svg
                className={styles.trendArrow()}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 17l9.2-9.2M17 17V7.8H7.8"
                />
              </svg>
            ) : (
              <svg
                className={styles.trendArrow()}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 7l-9.2 9.2M7 7v9.2h9.2"
                />
              </svg>
            )}
            <span>{trend.value}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

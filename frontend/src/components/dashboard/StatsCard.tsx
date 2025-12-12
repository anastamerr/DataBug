import type { ReactNode } from "react";

type Props = {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
};

export function StatsCard({ title, value, subtitle, icon }: Props) {
  return (
    <div className="surface-solid p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-black/50">
            {title}
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight">{value}</div>
          {subtitle && (
            <div className="mt-1 text-xs font-medium text-black/50">{subtitle}</div>
          )}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/5">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

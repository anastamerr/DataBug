import type { ReactNode } from "react";

type Props = {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
};

export function StatsCard({ title, value, subtitle, icon }: Props) {
  return (
    <div className="surface-solid p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            {title}
          </div>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            {value}
          </div>
          {subtitle && (
            <div className="mt-1 text-xs font-medium text-white/60">{subtitle}</div>
          )}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-card border border-white/10 bg-surface">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

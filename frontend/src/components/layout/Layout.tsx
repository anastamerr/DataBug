import { NavLink, Outlet } from "react-router-dom";

import { RealtimeListener } from "../realtime/RealtimeListener";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/incidents", label: "Incidents" },
  { to: "/bugs", label: "Bugs" },
  { to: "/correlations", label: "Correlations" },
  { to: "/predictions", label: "Predictions" },
  { to: "/chat", label: "Chat" },
  { to: "/settings", label: "Settings" },
];

function linkClass(isActive: boolean) {
  return [
    "group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold tracking-tight transition",
    isActive
      ? "active bg-white/15 text-white"
      : "text-white/80 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

export function Layout() {
  return (
    <div className="flex min-h-screen w-full p-5 text-gray-900">
      <RealtimeListener />
      <aside className="nav-surface w-72 p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-white/60">
              databug-ai
            </div>
            <div className="text-xl font-extrabold tracking-tight">DataBug AI</div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-white/10" />
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => linkClass(isActive)}
            >
              <span>{item.label}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-white/0 transition group-[.active]:bg-white/80" />
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          Real-time updates enabled via <span className="font-mono">/ws</span>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pl-5">
        <div className="surface min-h-[calc(100vh-2.5rem)] p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Milk,
  Repeat,
  Truck,
  Users,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { useAuth } from "../lib/auth";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/admin/products", label: "Products", icon: Milk },
  { to: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { to: "/admin/delivery-persons", label: "Delivery team", icon: Users },
  { to: "/admin/payments", label: "Payments", icon: Wallet },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-ink-950">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r border-white/5 bg-ink-900 px-4 py-6">
        <div className="mb-8 px-2">
          <Logo className="[&>span]:text-cream-50" />
          <p className="mt-0.5 pl-9 text-[11px] font-medium uppercase tracking-wide text-ink-400">Admin</p>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-moss-700 text-cream-50" : "text-ink-100 hover:bg-white/5"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t border-white/5 pt-4">
          <p className="px-3 text-sm font-medium text-cream-50">{user?.name}</p>
          <button
            onClick={() => {
              void logout();
              navigate("/admin/login");
            }}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-100 hover:bg-white/5"
          >
            <LogOut size={17} /> Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden bg-cream-50 p-8">
        <Outlet />
      </main>
    </div>
  );
}

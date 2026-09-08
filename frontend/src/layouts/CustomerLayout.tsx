import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, ShoppingBasket, Repeat, Receipt, User, LogOut } from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { useAuth } from "../lib/auth";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/products", label: "Shop", icon: ShoppingBasket },
  { to: "/subscriptions", label: "Subscribe", icon: Repeat },
  { to: "/bills", label: "Bills", icon: Receipt },
  { to: "/profile", label: "Profile", icon: User },
];

export function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream-50 pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-ink-100/70 bg-cream-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:max-w-5xl">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive ? "bg-moss-700 text-cream-50" : "text-ink-600 hover:bg-cream-100"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-ink-600">{user?.name}</span>
            <button
              onClick={() => {
                void logout();
                navigate("/login");
              }}
              className="btn-outline !px-3 !py-2"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:max-w-5xl">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-3xl items-stretch justify-between px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  isActive ? "text-moss-700" : "text-ink-400"
                }`
              }
            >
              <Icon size={20} strokeWidth={2.2} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

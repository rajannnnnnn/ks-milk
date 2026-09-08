import { useNavigate } from "react-router-dom";
import { MapPin, LogOut, User } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { Link } from "react-router-dom";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-ink-900">Profile</h1>

      <div className="card flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-moss-100 text-moss-700">
          <User size={24} />
        </div>
        <div>
          <p className="font-semibold text-ink-900">{user?.name}</p>
          <p className="text-sm text-ink-400">{user?.mobile ?? user?.email}</p>
        </div>
      </div>

      <Link to="/addresses" className="card flex items-center gap-3 p-4 hover:shadow-lift">
        <MapPin size={18} className="text-moss-600" />
        <span className="text-sm font-medium text-ink-900">Manage addresses</span>
      </Link>

      <button
        onClick={() => {
          void logout();
          navigate("/login");
        }}
        className="btn-outline w-full !text-clay-600"
      >
        <LogOut size={16} /> Log out
      </button>
    </div>
  );
}

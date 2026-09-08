import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { FullPageSpinner } from "./ui/Spinner";

export function ProtectedRoute({ redirectTo }: { redirectTo: string }) {
  const { user, loading } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to={redirectTo} replace />;

  return <Outlet />;
}

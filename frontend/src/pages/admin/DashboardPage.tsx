import { Users, Repeat, Package, Truck, Wallet, CheckCircle2, XCircle, IndianRupee } from "lucide-react";
import { useAdminDashboard } from "../../lib/adminHooks";
import { formatMoney } from "../../lib/format";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { StatCard } from "../../components/ui/StatCard";

export function DashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading || !data) return <FullPageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Today's operations</h1>
        <p className="text-sm text-ink-400">Live snapshot of KS MILK's business.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total customers" value={data.totalCustomers} icon={Users} />
        <StatCard label="Active subscriptions" value={data.activeSubscriptions} icon={Repeat} />
        <StatCard label="Today's orders" value={data.todaysOrders} icon={Package} />
        <StatCard label="Today's deliveries" value={data.todaysDeliveries} icon={Truck} />
        <StatCard label="Pending payments" value={data.pendingPayments} icon={Wallet} accent="clay" />
        <StatCard label="Completed payments" value={data.completedPayments} icon={CheckCircle2} />
        <StatCard label="Cancelled orders" value={data.cancelledOrders} icon={XCircle} accent="clay" />
        <StatCard label="Total sales" value={formatMoney(data.totalSales)} icon={IndianRupee} />
      </div>
    </div>
  );
}

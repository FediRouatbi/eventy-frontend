import { useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Download,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { AdminLoadingGrid } from "#/features/admin/components/AdminSurface";
import { isSuperAdminSession } from "#/features/admin/auth";
import {
  exportAdminPaymentsCsv,
  getAdminOverview,
  getAdminPayments,
  listAdminOrganizers,
} from "#/lib/api/admin";
import { useAuthSession } from "#/lib/auth";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewPage,
});

const STATUS_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

function toISODate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function toStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function AdminOverviewPage() {
  const session = useAuthSession();
  const isSuperAdmin = isSuperAdminSession(session);

  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(() => toISODate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)));
  const [toDate, setToDate] = useState(() => toISODate(today));
  const [organizerId, setOrganizerId] = useState("all");
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );

  const applyPreset = (preset: "last7" | "last30" | "thisMonth" | "lastMonth") => {
    const now = new Date();
    if (preset === "last7") {
      setFromDate(toISODate(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)));
      setToDate(toISODate(now));
      return;
    }
    if (preset === "last30") {
      setFromDate(toISODate(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)));
      setToDate(toISODate(now));
      return;
    }
    if (preset === "thisMonth") {
      setFromDate(toISODate(startOfMonth(now)));
      setToDate(toISODate(now));
      return;
    }

    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    setFromDate(toISODate(startOfMonth(previousMonth)));
    setToDate(toISODate(endOfMonth(previousMonth)));
  };

  const overviewQuery = useQuery({
    queryKey: ["admin-overview", session?.access_token],
    enabled: Boolean(session?.access_token),
    queryFn: () => getAdminOverview(session!.access_token),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const paymentsQuery = useQuery({
    queryKey: ["admin-payments", session?.access_token],
    enabled: Boolean(session?.access_token),
    queryFn: () => getAdminPayments(session!.access_token, { limit: 40 }),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const organizersQuery = useQuery({
    queryKey: ["admin-organizers", session?.access_token],
    enabled: Boolean(session?.access_token && isSuperAdmin),
    queryFn: () => listAdminOrganizers(session!.access_token),
    staleTime: 60_000,
  });

  const exportMutation = useMutation({
    mutationFn: async () =>
      exportAdminPaymentsCsv(session!.access_token, {
        from: fromDate,
        to: toDate,
        organizer_id: isSuperAdmin && organizerId !== "all" ? organizerId : undefined,
        timezone,
      }),
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename);
      toast.success("Finance export ready", {
        description: filename,
      });
    },
    onError: (error) => {
      toast.error("Failed to export CSV", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const overview = overviewQuery.data;
  const payments = paymentsQuery.data;

  const statusData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const item of payments?.items ?? []) {
      buckets.set(item.status, (buckets.get(item.status) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([status, count]) => ({
      status: toStatusLabel(status),
      count,
    }));
  }, [payments?.items]);

  const comparisonData = useMemo(() => {
    if (!overview) {
      return [];
    }
    return [
      { name: "Events", value: overview.stats.events },
      { name: "Published", value: overview.stats.published_events },
      { name: "Drafts", value: overview.stats.draft_events },
      { name: "Sessions", value: overview.stats.sessions },
      { name: "Ticket Types", value: overview.stats.ticket_types },
    ];
  }, [overview]);

  const trendData = useMemo(
    () =>
      (payments?.trends ?? []).map((point) => ({
        day: formatDate(point.day),
        gross: point.gross,
        paidOrders: point.paid_orders,
      })),
    [payments?.trends],
  );

  const topRevenueData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const item of payments?.items ?? []) {
      const key = isSuperAdmin
        ? item.organizer_name || "Unknown organizer"
        : item.event_title || "Unknown event";
      buckets.set(key, (buckets.get(key) ?? 0) + item.amount);
    }

    return [...buckets.entries()]
      .map(([name, gross]) => ({ name, gross }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 6);
  }, [isSuperAdmin, payments?.items]);

  if (overviewQuery.isLoading || paymentsQuery.isLoading) {
    return <AdminLoadingGrid rows={4} />;
  }

  if (overviewQuery.error || paymentsQuery.error || !overview || !payments) {
    const message =
      overviewQuery.error instanceof Error
        ? overviewQuery.error.message
        : paymentsQuery.error instanceof Error
          ? paymentsQuery.error.message
          : "Failed to load dashboard";
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4 text-sm text-destructive">{message}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="app-surface rounded-[1.9rem] border border-border/70 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Badge variant="outline" className="rounded-full">
              Renovated dashboard
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Finance & Operations</h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              A unified command center for revenue, payment health, and operational readiness across your event scope.
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/admin/events">
              Manage events
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.5rem] border-border/70 bg-card/95">
          <CardHeader className="pb-2">
            <CardDescription>Gross revenue</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(payments.summary.gross, payments.summary.currency)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              {payments.summary.paid_orders} paid orders
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-border/70 bg-card/95">
          <CardHeader className="pb-2">
            <CardDescription>Average order value</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(payments.summary.average_order_value, payments.summary.currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pending: {payments.summary.pending_orders} / Failed or expired: {payments.summary.failed_or_expired_orders}
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-border/70 bg-card/95">
          <CardHeader className="pb-2">
            <CardDescription>{isSuperAdmin ? "Organizers" : "Events"}</CardDescription>
            <CardTitle className="text-2xl">
              {isSuperAdmin ? overview.stats.organizers : overview.stats.events}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Published: {overview.stats.published_events} / Drafts: {overview.stats.draft_events}
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-border/70 bg-card/95">
          <CardHeader className="pb-2">
            <CardDescription>Upcoming sessions</CardDescription>
            <CardTitle className="text-2xl">{overview.upcoming_sessions.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              {overview.stats.ticket_types} ticket types configured
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="app-surface rounded-[1.75rem] border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CircleDollarSign className="size-5 text-primary" />
              Revenue trend
            </CardTitle>
            <CardDescription>Daily gross + paid orders for the last 14 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="gross" stroke="#4f46e5" fill="url(#grossFill)" name="Gross" />
                <Line yAxisId="right" type="monotone" dataKey="paidOrders" stroke="#10b981" strokeWidth={2} name="Paid orders" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="app-surface rounded-[1.75rem] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl">Payment status mix</CardTitle>
            <CardDescription>Distribution from recent payment records.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={62} outerRadius={92} paddingAngle={2}>
                  {statusData.map((entry, index) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="app-surface rounded-[1.75rem] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl">{isSuperAdmin ? "Top organizers by revenue" : "Top events by revenue"}</CardTitle>
            <CardDescription>Computed from latest payment stream.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRevenueData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value, payments.summary.currency)} />
                <Bar dataKey="gross" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="app-surface rounded-[1.75rem] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl">Catalog health snapshot</CardTitle>
            <CardDescription>Current operational distribution across core objects.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="app-surface rounded-[1.75rem] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl">Finance export</CardTitle>
            <CardDescription>Download accounting-ready CSV per organizer and date range.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => applyPreset("last7")}>
                Last 7 days
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => applyPreset("last30")}>
                Last 30 days
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => applyPreset("thisMonth")}>
                This month
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => applyPreset("lastMonth")}>
                Last month
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
              <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Filename timezone: {timezone}</p>
            {isSuperAdmin ? (
              <Select value={organizerId} onValueChange={setOrganizerId}>
                <SelectTrigger>
                  <SelectValue placeholder="All organizers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organizers</SelectItem>
                  {(organizersQuery.data ?? []).map((organizer) => (
                    <SelectItem key={organizer.id} value={organizer.id}>
                      {organizer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              type="button"
              className="rounded-full"
              disabled={!session?.access_token || exportMutation.isPending}
              onClick={() => exportMutation.mutate()}
            >
              <Download className="size-4" />
              {exportMutation.isPending ? "Preparing export..." : "Export CSV"}
            </Button>
          </CardContent>
        </Card>

        <Card className="app-surface rounded-[1.75rem] border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl">Needs attention</CardTitle>
            <CardDescription>Actions to keep your catalog sale-ready.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
              Draft events: <span className="font-semibold text-foreground">{overview.needs_attention.draft_events_count}</span>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
              Events without sessions: <span className="font-semibold text-foreground">{overview.needs_attention.events_without_sessions_count}</span>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
              Sessions without ticket types: <span className="font-semibold text-foreground">{overview.needs_attention.sessions_without_ticket_types_count}</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

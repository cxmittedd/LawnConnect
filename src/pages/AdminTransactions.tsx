import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Receipt, Download } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  title: string;
  status: string;
  payment_status: string;
  completed_at: string | null;
  created_at: string;
  base_price: number;
  final_price: number;
  platform_fee: number;
  provider_payout: number;
  discount_amount: number;
  discount_label: string | null;
  parish: string | null;
  community: string | null;
  customer_id: string | null;
  accepted_provider_id: string | null;
  customer_name: string;
  provider_name: string;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-JM", {
    style: "currency",
    currency: "JMD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const AdminTransactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [parishFilter, setParishFilter] = useState("all");
  const [communityFilter, setCommunityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    checkAdminRole();
  }, [user, navigate]);

  useEffect(() => {
    if (isAdmin) loadTransactions();
  }, [isAdmin]);

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (data) {
      setIsAdmin(true);
    } else {
      navigate("/dashboard");
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    const { data: jobs, error } = await supabase
      .from("job_requests")
      .select("id, title, status, payment_status, completed_at, created_at, base_price, final_price, platform_fee, provider_payout, parish, community, customer_id, accepted_provider_id")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false });

    if (error || !jobs) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const jobIds = jobs.map((j) => j.id);
    const userIds = Array.from(
      new Set(
        jobs.flatMap((j) => [j.customer_id, j.accepted_provider_id]).filter(Boolean) as string[]
      )
    );

    const [{ data: coupons }, { data: credits }, { data: profiles }] = await Promise.all([
      jobIds.length
        ? supabase
            .from("customer_discounts")
            .select("used_on_job_id, discount_percentage, label, code")
            .in("used_on_job_id", jobIds)
        : Promise.resolve({ data: [] as any[] }),
      jobIds.length
        ? supabase
            .from("referral_credits")
            .select("used_on_job_id, amount")
            .in("used_on_job_id", jobIds)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabase
            .from("profiles")
            .select("id, first_name, last_name, company_name")
            .in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const couponMap = new Map<string, string>();
    (coupons || []).forEach((c: any) => {
      if (c.used_on_job_id) {
        couponMap.set(
          c.used_on_job_id,
          `${c.label || "Coupon"} (${c.code || ""} ${c.discount_percentage}% off)`.trim()
        );
      }
    });

    const referralMap = new Map<string, number>();
    (credits || []).forEach((c: any) => {
      if (c.used_on_job_id) {
        referralMap.set(
          c.used_on_job_id,
          (referralMap.get(c.used_on_job_id) || 0) + Number(c.amount || 0)
        );
      }
    });

    const profileMap = new Map<string, string>();
    (profiles || []).forEach((p: any) => {
      const name =
        [p.first_name, p.last_name].filter(Boolean).join(" ").trim() ||
        p.company_name ||
        "Unknown";
      profileMap.set(p.id, name);
    });

    const txs: Transaction[] = jobs.map((job: any) => {
      const basePrice = Number(job.base_price) || 0;
      const finalPrice = Number(job.final_price) || 0;
      const discount_amount = Math.max(0, basePrice - finalPrice);
      const couponLabel = couponMap.get(job.id) || null;
      const referralAmt = referralMap.get(job.id) || 0;
      let discount_label: string | null = null;
      if (couponLabel && referralAmt > 0) discount_label = `${couponLabel} + Referral credits`;
      else if (couponLabel) discount_label = couponLabel;
      else if (referralAmt > 0) discount_label = "Referral credits";
      else if (discount_amount > 0) discount_label = "Discount applied";

      return {
        id: job.id,
        title: job.title,
        status: job.status,
        payment_status: job.payment_status,
        completed_at: job.completed_at,
        created_at: job.created_at,
        base_price: basePrice,
        final_price: finalPrice,
        platform_fee: Number(job.platform_fee) || 0,
        provider_payout: Number(job.provider_payout) || 0,
        discount_amount,
        discount_label,
        parish: job.parish || null,
        community: job.community || null,
        customer_id: job.customer_id,
        accepted_provider_id: job.accepted_provider_id,
        customer_name: job.customer_id ? profileMap.get(job.customer_id) || "Unknown" : "Unknown",
        provider_name: job.accepted_provider_id
          ? profileMap.get(job.accepted_provider_id) || "Unknown"
          : "Unassigned",
      };
    });

    setTransactions(txs);
    setLoading(false);
  };

  const parishOptions = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.parish).filter(Boolean) as string[])).sort(),
    [transactions]
  );
  const communityOptions = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.community).filter(Boolean) as string[])).sort(),
    [transactions]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.status))).sort(),
    [transactions]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
    return transactions.filter((tx) => {
      if (parishFilter !== "all" && tx.parish !== parishFilter) return false;
      if (communityFilter !== "all" && tx.community !== communityFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (discountFilter === "with" && tx.discount_amount <= 0) return false;
      if (discountFilter === "without" && tx.discount_amount > 0) return false;
      if (fromTs || toTs) {
        const ts = new Date(tx.completed_at || tx.created_at).getTime();
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
      }
      if (q) {
        const haystack = [
          tx.title,
          tx.id,
          tx.customer_name,
          tx.provider_name,
          tx.discount_label || "",
          tx.parish || "",
          tx.community || "",
          tx.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, search, parishFilter, communityFilter, statusFilter, discountFilter, dateFrom, dateTo]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, t) => ({
          paid: acc.paid + t.final_price,
          discount: acc.discount + t.discount_amount,
          original: acc.original + t.base_price,
          payout: acc.payout + t.provider_payout,
          fee: acc.fee + t.platform_fee,
        }),
        { paid: 0, discount: 0, original: 0, payout: 0, fee: 0 }
      ),
    [filtered]
  );

  const hasActiveFilters =
    !!search ||
    parishFilter !== "all" ||
    communityFilter !== "all" ||
    statusFilter !== "all" ||
    discountFilter !== "all" ||
    !!dateFrom ||
    !!dateTo;

  const clearFilters = () => {
    setSearch("");
    setParishFilter("all");
    setCommunityFilter("all");
    setStatusFilter("all");
    setDiscountFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const exportCsv = () => {
    const headers = [
      "Job ID",
      "Title",
      "Status",
      "Created",
      "Completed",
      "Customer",
      "Provider",
      "Parish",
      "Community",
      "Original Price",
      "Discount",
      "Discount Label",
      "Customer Paid",
      "Platform Fee",
      "Provider Payout",
    ];
    const rows = filtered.map((t) => [
      t.id,
      t.title,
      t.status,
      t.created_at,
      t.completed_at || "",
      t.customer_name,
      t.provider_name,
      t.parish || "",
      t.community || "",
      t.base_price,
      t.discount_amount,
      t.discount_label || "",
      t.final_price,
      t.platform_fee,
      t.provider_payout,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-7 w-7" /> Transactions
            </h1>
            <p className="text-muted-foreground mt-1">
              Search and filter every paid job across the platform
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-xl font-bold">{filtered.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Customers Paid</p>
              <p className="text-xl font-bold">{formatCurrency(totals.paid)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Discounts</p>
              <p className="text-xl font-bold text-green-600">-{formatCurrency(totals.discount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Provider Payouts</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totals.payout)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Platform Fees</p>
              <p className="text-xl font-bold">{formatCurrency(totals.fee)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Search by job title, ID, customer, provider, coupon, or referral
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div className="relative lg:col-span-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search title, job ID, customer, provider, coupon…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={parishFilter} onValueChange={setParishFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All parishes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All parishes</SelectItem>
                  {parishOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={communityFilter} onValueChange={setCommunityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All communities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All communities</SelectItem>
                  {communityOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={discountFilter} onValueChange={setDiscountFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Discount" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All transactions</SelectItem>
                  <SelectItem value="with">With discount</SelectItem>
                  <SelectItem value="without">No discount</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1"
                  aria-label="From date"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1"
                  aria-label="To date"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear filters
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              Results <span className="text-muted-foreground font-normal text-base">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {transactions.length === 0
                  ? "No transactions yet"
                  : "No transactions match your filters"}
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{tx.title}</p>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.completed_at || tx.created_at), "MMM d, yyyy")}
                        {tx.parish && <> • {tx.parish}</>}
                        {tx.community && <> • {tx.community}</>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">Customer:</span>{" "}
                        {tx.customer_name}
                        {" · "}
                        <span className="font-medium text-foreground">Provider:</span>{" "}
                        {tx.provider_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        ID: {tx.id}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Customer Paid</p>
                        <p className="font-semibold text-foreground">
                          {formatCurrency(tx.final_price)}
                        </p>
                      </div>
                      {tx.discount_amount > 0 ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Discount</p>
                          <p className="font-semibold text-green-600">
                            -{formatCurrency(tx.discount_amount)}
                          </p>
                          {tx.discount_label && (
                            <p className="text-[10px] text-muted-foreground">{tx.discount_label}</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">Discount</p>
                          <p className="text-sm text-muted-foreground">—</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Original Price</p>
                        <p className="font-semibold text-foreground">
                          {formatCurrency(tx.base_price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Provider Payout</p>
                        <p className="font-semibold text-primary">
                          {formatCurrency(tx.provider_payout)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminTransactions;

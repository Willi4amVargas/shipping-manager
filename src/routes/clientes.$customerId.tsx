import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { neon } from "../lib/neon";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ShieldAlert,
  Copy,
  Send,
  MessageCircle,
  FileText,
  ChevronLeft,
  RefreshCw,
  Eye,
  Truck,
} from "lucide-react";
import { cn } from "cn";

type Customer = {
  customer_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string | null;
};

type OrderRow = {
  order_id: number;
  customer_id: number | null;
  grand_total: number;
  order_date: string | null;
  status: string | null;
  products_total: number;
  discount: number | null;
  total_commission: number;
  items?: Array<{
    store: string | null;
    quantity: number;
  }>;
};

type PaymentRow = {
  payment_payment_id: number;
  order_id: number | null;
  payment_date: string | null;
  currency: string;
  original_amount: number;
  exchange_rate: number | null;
  base_amount: number;
  payment_method: string;
  reference_number: string | null;
};

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  pending: { label: "Pendiente", variant: "destructive" },
  partially_paid: { label: "Parcialmente pagado", variant: "outline" },
  paid: { label: "Pagado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const formatVES = (usd: number, rate: number) =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
  }).format(usd * rate);

const formatDate = (dateString: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-VE");
};

const storeItemsLabel = (
  items: Array<{ store: string | null; quantity: number }> | undefined,
) => {
  if (!items || items.length === 0) return "—";
  const grouped: Record<string, number> = {};
  for (const it of items) {
    const store = it.store ?? "Tienda";
    grouped[store] = (grouped[store] || 0) + it.quantity;
  }
  return Object.entries(grouped)
    .map(([store, qty]) => `${store} (${qty} ítems)`)
    .join(" & ");
};

const rowsFrom = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  return response.results ?? response.data ?? [];
};

export const Route = createFileRoute("/clientes/$customerId")({
  component: ClienteFicha,
});

function ClienteFicha() {
  const params = Route.useParams();
  const customerId = Number(params.customerId);
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [bcvRate, setBcvRate] = useState(68.4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copyTooltip, setCopyTooltip] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const customerResponse = await neon
        .from("customers")
        .select("*")
        .eq("customer_id", customerId);
      const customerRows = rowsFrom(customerResponse) as Customer[];
      setCustomer(customerRows[0] ?? null);

      const ordersResponse = await neon
        .from("orders")
        .select("*")
        .eq("customer_id", customerId);
      const orderRows = rowsFrom(ordersResponse) as OrderRow[];

      const ordersWithItems = await Promise.all(
        orderRows.map(async (o) => {
          const itemsResponse = await neon
            .from("order_items")
            .select("*")
            .eq("order_id", o.order_id);
          const items = rowsFrom(itemsResponse).map((i: any) => ({
            store: i.store,
            quantity: i.quantity,
          }));
          return { ...o, items };
        }),
      );
      setOrders(ordersWithItems);

      const paymentsResponse = await neon.from("payments").select("*");
      const allPayments = rowsFrom(paymentsResponse) as PaymentRow[];
      const customerPayments = allPayments.filter(
        (p) =>
          p.order_id && ordersWithItems.some((o) => o.order_id === p.order_id),
      );
      setPayments(customerPayments);

      const settingsResponse = await neon
        .from("settings")
        .select("*")
        .eq("setting_key", "bcv_rate");
      const settings = rowsFrom(settingsResponse) as Array<{
        setting_key: string;
        setting_value: string;
      }>;
      if (settings[0]) {
        setBcvRate(parseFloat(settings[0].setting_value) || 68.4);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const totalInvoiced = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0),
    [orders],
  );
  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.base_amount || 0), 0),
    [payments],
  );
  const balanceDue = useMemo(
    () => Math.max(0, totalInvoiced - totalPaid),
    [totalInvoiced, totalPaid],
  );
  const activeOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.status === "pending" || o.status === "partially_paid",
      ),
    [orders],
  );
  const paidPercent =
    totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0;

  const whatsappMessage = useMemo(() => {
    if (!customer) return "";
    const activeDetail = activeOrders
      .map((o) => {
        const itemsLabel = storeItemsLabel(o.items);
        const p = payments.filter((pay) => pay.order_id === o.order_id);
        const paidOnOrder = p.reduce(
          (sum, pay) => sum + Number(pay.base_amount || 0),
          0,
        );
        const saldo = Math.max(0, Number(o.grand_total || 0) - paidOnOrder);
        return `• *#ORD-${o.order_id}* (${itemsLabel})\n  Total: ${formatCurrency(Number(o.grand_total || 0))} | Abonado: ${formatCurrency(paidOnOrder)}\n  *Saldo:* ${formatCurrency(saldo)} USD`;
      })
      .join("\n");

    return `📦 *CROSSBORDER HUB - ESTADO DE CUENTA*

👤 Cliente: ${customer.name} (#CUST-${customer.customer_id})
📅 Fecha de Emisión: ${formatDate(new Date().toISOString())}

⚠️ *RESUMEN DE SALDO PENDIENTE:*
🔴 *Total a Pagar:* *${formatCurrency(balanceDue)} USD*
💵 Equivalente en Bs (BCV ${bcvRate}): *${formatVES(balanceDue, bcvRate)}*

📋 *DETALLE DE ÓRDENES ACTIVAS:*
${activeDetail || "Sin órdenes activas."}

💳 *DATOS DE PAGO DISPIBLES:*
• *Pago Móvil:* Banco Banesco (0134) / 0414-0001122 / J-501234567 (Tasa BCV)
• *Zelle:* pagos@crossborderhub.com (Titular: CrossBorder Logistics LLC)
• *Binance Pay ID:* 89452011 (USDT)

Por favor enviar captura de pantalla o número de referencia tras realizar el abono. ¡Gracias por su confianza!`;
  }, [
    customer,
    activeOrders,
    payments,
    balanceDue,
    bcvRate,
    formatCurrency,
    formatVES,
    formatDate,
    storeItemsLabel,
  ]);

  const whatsappUrl = customer?.phone
    ? `https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : "#";

  const copyText = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopyTooltip(true);
    setTimeout(() => setCopyTooltip(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando ficha del cliente...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <ShieldAlert className="size-8 text-destructive" />
        <h2 className="mt-2 text-lg font-semibold">Cliente no encontrado</h2>
        <p className="text-muted-foreground">
          No se pudo cargar la información del cliente.
        </p>
        <Button onClick={() => window.history.back()}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      {/* Top header: volver + acciones rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border-b border-border bg-background/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/clientes" })}
          >
            <ChevronLeft className="size-4 mr-2" /> Directorio
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{customer.name}</span>
            <span>/</span>
            <span>#CUST-{customer.customer_id}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {customer.phone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          )}
          <Button
            onClick={copyText}
            variant="outline"
            size="sm"
            className="relative"
          >
            <Copy className="size-4 mr-2" />
            {copyTooltip ? "Copiado" : "Copiar WhatsApp"}
          </Button>
        </div>
      </div>

      <main className="flex-1 p-4">
        {/* Customer Profile Header Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-4">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex flex-col items-center gap-4 mb-4">
                <div className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-2xl">
                  {customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div className="text-center">
                  <h1 className="text-xl font-semibold">{customer.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    ID #CUST-{customer.customer_id}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Miembro desde: {formatDate(customer.created_at)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50">
                  <Phone className="size-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Teléfono
                    </div>
                    <div className="text-sm font-medium">
                      {customer.phone || "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50">
                  <Mail className="size-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm font-medium">
                      {customer.email || "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50">
                  <MapPin className="size-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Ciudad / Sucursal
                    </div>
                    <div className="text-sm font-medium">Caracas, Chacao</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Badge
                  variant={balanceDue > 0 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {balanceDue > 0 ? "Deudor Activo" : "Al Día"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {activeOrders.length} Órdenes activas
                </Badge>
              </div>

              <div className="mt-6 flex gap-2">
                <Button
                  onClick={copyText}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Copy className="size-4 mr-2" /> Copiar Reporte
                </Button>
                <Button variant="ghost" size="sm" className="flex-1">
                  <FileText className="size-4 mr-2" /> Exportar PDF
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Truck className="size-4 mr-2" /> Editar Datos
                </Button>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-5 relative overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-10">
                <ShieldAlert className="size-16 text-destructive" />
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Total Deuda Pendiente
              </div>
              <div className="text-2xl font-semibold text-destructive">
                {formatCurrency(balanceDue)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Saldo actual · {formatVES(balanceDue, bcvRate)} VES (BCV{" "}
                {bcvRate})
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="text-xs text-muted-foreground font-medium">
                Total Facturado Histórico
              </div>
              <div className="text-2xl font-semibold">
                {formatCurrency(totalInvoiced)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {orders.length} órdenes
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="text-xs text-muted-foreground font-medium">
                Total Abonado / Pagado
              </div>
              <div className="text-2xl font-semibold">
                {formatCurrency(totalPaid)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {paidPercent}% pagado
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="text-xs text-muted-foreground font-medium">
                Pedidos en Tránsito / Pendientes
              </div>
              <div className="text-2xl font-semibold">
                {activeOrders.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {orders.filter((o) => o.status === "pending").length} pendiente,{" "}
                {orders.filter((o) => o.status === "partially_paid").length}{" "}
                parcialmente pagado
              </div>
            </div>
          </div>
        </div>

        {/* Two-column workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Orders & Payments */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Órdenes y Saldos del Cliente
                </h2>
                <Badge variant="outline" className="text-xs">
                  {orders.length} órdenes
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                      <th className="p-3 font-medium">Orden ID</th>
                      <th className="p-3 font-medium">Tiendas & Ítems</th>
                      <th className="p-3 font-medium">Fecha</th>
                      <th className="p-3 font-medium text-right">
                        Total Orden
                      </th>
                      <th className="p-3 font-medium text-right">
                        Total Abonado
                      </th>
                      <th className="p-3 font-medium text-right">
                        Saldo Deudor
                      </th>
                      <th className="p-3 font-medium">Estado</th>
                      <th className="p-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o) => {
                      const orderPayments = payments.filter(
                        (p) => p.order_id === o.order_id,
                      );
                      const paidOnOrder = orderPayments.reduce(
                        (sum, p) => sum + Number(p.base_amount || 0),
                        0,
                      );
                      const saldo = Math.max(
                        0,
                        Number(o.grand_total || 0) - paidOnOrder,
                      );
                      const statusInfo =
                        STATUS_LABELS[o.status ?? "pending"] ||
                        STATUS_LABELS.pending;

                      return (
                        <tr
                          key={o.order_id}
                          className="hover:bg-accent/50 transition-colors"
                        >
                          <td className="p-3 font-medium">#ORD-{o.order_id}</td>
                          <td className="p-3">{storeItemsLabel(o.items)}</td>
                          <td className="p-3 text-muted-foreground">
                            {formatDate(o.order_date)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(Number(o.grand_total || 0))}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(paidOnOrder)}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={cn(
                                "font-medium",
                                saldo > 0
                                  ? "text-destructive"
                                  : "text-secondary-foreground",
                              )}
                            >
                              {formatCurrency(saldo)}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={statusInfo.variant as any}
                              className="text-xs"
                            >
                              {statusInfo.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="px-2"
                              >
                                + Abonar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1.5"
                              >
                                <Eye className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Historial de Pagos y Abonos Registrados
                </h2>
                <Badge variant="outline" className="text-xs">
                  {payments.length} pagos
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                      <th className="p-3 font-medium">ID Pago</th>
                      <th className="p-3 font-medium">Orden Asociada</th>
                      <th className="p-3 font-medium">Fecha</th>
                      <th className="p-3 font-medium">
                        Moneda & Monto Original
                      </th>
                      <th className="p-3 font-medium text-right">Tasa</th>
                      <th className="p-3 font-medium text-right">
                        Monto Acreditado (USD)
                      </th>
                      <th className="p-3 font-medium">Referencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-8 text-center text-muted-foreground"
                        >
                          Sin pagos registrados para este cliente.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr
                          key={p.payment_payment_id}
                          className="hover:bg-accent/50 transition-colors"
                        >
                          <td className="p-3 font-medium">
                            #{p.payment_payment_id}
                          </td>
                          <td className="p-3">
                            {p.order_id ? `#ORD-${p.order_id}` : "—"}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="p-3">
                            <div className="text-sm">
                              {p.currency}{" "}
                              {new Intl.NumberFormat("es-VE").format(
                                Number(p.original_amount || 0),
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.payment_method}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {p.exchange_rate ? p.exchange_rate.toFixed(2) : "—"}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {formatCurrency(Number(p.base_amount || 0))}
                          </td>
                          <td className="p-3 text-muted-foreground text-sm">
                            {p.reference_number || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: WhatsApp State of Account Generator */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-card rounded-xl border border-border p-5 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Generador de Estado de Cuenta para WhatsApp
                </h2>
                <Badge variant="secondary" className="text-xs">
                  Vista previa
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Vista Previa WhatsApp
                </span>
                <Button
                  onClick={copyText}
                  variant="outline"
                  size="sm"
                  className="px-2"
                >
                  <Copy className="size-3" /> Copiar Texto
                </Button>
                {customer.phone && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-primary border-primary"
                    >
                      <Send className="size-3 mr-1" /> Abrir WhatsApp
                    </Button>
                  </a>
                )}
              </div>

              <div className="flex-1 bg-secondary rounded-lg border border-border p-4 font-mono text-xs text-secondary-foreground overflow-y-auto relative group">
                {whatsappMessage.split("\n").map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap break-words">
                    {line}
                  </div>
                ))}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={copyText}
                    className="p-1"
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold mb-3">Pago Rápido</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/50">
                  <div className="text-xs text-muted-foreground">
                    Monto a cobrar
                  </div>
                  <div className="text-lg font-semibold text-destructive">
                    {formatCurrency(balanceDue)}
                  </div>
                </div>
                <Button variant="outline" className="w-full text-left text-sm">
                  <CreditCard className="size-4 mr-2" /> Registrar Abono
                </Button>
                <Button variant="outline" className="w-full text-left text-sm">
                  <Send className="size-4 mr-2" /> Enviar Recordatorio
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

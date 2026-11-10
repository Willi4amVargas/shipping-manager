import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  Copy,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { cn } from "cn";
import { neon } from "../../lib/neon";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

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

type SettingRow = {
  setting_key: string;
  setting_value: string;
};

type BadgeVariant = "destructive" | "outline" | "secondary";

const STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> =
  {
    pending: { label: "Pendiente", variant: "destructive" },
    partially_paid: { label: "Parcialmente pagado", variant: "outline" },
    paid: { label: "Pagado", variant: "secondary" },
    cancelled: { label: "Cancelado", variant: "outline" },
  };

const PHONE_PREFIXES = ["+58", "+1", "+57"];

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

const formatDate = (dateString: string | null) =>
  dateString ? new Date(dateString).toLocaleDateString("es-VE") : "Sin fecha";

const storeItemsLabel = (
  items: Array<{ store: string | null; quantity: number }> | undefined,
) => {
  if (!items || items.length === 0) return "Sin detalle";
  const grouped: Record<string, number> = {};
  for (const it of items) {
    const store = it.store ?? "Tienda";
    grouped[store] = (grouped[store] || 0) + it.quantity;
  }
  return Object.entries(grouped)
    .map(([store, qty]) => `${store} (${qty} ítems)`)
    .join(" & ");
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const rowsFrom = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  return response.results ?? response.data ?? [];
};

// Un teléfono guardado sin prefijo conocido se conserva íntegro en el campo
// local para que la edición no lo trunque.
const splitPhone = (phone: string | null): { code: string; local: string } => {
  const match = phone?.match(/^(\+\d{1,3})\s+(.*)$/);
  if (match && PHONE_PREFIXES.includes(match[1])) {
    return { code: match[1], local: match[2] };
  }
  const prefixed = PHONE_PREFIXES.find((p) => phone?.startsWith(p));
  if (prefixed) {
    return { code: prefixed, local: phone!.slice(prefixed.length).trim() };
  }
  return { code: "+58", local: phone ?? "" };
};

export const Route = createFileRoute("/clientes/$customerId")({
  component: ClienteFicha,
});

function ClienteFicha() {
  const { customerId } = Route.useParams();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statementDate, setStatementDate] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCode, setFormCode] = useState("+58");
  const [formPhone, setFormPhone] = useState("");

  const copiedTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(false);
    setStatementDate(new Date().toLocaleDateString("es-VE"));
    try {
      const id = Number(customerId);

      const customerRows = rowsFrom(
        await neon.from("customers").select("*").eq("customer_id", id),
      ) as Customer[];
      setCustomer(customerRows[0] ?? null);

      const orderRows = rowsFrom(
        await neon.from("orders").select("*").eq("customer_id", id),
      ) as OrderRow[];
      const ordersWithItems: OrderRow[] = await Promise.all(
        orderRows.map(async (o) => {
          const items = rowsFrom(
            await neon.from("order_items").select("*").eq("order_id", o.order_id),
          );
          return {
            ...o,
            items: items.map((i: any) => ({
              store: i.store ?? null,
              quantity: i.quantity,
            })),
          };
        }),
      );
      setOrders(ordersWithItems);

      const allPayments = rowsFrom(
        await neon.from("payments").select("*"),
      ) as PaymentRow[];
      setPayments(
        allPayments.filter(
          (p) =>
            p.order_id != null &&
            ordersWithItems.some((o) => o.order_id === p.order_id),
        ),
      );

      const settingsRows = rowsFrom(
        await neon.from("settings").select("*"),
      ) as SettingRow[];
      const rateValue = settingsRows.find((s) => s.setting_key === "bcv_rate")
        ?.setting_value;
      const parsedRate = Number.parseFloat(rateValue ?? "");
      setBcvRate(
        Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null,
      );
      const paymentValue = settingsRows.find(
        (s) => s.setting_key === "payment_info",
      )?.setting_value;
      setPaymentInfo(paymentValue?.trim() ? paymentValue : null);
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
  const paidByOrder = useMemo(() => {
    const map: Record<number, number> = {};
    for (const p of payments) {
      if (p.order_id != null) {
        map[p.order_id] = (map[p.order_id] ?? 0) + Number(p.base_amount || 0);
      }
    }
    return map;
  }, [payments]);
  const totalPaid = useMemo(
    () => Object.values(paidByOrder).reduce((sum, v) => sum + v, 0),
    [paidByOrder],
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
    const lines: string[] = [];
    lines.push("CrossBorder Hub - Estado de cuenta", "");
    lines.push(`Cliente: ${customer.name} (#CUST-${customer.customer_id})`);
    lines.push(`Fecha: ${statementDate}`, "");
    lines.push(`Saldo pendiente: ${formatCurrency(balanceDue)} USD`);
    if (bcvRate != null) {
      lines.push(
        `Equivalente en Bs (BCV ${bcvRate}): ${formatVES(balanceDue, bcvRate)}`,
      );
    }
    lines.push("");
    if (activeOrders.length > 0) {
      lines.push("Órdenes activas:");
      for (const o of activeOrders) {
        const abonado = paidByOrder[o.order_id] ?? 0;
        const saldo = Math.max(0, Number(o.grand_total || 0) - abonado);
        lines.push(
          `#ORD-${o.order_id} (${storeItemsLabel(o.items)}) Total ${formatCurrency(Number(o.grand_total || 0))} | Abonado ${formatCurrency(abonado)} | Saldo ${formatCurrency(saldo)} USD`,
        );
      }
    } else {
      lines.push("Sin órdenes activas.");
    }
    if (paymentInfo) {
      lines.push("", "Datos de pago:", paymentInfo);
    }
    lines.push(
      "",
      "Al realizar el abono, envía la captura o el número de referencia. Gracias.",
    );
    return lines.join("\n");
  }, [customer, activeOrders, paidByOrder, balanceDue, bcvRate, paymentInfo, statementDate]);

  const whatsappUrl = customer?.phone
    ? `https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  const copyText = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const openEdit = () => {
    if (!customer) return;
    setFormName(customer.name);
    setFormEmail(customer.email ?? "");
    const { code, local } = splitPhone(customer.phone);
    setFormCode(code);
    setFormPhone(local);
    setSaveError("");
    setEditing(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    setSaveError("");
    try {
      await neon
        .from("customers")
        .update({
          name: formName.trim(),
          email: formEmail.trim() || null,
          phone: formPhone.trim() ? `${formCode} ${formPhone.trim()}` : null,
        })
        .eq("customer_id", customer.customer_id);
      setEditing(false);
      await fetchCustomer();
    } catch {
      setSaveError("No se pudo guardar los cambios. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando la ficha del cliente...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <ShieldAlert className="size-8 text-destructive" />
        <h2 className="text-lg font-semibold">
          {error ? "No se pudo cargar la ficha" : "Cliente no encontrado"}
        </h2>
        <p className="max-w-sm text-muted-foreground">
          {error
            ? "Verifica tu conexión e inténtalo otra vez."
            : `El cliente #CUST-${customerId} no existe o fue eliminado del sistema.`}
        </p>
        <div className="mt-3 flex gap-2">
          {error && (
            <Button variant="outline" onClick={() => fetchCustomer()}>
              Reintentar
            </Button>
          )}
          <Button
            nativeButton={false}
            render={<Link to="/clientes" />}
          >
            <ChevronLeft className="size-4 mr-2" /> Ir al directorio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/clientes" />}
          >
            <ChevronLeft className="size-4 mr-1.5" /> Directorio
          </Button>
          <div className="min-w-0 truncate text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{customer.name}</span>
            {" / #CUST-"}
            {customer.customer_id}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          )}
          <Button variant="outline" size="sm" onClick={copyText}>
            <Copy className="size-4 mr-1.5" />
            {copied ? "Copiado" : "Copiar estado"}
          </Button>
          <Button size="sm" onClick={openEdit}>
            <Pencil className="size-4 mr-1.5" /> Editar
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl min-w-0 space-y-6 p-4">
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                {initials(customer.name)}
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-xl font-semibold">
                  {customer.name}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  #CUST-{customer.customer_id} · Registrado:{" "}
                  {formatDate(customer.created_at)}
                </p>
              </div>
            </div>
            <Badge variant={balanceDue > 0 ? "destructive" : "secondary"}>
              {balanceDue > 0 ? "Deudor activo" : "Al día"}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Teléfono</div>
                <div className="break-words text-sm font-medium">
                  {customer.phone || "Sin teléfono"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="break-words text-sm font-medium">
                  {customer.email || "Sin email"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Saldo pendiente
                </div>
                <div
                  className={cn(
                    "mt-1 text-3xl font-semibold",
                    balanceDue > 0 && "text-destructive",
                  )}
                >
                  {formatCurrency(balanceDue)}
                </div>
                {bcvRate != null && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Equivalente en Bs (BCV {bcvRate}):{" "}
                    {formatVES(balanceDue, bcvRate)}
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Facturado {formatCurrency(totalInvoiced)} · Pagado{" "}
              {formatCurrency(totalPaid)} ({paidPercent}%) · {orders.length}{" "}
              órdenes, {activeOrders.length} activas
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <h2 className="font-semibold">Órdenes del cliente</h2>
            <span className="text-sm text-muted-foreground">
              {orders.length} en total, {activeOrders.length} con saldo
            </span>
          </div>
          {orders.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Este cliente aún no tiene órdenes registradas. Puedes crear la
              primera desde Órdenes &amp; Pedidos.
            </p>
          ) : (
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                    <th className="p-3 font-medium">Orden</th>
                    <th className="p-3 font-medium">Tiendas</th>
                    <th className="p-3 font-medium whitespace-nowrap">Fecha</th>
                    <th className="p-3 text-right font-medium">Total</th>
                    <th className="p-3 text-right font-medium">Abonado</th>
                    <th className="p-3 text-right font-medium">Saldo</th>
                    <th className="p-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((o) => {
                    const abonado = paidByOrder[o.order_id] ?? 0;
                    const saldo = Math.max(
                      0,
                      Number(o.grand_total || 0) - abonado,
                    );
                    const statusInfo =
                      STATUS_LABELS[o.status ?? "pending"] ??
                      STATUS_LABELS.pending;

                    return (
                      <tr key={o.order_id} className="hover:bg-accent/50">
                        <td className="p-3 font-medium">
                          #ORD-{o.order_id}
                        </td>
                        <td className="p-3 break-words">
                          {storeItemsLabel(o.items)}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(o.order_date)}
                        </td>
                        <td className="p-3 text-right font-medium whitespace-nowrap">
                          {formatCurrency(Number(o.grand_total || 0))}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {formatCurrency(abonado)}
                        </td>
                        <td
                          className={cn(
                            "p-3 text-right font-medium whitespace-nowrap",
                            saldo > 0 ? "text-destructive" : "text-foreground",
                          )}
                        >
                          {formatCurrency(saldo)}
                        </td>
                        <td className="p-3">
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <h2 className="font-semibold">Pagos registrados</h2>
            <span className="text-sm text-muted-foreground">
              {payments.length} abonos
            </span>
          </div>
          {payments.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Aún no hay abonos asociados a las órdenes de este cliente. Los
              pagos aparecerán aquí al registrarse.
            </p>
          ) : (
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                    <th className="p-3 font-medium">Orden</th>
                    <th className="p-3 font-medium whitespace-nowrap">Fecha</th>
                    <th className="p-3 font-medium">Pago</th>
                    <th className="p-3 text-right font-medium">
                      Acreditado (USD)
                    </th>
                    <th className="p-3 font-medium">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.payment_payment_id} className="hover:bg-accent/50">
                      <td className="p-3 font-medium">
                        {p.order_id != null ? `#ORD-${p.order_id}` : "Sin orden"}
                      </td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="p-3">
                        <div className="whitespace-nowrap">
                          {p.currency}{" "}
                          {new Intl.NumberFormat("es-VE").format(
                            Number(p.original_amount || 0),
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.payment_method}
                          {p.exchange_rate != null &&
                            ` · tasa ${p.exchange_rate.toFixed(2)}`}
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium whitespace-nowrap">
                        {formatCurrency(Number(p.base_amount || 0))}
                      </td>
                      <td className="p-3 break-words text-muted-foreground">
                        {p.reference_number || "sin referencia"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={editing}
        onOpenChange={(open) => {
          setEditing(open);
          if (!open) setSaveError("");
        }}
      >
        <DialogContent className="max-w-md sm:max-w-lg p-0">
          <DialogHeader className="px-6 pt-6 space-y-1.5">
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Actualiza el nombre, el correo o el teléfono de contacto del
              cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre completo</Label>
                <Input
                  id="edit-name"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Correo electrónico</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Teléfono / WhatsApp</Label>
              <div className="flex gap-2">
                <Select
                  value={formCode}
                  onValueChange={(value) => setFormCode(value ?? "+58")}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-20 shrink-0"
                    aria-label="Código de país"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+58">+58</SelectItem>
                    <SelectItem value="+1">+1</SelectItem>
                    <SelectItem value="+57">+57</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="edit-phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="414-0000000"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Déjalo vacío si el cliente no tiene teléfono registrado.
              </p>
            </div>

            {saveError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
                {saveError}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !formName.trim()}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

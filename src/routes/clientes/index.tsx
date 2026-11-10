import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  Phone,
  ChevronRight,
  MoreHorizontal,
  MessageCircle,
  Eye,
} from "lucide-react";
import { cn } from "cn";
import { neon } from "../../lib/neon";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
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

type CustomerStats = {
  total_orders: number;
  active_orders: number;
  total_invoiced: number;
  total_paid: number;
  balance_due: number;
};

export const Route = createFileRoute("/clientes/")({
  component: Clientes,
});

function Clientes() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    withDebt: number;
    solvent: number;
    avgTicket: number;
  }>({ total: 0, withDebt: 0, solvent: 0, avgTicket: 0 });
  const [customerStats, setCustomerStats] = useState<
    Record<number, CustomerStats>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const [query, setQuery] = useState("");

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCountryCode, setFormCountryCode] = useState("+58");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await neon.from("customers").select("*");
      const rows = response.data;
      if (!rows) return;
      setCustomers(rows);

      const statsByCustomer: Record<number, CustomerStats> = {};
      let totalInvoiced = 0;
      let withDebt = 0;
      let solvent = 0;

      for (const c of rows) {
        const ordersResponse = await neon
          .from("orders")
          .select("*")
          .eq("customer_id", c.customer_id);
        const customerOrders = (
          Array.isArray(ordersResponse)
            ? ordersResponse
            : ((ordersResponse as any).results ?? [])
        ) as any[];

        let totalOrders = 0;
        let activeOrders = 0;
        let invoiced = 0;
        let paidSum = 0;

        for (const o of customerOrders) {
          totalOrders++;
          invoiced += Number(o.grand_total || 0);
          if (o.status === "pending" || o.status === "partially_paid")
            activeOrders++;

          const paysResponse = await neon
            .from("payments")
            .select("*")
            .eq("order_id", o.order_id);
          const payments = (
            Array.isArray(paysResponse)
              ? paysResponse
              : ((paysResponse as any).results ?? [])
          ) as any[];
          for (const p of payments) {
            paidSum += Number(p.base_amount || 0);
          }
        }

        const balanceDue = Math.max(0, invoiced - paidSum);
        if (balanceDue > 0) withDebt++;
        else solvent++;

        totalInvoiced += invoiced;

        statsByCustomer[c.customer_id] = {
          total_orders: totalOrders,
          active_orders: activeOrders,
          total_invoiced: invoiced,
          total_paid: paidSum,
          balance_due: balanceDue,
        };
      }

      setCustomerStats(statsByCustomer);
      setStats({
        total: rows.length,
        withDebt,
        solvent,
        avgTicket: rows.length > 0 ? totalInvoiced / rows.length : 0,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const emailMatch = (c.email ?? "").toLowerCase().includes(q);
      const phoneMatch = (c.phone ?? "").toLowerCase().includes(q);
      return nameMatch || emailMatch || phoneMatch;
    });
  }, [customers, query]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const fullPhone = formCountryCode + " " + formPhone.trim();
      await neon.from("customers").insert({
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: fullPhone || null,
      });
      setOpenCreate(false);
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      await fetchCustomers();
    } catch {
      setCreateError("No se pudo crear el cliente. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (balance: number, activeOrders: number) => {
    if (balance > 0 && activeOrders > 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Deuda activa
        </Badge>
      );
    }
    if (balance > 0) {
      return (
        <Badge variant="outline" className="text-xs">
          Saldo pendiente
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        Al día
      </Badge>
    );
  };

  const whatsappLink = (phone: string | null) => {
    if (!phone) return "#";
    const digits = phone.replace(/\D/g, "");
    return `https://wa.me/${digits}`;
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      {/* Top header: breadcrumb + actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 border-b border-border bg-background/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Clientes</span>
            <ChevronRight className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground">Directorio General</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/pagos" })}
          >
            Registrar Pago
          </Button>
        </div>
      </div>

      {/* KPIs de cartera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground font-medium">
            Total Clientes Registrados
          </div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground font-medium">
            Clientes con Deuda Activa
          </div>
          <div className="text-2xl font-semibold text-destructive">
            {stats.withDebt}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            En cobro / mora
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground font-medium">
            Clientes Solventes
          </div>
          <div className="text-2xl font-semibold">{stats.solvent}</div>
          <div className="text-xs text-muted-foreground mt-1">Al día</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="text-xs text-muted-foreground font-medium">
            Ticket Promedio Histórico
          </div>
          <div className="text-2xl font-semibold">
            {formatCurrency(stats.avgTicket)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">por cliente</div>
        </div>
      </div>

      {/* Barra de filtros y herramientas */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 border-b border-border bg-background/50">
        <div className="flex w-full lg:w-auto items-center gap-3">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, email o teléfono"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setOpenCreate(true)}
            className="flex items-center gap-2"
          >
            <Plus className="size-4" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Tabla principal de clientes */}
      <div className="flex-1 p-4 overflow-x-auto">
        <div className="rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-muted-foreground">
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Contacto</th>
                <th className="p-4 font-medium text-right">Órdenes Totales</th>
                <th className="p-4 font-medium text-right">Total Facturado</th>
                <th className="p-4 font-medium text-right">Saldo Deudor</th>
                <th className="p-4 font-medium">Estado / Riesgo</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Cargando clientes...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-destructive">
                    Error al cargar los clientes.
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No se encontraron clientes.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const s = customerStats[c.customer_id] || {
                    total_orders: 0,
                    active_orders: 0,
                    total_invoiced: 0,
                    total_paid: 0,
                    balance_due: 0,
                  };

                  return (
                    <tr
                      key={c.customer_id}
                      className="hover:bg-accent/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-medium">
                            {initials(c.name)}
                          </div>
                          <div>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ID #{c.customer_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {c.phone ? (
                            <a
                              href={whatsappLink(c.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-primary hover:underline text-sm"
                            >
                              <Phone className="size-4" /> {c.phone}
                            </a>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Sin teléfono
                            </div>
                          )}
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              className="text-sm text-muted-foreground hover:underline"
                            >
                              {c.email}
                            </a>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Sin email
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">{s.total_orders}</td>
                      <td className="p-4 text-right">
                        {formatCurrency(s.total_invoiced)}
                      </td>
                      <td className="p-4 text-right">
                        <div
                          className={cn(
                            "font-medium",
                            s.balance_due > 0
                              ? "text-destructive"
                              : "text-foreground",
                          )}
                        >
                          {formatCurrency(s.balance_due)}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(s.balance_due, s.active_orders)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.phone ? (
                            <a
                              href={whatsappLink(c.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-primary hover:bg-accent rounded-lg"
                              title="WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(c);
                            }}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer lateral de vista rápida con Shadcn UI Sheet */}
      <Sheet
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      >
        <SheetContent side="right" className="w-full lg:w-96 p-0 flex flex-col">
          {selectedCustomer && (
            <>
              <SheetHeader className="flex flex-row items-center justify-between p-4 border-b border-border bg-background space-y-0 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {initials(selectedCustomer.name)}
                  </div>
                  <div className="flex flex-col">
                    <SheetTitle className="text-base font-semibold">
                      {selectedCustomer.name}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground m-0">
                      ID #{selectedCustomer.customer_id}
                    </SheetDescription>
                  </div>
                </div>
                {/* El componente SheetContent de Shadcn ya trae un botón 'X' por defecto, 
              pero puedes mantener o personalizar el tuyo si prefieres */}
              </SheetHeader>

              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Fecha de creación
                    </span>
                    <span>
                      {selectedCustomer.created_at
                        ? new Date(
                            selectedCustomer.created_at,
                          ).toLocaleDateString("es-VE")
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Teléfono</span>
                    <span>{selectedCustomer.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span>{selectedCustomer.email || "—"}</span>
                  </div>
                </div>

                <div className="border rounded-xl p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Acciones rápidas
                  </div>
                  <div className="space-y-2">
                    {selectedCustomer.phone && (
                      <a
                        href={whatsappLink(selectedCustomer.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium border border-border rounded-lg text-left bg-background hover:bg-accent transition-colors"
                      >
                        <MessageCircle className="size-4" /> Contactar por
                        WhatsApp
                      </a>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(null);
                        navigate({
                          to: "/clientes/$customerId",
                          params: {
                            customerId: String(selectedCustomer.customer_id),
                          },
                        });
                      }}
                    >
                      <Eye className="size-4 mr-2" /> Abrir Ficha Completa
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal: Registrar Nuevo Cliente */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md sm:max-w-lg p-0">
          {/* Añadimos px-6 pt-6 para que el título y la descripción no queden pegados */}
          <DialogHeader className="px-6 pt-6 space-y-1.5">
            <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Ingresa los datos básicos para agregar al nuevo cliente en el
              sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Valentina Mendoza Rivas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono / WhatsApp</Label>
              <div className="flex gap-2">
                <Select
                  value={formCountryCode}
                  onValueChange={(value) => setFormCountryCode(value ?? "+58")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formCountryCode} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+58">+58 Venezuela</SelectItem>
                    <SelectItem value="+1">+1 EE. UU.</SelectItem>
                    <SelectItem value="+57">+57 Colombia</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="414-0001122"
                />
              </div>
            </div>

            {createError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-destructive text-sm text-center">
                {createError}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenCreate(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || !formName.trim()}>
                {creating ? "Creando..." : "Crear Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

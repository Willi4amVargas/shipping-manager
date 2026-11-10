import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { neon } from "../lib/neon";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

type SettingRow = {
  setting_key: string;
  setting_value: string;
};

const rowsFrom = (response: any): SettingRow[] => {
  if (Array.isArray(response)) return response;
  return response.results ?? response.data ?? [];
};

export const Route = createFileRoute("/configuracion")({
  component: Configuracion,
});

function Configuracion() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [rateStr, setRateStr] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");

  const savedTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    },
    [],
  );

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const rows = rowsFrom(await neon.from("settings").select("*"));
      const rateRow = rows.find((r) => r.setting_key === "bcv_rate");
      const paymentRow = rows.find((r) => r.setting_key === "payment_info");
      setRateStr(rateRow?.setting_value ?? "");
      setPaymentInfo(paymentRow?.setting_value ?? "");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // El Data API no hace upsert directo: sin fila previa el update no toca
  // ninguna fila y hay que insertar manualmente.
  const upsertSetting = async (key: string, value: string) => {
    const existing = rowsFrom(
      await neon.from("settings").select("*").eq("setting_key", key),
    );
    if (existing.length > 0) {
      await neon
        .from("settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
    } else {
      await neon.from("settings").insert({ setting_key: key, setting_value: value });
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaved(false);

    const trimmedRate = rateStr.trim();
    if (trimmedRate) {
      const parsed = Number(trimmedRate.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setFormError("La tasa BCV debe ser un número mayor que cero.");
        return;
      }
    }

    setSaving(true);
    try {
      await upsertSetting("bcv_rate", trimmedRate);
      await upsertSetting("payment_info", paymentInfo);
      setSaved(true);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setFormError("No se pudo guardar la configuración. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl min-w-0 p-4">
        <h1 className="text-xl font-semibold">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Valores globales usados por las fichas de clientes y los estados de
          cuenta por WhatsApp.
        </p>

        {loading ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8">
            <RefreshCw className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Cargando la configuración...
            </p>
          </div>
        ) : error ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-8 text-center">
            <ShieldAlert className="size-7 text-destructive" />
            <p className="text-sm text-muted-foreground">
              No se pudo leer la configuración. Verifica tu conexión.
            </p>
            <Button variant="outline" onClick={() => fetchSettings()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-6">
            <section className="space-y-2 rounded-xl border border-border bg-card p-5">
              <Label htmlFor="bcv-rate" className="font-semibold">
                Tasa BCV (USD a Bs)
              </Label>
              <Input
                id="bcv-rate"
                inputMode="decimal"
                value={rateStr}
                onChange={(e) => setRateStr(e.target.value)}
                placeholder="Ej.: 68,50"
              />
              <p className="text-xs text-muted-foreground">
                Se usa para el equivalente en bolívares de los saldos. Si la
                dejas vacía, las fichas y los estados de cuenta muestran solo
                el monto en USD.
              </p>
            </section>

            <section className="space-y-2 rounded-xl border border-border bg-card p-5">
              <Label htmlFor="payment-info" className="font-semibold">
                Datos de pago
              </Label>
              <textarea
                id="payment-info"
                rows={6}
                value={paymentInfo}
                onChange={(e) => setPaymentInfo(e.target.value)}
                placeholder="Escribe un dato por línea, por ejemplo el banco, el titular o la billetera."
                className="min-h-36 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm dark:bg-input/30"
              />
              <p className="text-xs text-muted-foreground">
                Este texto se anexa al estado de cuenta que se copia o se envía
                por WhatsApp desde la ficha del cliente.
              </p>
            </section>

            {formError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
              {saved && (
                <span className="text-sm text-muted-foreground">
                  Configuración guardada.
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

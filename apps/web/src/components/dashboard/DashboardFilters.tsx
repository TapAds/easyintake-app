"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export type DashboardFilterOption = { value: string; label: string };

type DashboardFiltersProps = {
  locale: string;
  carrierOptions: DashboardFilterOption[];
  productOptions: DashboardFilterOption[];
  selectedCarrier: string;
  selectedProduct: string;
  labels: {
    carrier: string;
    product: string;
    all: string;
    carrierTitle: string;
    productTitle: string;
  };
};

function buildHref(
  locale: string,
  next: { carrier?: string; product?: string; mode?: string | null }
): string {
  const params = new URLSearchParams();
  if (next.mode) params.set("mode", next.mode);
  if (next.carrier && next.carrier !== "all") params.set("carrier", next.carrier);
  if (next.product && next.product !== "all") params.set("product", next.product);
  const q = params.toString();
  return `/${locale}/dashboard${q ? `?${q}` : ""}`;
}

export function DashboardFilters({
  locale,
  carrierOptions,
  productOptions,
  selectedCarrier,
  selectedProduct,
  labels,
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const [pending, startTransition] = useTransition();

  const navigate = (carrier: string, product: string) => {
    const href = buildHref(locale, { carrier, product, mode });
    startTransition(() => router.push(href));
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-foreground/70 min-w-[10rem]">
        <span className="font-medium text-foreground/80">{labels.carrier}</span>
        <select
          title={labels.carrierTitle}
          className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
          value={selectedCarrier}
          disabled={pending || carrierOptions.length === 0}
          onChange={(e) => navigate(e.target.value, selectedProduct)}
        >
          <option value="all">{labels.all}</option>
          {carrierOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-foreground/70 min-w-[10rem]">
        <span className="font-medium text-foreground/80">{labels.product}</span>
        <select
          title={labels.productTitle}
          className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
          value={selectedProduct}
          disabled={pending || productOptions.length === 0}
          onChange={(e) => navigate(selectedCarrier, e.target.value)}
        >
          <option value="all">{labels.all}</option>
          {productOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

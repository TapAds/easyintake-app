import type { FieldKey } from "../fieldState";

/**
 * Demo-only carrier/product presets for live intake demos.
 * Selecting a product filters which configured fields are highlighted in the UI;
 * extraction still uses the full insurance entity in apps/api.
 */
export interface InsuranceDemoProduct {
  id: string;
  labels: { en: string; es: string };
  /** Field keys shown prominently in the demo form (subset of insurance vertical). */
  visibleFieldKeys: FieldKey[];
}

export const INSURANCE_DEMO_PRODUCTS: InsuranceDemoProduct[] = [
  {
    id: "term_core",
    labels: {
      en: "Term life — core quote",
      es: "Vida temporal — cotización principal",
    },
    visibleFieldKeys: [
      "firstName",
      "lastName",
      "dateOfBirth",
      "state",
      "coverageAmountDesired",
      "productTypeInterest",
      "termLengthDesired",
      "budgetMonthly",
    ],
  },
  {
    id: "whole_build_cash",
    labels: {
      en: "Whole life — build & cash value",
      es: "Vida entera — acumulación y valor en efectivo",
    },
    visibleFieldKeys: [
      "firstName",
      "lastName",
      "phone",
      "email",
      "coverageAmountDesired",
      "productTypeInterest",
      "budgetMonthly",
      "tobaccoUse",
      "heightFeet",
      "heightInches",
      "weightLbs",
    ],
  },
  {
    id: "final_expense",
    labels: {
      en: "Final expense — simplified",
      es: "Gastos finales — simplificado",
    },
    visibleFieldKeys: [
      "firstName",
      "lastName",
      "dateOfBirth",
      "phone",
      "state",
      "coverageAmountDesired",
      "productTypeInterest",
      "beneficiaryName",
      "beneficiaryRelation",
    ],
  },
];

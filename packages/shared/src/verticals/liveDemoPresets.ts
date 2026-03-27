import type { FieldKey } from "../fieldState";
import { INSURANCE_VERTICAL_CONFIG } from "./insurance";
import { USCIS_N400_VERTICAL_CONFIG } from "./uscisN400";

/**
 * Default vertical config package when a preset omits `configPackageId`.
 * Today the realtime engine’s primary reference vertical is insurance; other presets override explicitly.
 */
export const DEFAULT_LIVE_DEMO_CONFIG_PACKAGE_ID =
  INSURANCE_VERTICAL_CONFIG.configPackageId;

/**
 * Live demo dropdown: product or form line plus which field keys to surface for labels.
 * Vertical-agnostic — each preset points at a `configPackageId` catalog in shared (or future org overlays).
 */
export interface LiveDemoPreset {
  id: string;
  labels: { en: string; es: string };
  /**
   * Vertical config package for field labels. Defaults to `DEFAULT_LIVE_DEMO_CONFIG_PACKAGE_ID` when omitted.
   */
  configPackageId?: string;
  /** Field keys shown in the Application panel (subset of that package’s catalog). */
  visibleFieldKeys: FieldKey[];
}

export const LIVE_DEMO_PRESETS: LiveDemoPreset[] = [
  {
    id: "nlg_term_life",
    labels: {
      en: "NLG - Term Life",
      es: "NLG - Vida temporal",
    },
    /** NLG-style flow: identity → contact → coverage → underwriting (maps to LifeInsuranceEntity keys). */
    visibleFieldKeys: [
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "zip",
      "coverageAmountDesired",
      "productTypeInterest",
      "termLengthDesired",
      "budgetMonthly",
      "tobaccoUse",
      "heightFeet",
      "heightInches",
      "weightLbs",
      "existingCoverage",
      "existingCoverageAmount",
    ],
  },
  {
    id: "imm_n400",
    labels: {
      en: "Imm - N400",
      es: "Inm - N400",
    },
    configPackageId: USCIS_N400_VERTICAL_CONFIG.configPackageId,
    visibleFieldKeys: [
      "alienNumber",
      "firstName",
      "lastName",
      "dateOfBirth",
      "countryOfBirth",
      "maritalStatus",
      "address",
      "city",
      "state",
      "zip",
      "phone",
      "email",
      "dateBecameLpr",
      "yearsAsLpr",
    ],
  },
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

import type { VerticalConfig } from "../../verticalConfig";
import { attachN400FieldDescriptions } from "./fieldDescriptions";
import { buildN400Fields } from "./fields";
import { N400_SECTIONS } from "./sections";

/**
 * USCIS Form N-400 catalog: comprehensive field keys (form Parts 1–16), grouped into
 * four UI sections; bilingual labels, conditional visibility, PDF output hints where wired to Anvil.
 */
export const USCIS_N400_VERTICAL_CONFIG: VerticalConfig = {
  id: "uscis-n400-catalog-v2",
  version: "2024.1.0",
  vertical: "immigration",
  configPackageId: "uscis-n400",
  sections: N400_SECTIONS,
  fields: attachN400FieldDescriptions(buildN400Fields()),
  requiredFieldKeys: [
    "firstName",
    "lastName",
    "dateOfBirth",
    "countryOfBirth",
    "address",
    "city",
    "state",
    "zip",
    "phone",
    "preferredContactMethod",
  ],
};

export { N400_SECTION_IDS, N400_SECTIONS } from "./sections";
export { buildN400Fields, N400_MORAL_CHARACTER_FIELD_KEYS } from "./fields";
export * from "./rules";
export * from "./templates";
export * from "./workflow";

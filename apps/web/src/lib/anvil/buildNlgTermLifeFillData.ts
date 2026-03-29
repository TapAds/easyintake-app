/**
 * Maps canonical intake entities to Anvil `data` for National Life Group
 * template (EID e.g. XPOI5zF8rkDsy7gHNGUs). Keys and radio-style strings
 * match Anvil’s example payload. Only fields we can infer from entities are set.
 */

import type { AnvilNameBlock, AnvilPhoneBlock, AnvilUsAddress } from "./buildImmN400FillData";
import {
  buildUsAddressFromEntity,
  normalizeDateInput,
  phoneToAnvilBlock,
} from "./buildImmN400FillData";

function str(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return "";
}

function numOrUndef(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function proposedInsuredNameFromEntity(
  entities: Record<string, unknown>
): AnvilNameBlock | undefined {
  const first = str(entities.firstName);
  const last = str(entities.lastName);
  const mi = str(
    entities.middleName ?? entities.mi ?? entities.middleInitial
  ).slice(0, 3);
  if (!first && !last) return undefined;
  return { firstName: first, mi: mi, lastName: last };
}

function genderRadio(entities: Record<string, unknown>): string | undefined {
  const g = str(entities.gender).toUpperCase();
  if (g === "MALE" || g === "M") return "Gender - Male";
  if (g === "FEMALE" || g === "F") return "Gender - Female";
  return undefined;
}

function formatHeight(entities: Record<string, unknown>): string | undefined {
  const ft = numOrUndef(entities.heightFeet);
  const inch = numOrUndef(entities.heightInches);
  if (ft === undefined && inch === undefined) return undefined;
  const f = ft ?? 0;
  const i = inch ?? 0;
  if (!f && !i) return undefined;
  return `${f} ft ${i} in`;
}

function formatWeight(entities: Record<string, unknown>): string | undefined {
  const w = numOrUndef(entities.weightLbs);
  if (w === undefined) return undefined;
  return `${Math.round(w)} lbs`;
}

function tobaccoPartJ(entities: Record<string, unknown>): string | undefined {
  const t = entities.tobaccoUse;
  if (typeof t !== "boolean") return undefined;
  return t
    ? "Part J Question 4 - Tobacco use - Yes"
    : "Part J Question 4 - Tobacco use - No";
}

function inforcePartH(entities: Record<string, unknown>): string | undefined {
  const e = entities.existingCoverage;
  if (typeof e !== "boolean") return undefined;
  return e
    ? "Part H Question 1 - Has inforce insurance - Yes"
    : "Part H Question 1 - Has inforce insurance - No";
}

function primaryBeneficiaryText(
  entities: Record<string, unknown>
): string | undefined {
  const name = str(entities.beneficiaryName);
  const rel = str(entities.beneficiaryRelation);
  if (!name && !rel) return undefined;
  const parts = [name && `Name: ${name}`, rel && `Relationship: ${rel}`].filter(
    Boolean
  );
  return parts.join(". ");
}

function deathBenefitRadio(entities: Record<string, unknown>): string | undefined {
  const raw = str(
    entities.deathBenefitOption ?? entities.death_benefit_option
  ).toUpperCase();
  if (raw === "A" || raw.includes("LEVEL")) {
    return "Death Benefit Option - A Level";
  }
  if (raw === "B" || raw.includes("INCREAS")) {
    return "Death Benefit Option - B Increasing";
  }
  return undefined;
}

function copyName(n: AnvilNameBlock | undefined): AnvilNameBlock | undefined {
  return n ? { ...n } : undefined;
}

function copyAddr(a: AnvilUsAddress | undefined): AnvilUsAddress | undefined {
  return a ? { ...a } : undefined;
}

/**
 * Builds Anvil fill `data` for the NLG application template (example payload 2026).
 */
export function buildNlgTermLifeFillData(
  entities: Record<string, unknown>
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  const legalName = proposedInsuredNameFromEntity(entities);
  const addr = buildUsAddressFromEntity(entities);
  const phoneBlock = phoneToAnvilBlock(entities.phone);
  const dob = normalizeDateInput(entities.dateOfBirth);
  const email = str(entities.email);
  const gender = genderRadio(entities);
  const face = numOrUndef(entities.coverageAmountDesired);
  const termYears = numOrUndef(entities.termLengthDesired);
  const budget = numOrUndef(entities.budgetMonthly);

  if (legalName) {
    data.proposedInsuredName = copyName(legalName);
    data.proposedInsuredName1 = copyName(legalName);
    data.proposedInsuredNamePrintOrType = copyName(legalName);
    data.proposedInsuredsName = copyName(legalName);

    data.ownerFullName = copyName(legalName);
  }

  if (addr) {
    const h = copyAddr(addr);
    if (h) {
      data.homeAddress = h;
      data.proposedInsuredAddress = { ...h };
      data.ownerMailingAddress = { ...h };
    }
  }

  if (gender) data.proposedInsuredGender = gender;

  data.ownerType = "Owner is Proposed Insured";

  if (dob) data.dateOfBirth = dob;

  if (email) {
    data.eMailAddress = email;
    data.ownerEMailAddress = email;
  }

  if (phoneBlock) {
    const p: AnvilPhoneBlock = { ...phoneBlock };
    data.mobilePhone = { ...p };
    data.homePhone = { ...p };
    data.workPhone = { ...p };
    data.ownerTelephone = { ...p };
  }

  const occ = str(entities.occupation);
  if (occ) data.industryOccupation = occ;

  const inc = numOrUndef(entities.annualIncome ?? entities.annual_income);
  if (inc !== undefined) data.annualIncome = inc;

  const st = str(entities.state);
  if (st) data.stateOfResidence = st;

  const pob = str(entities.placeOfBirth ?? entities.placeOfBirthStateCountry);
  if (pob) data.placeOfBirthStateCountry = pob;

  const cit = str(entities.citizenship);
  if (cit) {
    const c = cit.toUpperCase();
    if (c === "USA" || c === "US" || c.includes("UNITED STATES")) {
      data.citizenshipStatus = "Citizen of USA";
    } else {
      data.citizenshipStatus = "Other Country";
      data.otherCountryName = cit;
    }
  }

  const prod = str(entities.productTypeInterest);
  if (prod) data.productName = prod;

  if (face !== undefined) data.faceAmount = face;

  if (termYears !== undefined) {
    data.termRiderPlan = `${Math.round(termYears)} Year Term`;
  }

  if (budget !== undefined) data.plannedPeriodicModalPremium = budget;

  const dbr = deathBenefitRadio(entities);
  if (dbr) data.deathBenefitOption = dbr;

  const ph = formatHeight(entities);
  if (ph) data.partJQuestion2Height = ph;

  const pw = formatWeight(entities);
  if (pw) data.partJQuestion2Weight = pw;

  const tj = tobaccoPartJ(entities);
  if (tj) data.partJQuestion4TobaccoUse = tj;

  const inh = inforcePartH(entities);
  if (inh) data.partHQuestion1HasInforceInsurance = inh;

  const exAmt = numOrUndef(entities.existingCoverageAmount);
  if (exAmt !== undefined) {
    data.ownerAmountInForce = exAmt;
    data.inforcePolicy1AmountOfCoverage = exAmt;
  }

  const ben = primaryBeneficiaryText(entities);
  if (ben) data.primaryBeneficiaryInformation = ben;

  return data;
}

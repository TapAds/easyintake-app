/**
 * Maps live-demo entity keys (uscis-n400 package) to Anvil N-400 template `data` aliases.
 * Only defined values are included; Anvil ignores unspecified template fields.
 */

export type AnvilPhoneBlock = {
  num: string;
  region: string;
  baseRegion: string;
};

export type AnvilUsAddress = {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type AnvilNameBlock = {
  firstName: string;
  mi: string;
  lastName: string;
};

function str(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return "";
}

export function normalizeDateInput(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return undefined;
    const isoDay = t.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDay) return isoDay[1];
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return undefined;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return undefined;
}

export function phoneToAnvilBlock(raw: unknown): AnvilPhoneBlock | undefined {
  const s = str(raw);
  if (!s) return undefined;
  const digits = s.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  const num =
    digits.length === 11 && digits.startsWith("1")
      ? digits.slice(1)
      : digits.slice(-10);
  return { num, region: "US", baseRegion: "US" };
}

function parseStreetParts(raw: unknown): { street1: string; street2?: string } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const street1 = str(o.street1 ?? o.line1 ?? o.address);
    const street2 = str(o.street2 ?? o.line2);
    return street2 ? { street1, street2 } : { street1 };
  }
  const line = str(raw);
  return { street1: line };
}

export function buildUsAddressFromEntity(
  entities: Record<string, unknown>
): AnvilUsAddress | undefined {
  const { street1, street2 } = parseStreetParts(entities.address);
  const city = str(entities.city);
  const state = str(entities.state);
  const zip = str(entities.zip);
  if (!street1 && !city && !state && !zip) return undefined;
  const base: AnvilUsAddress = {
    street1: street1 || "",
    city: city || "",
    state: state || "",
    zip: zip || "",
    country: "US",
  };
  if (street2) base.street2 = street2;
  return base;
}

function nameBlock(
  first: string,
  last: string,
  mi = ""
): AnvilNameBlock | undefined {
  const f = first.trim();
  const l = last.trim();
  const m = mi.trim();
  if (!f && !l) return undefined;
  return { firstName: f, mi: m, lastName: l };
}

const MARITAL_TO_TEMPLATE: { test: RegExp; value: string }[] = [
  {
    test: /^(single|never\s*married|soltero)/i,
    value: "Marital Status Single Never Married",
  },
  { test: /^married/i, value: "Marital Status Married" },
  { test: /^divorced/i, value: "Marital Status Divorced" },
  { test: /^widow/i, value: "Marital Status Widowed" },
  { test: /^separated/i, value: "Marital Status Separated" },
  { test: /^casado/i, value: "Marital Status Married" },
  { test: /^divorciad/i, value: "Marital Status Divorced" },
  { test: /^viudo/i, value: "Marital Status Widowed" },
];

function mapMaritalStatus(raw: unknown): string | undefined {
  const s = str(raw);
  if (!s) return undefined;
  for (const { test, value } of MARITAL_TO_TEMPLATE) {
    if (test.test(s)) return value;
  }
  return s;
}

/**
 * Builds Anvil `data` for the USCIS N-400 PDF template from intake entities.
 */
export function buildImmN400FillData(
  entities: Record<string, unknown>
): Record<string, unknown> {
  const firstName = str(entities.firstName);
  const lastName = str(entities.lastName);
  const legalName = nameBlock(firstName, lastName);

  const addr = buildUsAddressFromEntity(entities);
  const phone = phoneToAnvilBlock(entities.phone);
  const email = str(entities.email);
  const dob = normalizeDateInput(entities.dateOfBirth);
  const lpr = normalizeDateInput(entities.dateBecameLpr);
  const alien = str(entities.alienNumber);
  const countryOfBirth = str(entities.countryOfBirth);
  const marital = mapMaritalStatus(entities.maritalStatus);

  const data: Record<string, unknown> = {};

  if (legalName) {
    data.currentLegalName = legalName;
    data.otherNameUsedSinceBirthFirstEntry = { ...legalName };
    data.otherNameUsedSinceBirthSecondEntry = { ...legalName };
    data.newName = { ...legalName };
    data.applicantName = { ...legalName };
    data.inCareOfName = { ...legalName };
    data.interpretersFullName = { ...legalName };
    data.preparersFullName = { ...legalName };
    data.nameOfHeadOfHousehold = { ...legalName };
    data.currentSpouseName = { ...legalName };
    data.currentPhysicalAddressInCareOfName = { ...legalName };
  }

  if (alien) {
    data.aNumber = alien;
    data.aNumber1 = alien;
    data.aNumber2 = alien;
    data.aNumber3 = alien;
    data.aNumber4 = alien;
    data.aNumber5 = alien;
    data.part3ANumber = alien;
    data.part15ANumber = alien;
  }

  if (dob) data.dateOfBirth = dob;
  if (lpr) data.dateBecameLawfulPermanentResident = lpr;
  if (countryOfBirth) {
    data.countryOfBirth = countryOfBirth;
    data.countryOfCitizenshipOrNationality = countryOfBirth;
  }
  if (marital) data.currentMaritalStatus = marital;

  if (addr) {
    data.mailingAddressStreetNumberAndName = { ...addr };
    data.mailingAddressCityOrTown = { ...addr };
    data.mailingAddressState = { ...addr };
    data.mailingAddressZipCode = { ...addr };
    data.mailingAddressProvince = { ...addr };
    data.mailingAddressPostalCode = { ...addr };
    data.mailingAddressCountry = { ...addr };
    data.currentPhysicalAddressStreetNumberAndName = { ...addr };
    data.currentPhysicalAddressCityOrTown = { ...addr };
    data.currentPhysicalAddressState = { ...addr };
    data.currentPhysicalAddressZipCode = { ...addr };
    data.currentPhysicalAddressProvince = { ...addr };
    data.currentPhysicalAddressPostalCode = { ...addr };
    data.currentPhysicalAddressCountry = { ...addr };
    data.previousPhysicalAddress1StreetNumberAndName = { ...addr };
    data.previousPhysicalAddress1CityOrTown = { ...addr };
    data.previousPhysicalAddress1StateProvince = { ...addr };
    data.previousPhysicalAddress1ZipCodePostalCode = { ...addr };
    data.previousPhysicalAddress1Country = { ...addr };
  }

  if (phone) {
    data.applicantsDaytimeTelephoneNumber = { ...phone };
    data.applicantsMobileTelephoneNumber = { ...phone };
    data.interpretersDaytimeTelephoneNumber = { ...phone };
    data.interpretersMobileTelephoneNumber = { ...phone };
    data.preparersDaytimeTelephoneNumber = { ...phone };
    data.preparersMobileTelephoneNumber = { ...phone };
  }

  if (email) {
    data.applicantsEmailAddress = email;
    data.interpretersEmailAddress = email;
    data.preparersEmailAddress = email;
  }

  return data;
}

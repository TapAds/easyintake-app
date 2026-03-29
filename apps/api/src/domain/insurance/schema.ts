/**
 * V2 extraction schema — valid field names for the extraction prompt.
 * Source: CotizarAhora / extraction_v2 CRITICAL FIELDS.
 * Used by extraction_v2.ts to populate the VALID FIELDS section.
 */

export const EXTRACTION_FIELDS_FOR_PROMPT = `
PERSONAL: first_name, middle_name, last_name, dob, gender, home_address, city, state, zip, mobile_phone, email, citizenship, occupation, employer, annual_income, height, weight
OWNER: owner_type, owner_name, owner_dob, owner_relationship, owner_address, owner_email, owner_phone
BENEFICIARY: primary_beneficiary_name, primary_beneficiary_relationship, primary_beneficiary_dob, contingent_beneficiary_name, contingent_beneficiary_relationship
POLICY: product_name, company, face_amount, term_length, inforce_face_amount, death_benefit_option, coverage_type, premium_frequency, planned_premium, has_inforce_insurance, ever_declined, moving_violations, felony, bankruptcy, extreme_sports, aviation, foreign_travel
HEALTH: tobacco_use, tobacco_type, tobacco_frequency, current_medications, medications_list, doctor_name, last_doctor_visit
HEALTH CONDITIONS (yes/no): hx_heart, hx_circulatory, hx_respiratory, hx_digestive, hx_neurological, hx_cancer, hx_diabetes, drug_alcohol, specialist_visit, hospitalized, pending_appointments, family_hx_positive
`.trim();

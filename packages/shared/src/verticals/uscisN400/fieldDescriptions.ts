import type { LocalizedString, VerticalFieldDefinition } from "../../verticalConfig";
import { N400_MORAL_CHARACTER_FIELD_KEYS } from "./fields";

/** Shared tooltip for all Part 9 moral-character yes/no items. */
const PART9_TOOLTIP: LocalizedString = {
  en: 'These items come from N-400 Part 9 (good moral character and related grounds). Answer truthfully for the period the instructions require—often your whole life unless the form says otherwise. If you answer “yes,” review the official instructions for what to explain or attach.',
  es: "Estos ítems corresponden a la Parte 9 del N-400 (buen carácter moral y motivos relacionados). Responda con veracidad para el período que exijan las instrucciones—muchas veces toda su vida salvo que el formulario indique lo contrario. Si responde «sí», revise las instrucciones oficiales sobre qué explicar o anexar.",
};

const STATIC: Record<string, LocalizedString> = {
  "n400.p1.eligibilityBasis": {
    en: "USCIS uses this to see which naturalization rule set applies—general five-year path, marriage to a U.S. citizen, military service, or other. The basis can change required residence time and evidence.",
    es: "USCIS lo usa para ver qué reglas de naturalización aplican—vía general de cinco años, matrimonio con ciudadano estadounidense, servicio militar u otra. La base puede cambiar el tiempo de residencia exigido y las pruebas.",
  },
  "n400.p1.eligibilityExplanation": {
    en: "Use this only when the basis is not general, marriage, or military. Summarize briefly why a different category applies, as you would on the paper form.",
    es: "Úselo solo cuando la base no sea general, matrimonio ni militar. Resuma por qué aplica otra categoría, como en el formulario en papel.",
  },
  dateBecameLpr: {
    en: "The date you became a lawful permanent resident (green card holder). It is usually on your card or approval notice and drives eligibility and filing windows.",
    es: "Fecha en que se convirtió en residente permanente legal (tarjeta verde). Suele figurar en la tarjeta o notificación de aprobación y determina elegibilidad y plazos.",
  },
  yearsAsLpr: {
    en: "Approximate whole years as a permanent resident if you do not have the exact card date at hand; USCIS will rely on official records for the precise LPR date.",
    es: "Años aproximados como residente permanente si no tiene a mano la fecha exacta de la tarjeta; USCIS usará registros oficiales para la fecha precisa.",
  },
  alienNumber: {
    en: "The “A-number” USCIS assigns in many immigration cases. It often appears on your green card or prior notices—enter digits only if you have one.",
    es: "El «número A» que asigna USCIS en muchos casos. Suele aparecer en la tarjeta verde o notificaciones—ingrese solo dígitos si tiene uno.",
  },
  firstName: {
    en: "Your legal given name exactly as it appears on official identity or immigration documents you will submit with the application.",
    es: "Nombre de pila legal tal como aparece en documentos oficiales de identidad o inmigración que presentará con la solicitud.",
  },
  middleName: {
    en: "Middle name on your legal documents, if any. Leave blank only if no middle name was ever officially recorded.",
    es: "Segundo nombre en sus documentos legales, si existe. Déjelo vacío solo si no consta oficialmente.",
  },
  lastName: {
    en: "Current legal family name (surname) as shown on your passport, green card, or court order if you changed your name.",
    es: "Apellido legal actual como en pasaporte, tarjeta verde u orden judicial si cambió de nombre.",
  },
  "n400.p2.nameLegallyChanged": {
    en: "Answer yes if a court or marriage/divorce process formally changed your name since birth—not nicknames you use informally.",
    es: "Responda sí si un tribunal o matrimonio/divorcio cambió formalmente su nombre desde el nacimiento—no apodos informales.",
  },
  "n400.p2.priorLegalNames": {
    en: "List every other full legal name you have used, including maiden names or names from prior marriages, separated as the instructions direct.",
    es: "Enumere todo otro nombre legal que haya usado, incluido soltera/o o nombres por matrimonios anteriores, como indiquen las instrucciones.",
  },
  "n400.p2.ssnProvided": {
    en: "USCIS may cross-check tax and employment records; indicate whether you have ever been issued a U.S. Social Security number.",
    es: "USCIS puede contrastar registros fiscales y laborales; indique si alguna vez le asignaron un número de Seguro Social de EE.UU.",
  },
  "n400.p2.ssn": {
    en: "Enter your nine-digit SSN only if you have one; it is used for identity matching, not printed on the public receipt the same way as on the form.",
    es: "Ingrese su SSN de nueve dígitos solo si cuenta con uno; se usa para verificar identidad.",
  },
  dateOfBirth: {
    en: "Date of birth on your birth certificate or passport—the same date you use on all immigration filings.",
    es: "Fecha de nacimiento en acta o pasaporte—la misma que usa en trámites migratorios.",
  },
  "n400.p2.birthCity": {
    en: "City, town, or village where you were born as listed on your birth record, not necessarily where the hospital was located.",
    es: "Ciudad, pueblo o lugar de nacimiento según el acta, no necesariamente donde estaba el hospital.",
  },
  countryOfBirth: {
    en: "Country where you were born, using the country name or code style the form expects (often the country at time of birth).",
    es: "País de nacimiento, con la denominación que espera el formulario (a menudo el país vigente al nacer).",
  },
  gender: {
    en: "Sex or gender marker you are declaring for this petition; follow the form’s fixed choices and USCIS guidance for corrections.",
    es: "Sexo o género que declara en esta petición; siga las opciones fijas del formulario y la guía de USCIS para correcciones.",
  },
  "n400.p2.disabilityAccommodations": {
    en: "Request ADA-related arrangements for the biometrics or interview—interpreter, wheelchair access, extra time—if you need them.",
    es: "Solicite adaptaciones por discapacidad para huellas o entrevista—intérprete, acceso, tiempo extra—si las necesita.",
  },
  "n400.p2.accommodationDetails": {
    en: "Describe briefly what accommodation you need so USCIS can schedule appropriately.",
    es: "Describa qué adaptación necesita para que USCIS pueda programar adecuadamente.",
  },
  "n400.p3.usOnlineAccountNumber": {
    en: "If you created a USCIS online account, enter that account number; otherwise leave blank.",
    es: "Si creó una cuenta en línea de USCIS, ingrese ese número; si no, déjelo vacío.",
  },
  maritalStatus: {
    en: "Your current marital status under U.S. form categories—single, married, divorced, widowed, separated, or civil union as applicable.",
    es: "Estado civil actual según las categorías del formulario de EE.UU.",
  },
  "n400.p3.ethnicity": {
    en: "The ethnicity question follows federal statistical categories: Hispanic or Latino origin is reported separately from race.",
    es: "La pregunta de etnicidad sigue categorías federales: origen hispano o latino se reporta aparte de raza.",
  },
  "n400.p3.race": {
    en: "Race categories on the N-400 follow U.S. statistical standards; pick the options that best describe you per the instructions.",
    es: "Las categorías de raza siguen estándares estadísticos de EE.UU.; elija según las instrucciones.",
  },
  "n400.p3.heightFeet": {
    en: "Your height in feet as you would state on a medical or government form—whole feet only in this field.",
    es: "Estatura en pies como en un formulario médico o gubernamental—solo pies enteros en este campo.",
  },
  "n400.p3.heightInches": {
    en: "Remaining inches under 12 after feet—for example 5 feet 7 inches uses 5 here for feet and 7 here for inches (verify against the form layout).",
    es: "Pulgadas restantes bajo 12 después de los pies; verifique contra el diseño del formulario.",
  },
  "n400.p3.weightPounds": {
    en: "Current weight in pounds as a whole number, per form instructions.",
    es: "Peso actual en libras como número entero, según instrucciones.",
  },
  "n400.p3.eyeColor": {
    en: "Eye color from the form’s fixed palette—choose the closest official category.",
    es: "Color de ojos de la paleta fija del formulario.",
  },
  "n400.p3.hairColor": {
    en: "Hair color from the form’s list, including “bald” if applicable.",
    es: "Color de pelo de la lista del formulario, incluida «calvo» si aplica.",
  },
  address: {
    en: "Street number and name of where you physically live now—USCIS expects the dwelling address, not a P.O. box unless allowed for your situation.",
    es: "Número y calle donde vive físicamente ahora—no apartado postal salvo que las instrucciones lo permitan.",
  },
  city: {
    en: "City or town for your current physical residence.",
    es: "Ciudad o pueblo de su domicilio físico actual.",
  },
  state: {
    en: "U.S. state, territory, or District of Columbia abbreviation for the physical address.",
    es: "Estado, territorio o DC (abreviatura) del domicilio físico.",
  },
  zip: {
    en: "ZIP or postal code for the physical street address.",
    es: "Código ZIP del domicilio físico.",
  },
  "n400.p4.physicalSinceDate": {
   en: "The date you began living at this address; used to show residence continuity.",
    es: "Fecha en que comenzó a vivir en esta dirección; sirve para demostrar residencia.",
  },
  "n400.p4.mailingSameAsPhysical": {
    en: "Answer yes if mail should go to the same street address you listed as physical.",
    es: "Sí si el correo va a la misma dirección física indicada.",
  },
  "n400.p4.mailingStreet": {
    en: "Mailing address line if different from physical—for example a P.O. box or representative’s office.",
    es: "Dirección postal si difiere de la física—por ejemplo apartado u oficina del representante.",
  },
  "n400.p4.mailingCity": {
    en: "City for the mailing address when it differs from physical.",
    es: "Ciudad de la dirección postal cuando difiere.",
  },
  "n400.p4.mailingState": {
    en: "State for the mailing address when it differs from physical.",
    es: "Estado de la dirección postal cuando difiere.",
  },
  "n400.p4.mailingZip": {
    en: "ZIP for the mailing address when it differs from physical.",
    es: "ZIP de la dirección postal cuando difiere.",
  },
  "n400.p4.otherPriorAddresses": {
    en: "USCIS asks for other places you lived within the look-back period (commonly five years). Answer yes if you had additional U.S. homes.",
    es: "USCIS pide otros domicilios en el período de revisión (suele ser cinco años). Sí si tuvo más viviendas en EE.UU.",
  },
  "n400.p4.priorAddress1Street": {
    en: "Street address of a prior residence in the reporting period—the instructions may require every prior address.",
    es: "Calle de una residencia anterior en el período; las instrucciones pueden exigir todas.",
  },
  "n400.p4.priorAddress1City": {
    en: "City for that prior residence.",
    es: "Ciudad de esa residencia anterior.",
  },
  "n400.p4.priorAddress1State": {
    en: "State for that prior residence.",
    es: "Estado de esa residencia anterior.",
  },
  "n400.p4.priorAddress1Zip": {
    en: "ZIP for that prior residence.",
    es: "ZIP de esa residencia anterior.",
  },
  "n400.p4.priorAddress1From": {
    en: "Move-in or start date at the prior address.",
    es: "Fecha de inicio en la dirección anterior.",
  },
  "n400.p4.priorAddress1To": {
    en: "Move-out or end date at the prior address.",
    es: "Fecha de fin en la dirección anterior.",
  },
  "n400.p5.motherGiven": {
    en: "Mother’s given (first) name as she would appear on your birth certificate, or unknown/deceased markers per instructions.",
    es: "Nombre de pila de la madre como en su acta, o «desconocido»/«fallecida» según instrucciones.",
  },
  "n400.p5.motherFamily": {
    en: "Mother’s current or birth family name as the form requires.",
    es: "Apellido actual o de nacimiento de la madre según pide el formulario.",
  },
  "n400.p5.motherDob": {
    en: "Mother’s date of birth if known; used for biographic matching.",
    es: "Fecha de nacimiento de la madre si se conoce.",
  },
  "n400.p5.motherBirthCountry": {
    en: "Country where your mother was born.",
    es: "País de nacimiento de la madre.",
  },
  "n400.p5.motherDeceased": {
    en: "Indicate whether your mother has passed away, which can affect how biographic questions are answered.",
    es: "Indique si su madre falleció; puede afectar cómo se responde la sección biográfica.",
  },
  "n400.p5.fatherGiven": {
    en: "Father’s given name per birth record or legal documentation.",
    es: "Nombre de pila del padre según acta u otros documentos legales.",
  },
  "n400.p5.fatherFamily": {
    en: "Father’s family name as recorded for you at birth or adoption.",
    es: "Apellido del padre registrado a su nacimiento o adopción.",
  },
  "n400.p5.fatherDob": {
    en: "Father’s date of birth if known.",
    es: "Fecha de nacimiento del padre si se conoce.",
  },
  "n400.p5.fatherBirthCountry": {
    en: "Country where your father was born.",
    es: "País de nacimiento del padre.",
  },
  "n400.p5.fatherDeceased": {
    en: "Whether your father is deceased, for biographic completeness.",
    es: "Si su padre está fallecido, para completar la biografía.",
  },
  "n400.p6.currentlyMarried": {
    en: "Whether you have a legal spouse today affects spouse-related questions and sometimes evidence for marriage-based eligibility.",
    es: "Si tiene cónyuge legal hoy afecta preguntas del cónyuge y pruebas en vías por matrimonio.",
  },
  "n400.p6.spouseGiven": {
    en: "Current spouse’s given name as on the marriage certificate or passport.",
    es: "Nombre de pila del cónyuge actual como en acta de matrimonio o pasaporte.",
  },
  "n400.p6.spouseFamily": {
    en: "Current spouse’s family name.",
    es: "Apellido del cónyuge actual.",
  },
  "n400.p6.spouseDob": {
    en: "Current spouse’s date of birth.",
    es: "Fecha de nacimiento del cónyuge actual.",
  },
  "n400.p6.dateOfMarriage": {
    en: "Legal date of your current marriage—the marriage counted for immigration purposes.",
    es: "Fecha legal del matrimonio actual relevante a inmigración.",
  },
  "n400.p6.spouseUsCitizen": {
    en: "Whether your current spouse is a U.S. citizen by birth or naturalization matters for three-year marriage-based filings.",
    es: "Si el cónyuge actual es ciudadano por nacimiento o naturalización importa para trámites de tres años por matrimonio.",
  },
  "n400.p6.priorMarriagesCount": {
    en: "Number of previous marriages that legally ended before this one—digits only.",
    es: "Número de matrimonios anteriores legalmente disueltos antes del actual.",
  },
  "n400.p6.priorSpouseImmigrationBenefit": {
    en: "USCIS asks if any ex-spouse obtained permanent residence primarily through a petition you filed.",
    es: "USCIS pregunta si algún ex cónyuge obtuvo residencia permanente principalmente por una petición suya.",
  },
  "n400.p6.priorSpouseImmigrationExplain": {
    en: "Briefly identify which former spouse and the benefit, if you answered yes.",
    es: "Identifique brevemente al ex cónyuge y el beneficio si respondió sí.",
  },
  "n400.p7.employerOrSchool1": {
    en: "Name of your present employer or school—what you list on tax or HR records.",
    es: "Nombre de empleador o escuela actual según impuestos o recursos humanos.",
  },
  "n400.p7.occupation1": {
    en: "Job title or course of study for that employer or school.",
    es: "Puesto o carrera/estudios con ese empleador o escuela.",
  },
  "n400.p7.fromDate1": {
    en: "Approximate start date at the current employer or school.",
    es: "Fecha aproximada de inicio en el empleo o estudios actuales.",
  },
  "n400.p7.employerOrSchool2": {
    en: "Prior employer or school in the reporting window if you recently changed jobs or schools.",
    es: "Empleador o escuela anterior en el período reportado.",
  },
  "n400.p7.occupation2": {
    en: "Occupation or role at that prior employer or school.",
    es: "Ocupación en ese empleador o escuela anterior.",
  },
  "n400.p7.fromDate2": {
    en: "Start date at the prior employer or school.",
    es: "Fecha de inicio en el empleador o escuela anterior.",
  },
  "n400.p7.toDate2": {
    en: "End date at the prior employer or school.",
    es: "Fecha de fin en el empleador o escuela anterior.",
  },
  "n400.p8.hasTripsOutsideUS": {
    en: "Trips of more than 24 hours outside the U.S. during the statutory period can affect continuous residence—disclose all that apply.",
    es: "Viajes de más de 24 horas fuera de EE.UU. en el período legal pueden afectar residencia continua—declare los que apliquen.",
  },
  "n400.p8.trip1Country": {
    en: "Destination country or region for a disclosed trip away from the U.S.",
    es: "País o región de destino del viaje fuera de EE.UU.",
  },
  "n400.p8.trip1Depart": {
    en: "Date you left the U.S. on this trip.",
    es: "Fecha en que salió de EE.UU. en este viaje.",
  },
  "n400.p8.trip1Return": {
    en: "Date you returned to the U.S. from this trip.",
    es: "Fecha en que regresó a EE.UU. de este viaje.",
  },
  "n400.p10.denialRiskFactors": {
    en: "Part 10 covers statutory bars and other serious issues beyond Part 9. Answer if any instruction-listed conduct applies to you.",
    es: "La Parte 10 cubre impedimentos legales y asuntos graves más allá de la Parte 9. Sí si le aplica conducta listada en las instrucciones.",
  },
  "n400.p10.denialExplain": {
    en: "Provide a concise explanation for any “yes” in Part 10 as USCIS directs; immigration counsel often reviews this section.",
    es: "Explique brevemente todo «sí» en la Parte 10 como indique USCIS; un abogado suele revisar esta sección.",
  },
  "n400.p11.militaryService": {
    en: "Whether you serve or served in U.S. armed forces can affect eligibility and required documentation.",
    es: "Si sirvió o sirve en fuerzas armadas de EE.UU. puede afectar elegibilidad y documentación.",
  },
  "n400.p11.militaryBranch": {
    en: "Army, Navy, Air Force, Marines, Coast Guard, Space Force, or Reserve component as applicable.",
    es: "Ejército, Marina, Fuerza Aérea, Infantería de Marina, Guardia Costera, etc., según corresponda.",
  },
  "n400.p11.serviceFrom": {
    en: "Service start date for the branch you listed.",
    es: "Inicio del servicio en la rama indicada.",
  },
  "n400.p11.serviceTo": {
    en: "Service end date, or expected end if still serving.",
    es: "Fin del servicio, o fin previsto si aún sirve.",
  },
  "n400.p12.childSupportObligation": {
    en: "Child support, alimony, or court-ordered family obligations you must disclose if applicable.",
    es: "Manutención, pensión u obligaciones familiares ordenadas por tribunal si aplican.",
  },
  "n400.p12.childSupportExplain": {
    en: "Summarize orders or payments if you answered yes—attach documents if instructions require.",
    es: "Resuma órdenes o pagos si respondió sí; anexe documentos si las instrucciones lo piden.",
  },
  "n400.p13.nameChangeRequested": {
    en: "Whether you want your naturalization certificate issued in a new legal name, separate from prior name-change history in Part 2.",
    es: "Si desea el certificado de naturalización con un nombre legal nuevo, aparte del historial en la Parte 2.",
  },
  "n400.p13.newFullName": {
    en: "Full new name exactly as a court would order or as you will legally adopt upon naturalization.",
    es: "Nombre completo nuevo tal como ordenaría un tribunal o adoptará legalmente al naturalizarse.",
  },
  "n400.p14.certifyUnderstandEnglish": {
    en: "Attests you understand English-language and photocopy requirements; read the certification text carefully before signing.",
    es: "Certifica que comprende requisitos de inglés y copias; lea el texto antes de firmar.",
  },
  "n400.p15.usedInterpreter": {
    en: "Indicate if someone interpreted this application into a language you understand; interpreters may need to sign USCIS forms.",
    es: "Indique si alguien interpretó esta solicitud; los intérpretes pueden firmar formularios de USCIS.",
  },
  "n400.p15.interpreterName": {
    en: "Full printed name of the interpreter who helped prepare or review the N-400 with you.",
    es: "Nombre completo por extenso del intérprete que ayudó con el N-400.",
  },
  "n400.p16.usedPreparer": {
    en: "Lawyer or accredited representative who completed or reviewed the form on your behalf must be identified.",
    es: "Abogado o representante acreditado que completó o revisó el formulario debe identificarse.",
  },
  "n400.p16.preparerName": {
    en: "Full name of the attorney or preparer signing the preparer section.",
    es: "Nombre completo del abogado o preparador que firma la sección del preparador.",
  },
  phone: {
    en: "Daytime phone where USCIS or your representative can reach you quickly—include area code.",
    es: "Teléfono diurno con código de área donde USCIS o su representante puedan localizarle.",
  },
  email: {
    en: "Email for notices if you use electronic contact; ensure it is an account you monitor.",
    es: "Correo para notificaciones; use una cuenta que revise con frecuencia.",
  },
  preferredContactMethod: {
    en: "How you prefer follow-up—SMS, WhatsApp, email, or phone—so staff can match your habits.",
    es: "Cómo prefiere seguimiento—SMS, WhatsApp, correo o teléfono—para que el equipo lo contacte como usted desea.",
  },
};

const moralKeySet = new Set(N400_MORAL_CHARACTER_FIELD_KEYS);

/** Merge catalog fields with bilingual tooltip copy for the applicant UI. */
export function attachN400FieldDescriptions(
  fields: VerticalFieldDefinition[]
): VerticalFieldDefinition[] {
  return fields.map((f) => {
    const fromStatic = STATIC[f.key];
    if (fromStatic) return { ...f, description: fromStatic };
    if (moralKeySet.has(f.key)) return { ...f, description: PART9_TOOLTIP };
    return f;
  });
}

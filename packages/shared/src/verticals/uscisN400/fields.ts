import type { VerticalFieldDefinition } from "../../verticalConfig";
import {
  bool,
  dt,
  enm,
  num,
  tx,
} from "./helpers";
import { N400_SECTION_IDS as S } from "./sections";

/** Part 9 yes/no themes (abbrev.; align with current N-400 edition + instructions). */
const PART9_ITEMS: { key: string; en: string; es: string }[] = [
  {
    key: "n400.p9.moral_claimed_uscitizen",
    en: "Ever claimed to be a U.S. citizen (in writing or any other way)?",
    es: "¿Alguna vez dijo ser ciudadano estadounidense (por escrito o de otro modo)?",
  },
  {
    key: "n400.p9.moral_registered_to_vote",
    en: "Ever registered to vote or voted in violation of law?",
    es: "¿Se registró para votar o votó violando la ley?",
  },
  {
    key: "n400.p9.moral_false_claim_noncitizen_vote",
    en: "Ever claimed to be a noncitizen on voting/benefit forms?",
    es: "¿Declaró ser no ciudadano en formularios de votación o beneficios?",
  },
  {
    key: "n400.p9.moral_abandon_lpr",
    en: "Ever abandoned, lost, or had LPR status adjusted?",
    es: "¿Abandonó, perdió o le ajustaron la residencia permanente?",
  },
  {
    key: "n400.p9.moral_hereditary_titles",
    en: "Hereditary titles or orders of nobility?",
    es: "¿Títulos hereditarios u órdenes de nobleza?",
  },
  {
    key: "n400.p9.moral_exempt_us_service",
    en: "Exempted from U.S. service on non-citizen grounds?",
    es: "¿Exento del servicio de EE.UU. por ser no ciudadano?",
  },
  {
    key: "n400.p9.moral_convicted_crime",
    en: "Ever convicted of a crime (in U.S. or abroad)?",
    es: "¿Condenado alguna vez por un delito (EE.UU. o en el extranjero)?",
  },
  {
    key: "n400.p9.moral_incarcerated",
    en: "Ever incarcerated, detained, or on probation/parole?",
    es: "¿Preso, detenido, libertad condicional o probatoria?",
  },
  {
    key: "n400.p9.moral_violation_laws",
    en: "Violated controlled substance laws (except simple marijuana per instructions)?",
    es: "¿Violó leyes de sustancias controladas?",
  },
  {
    key: "n400.p9.moral_prostitution",
    en: "Engaged in prostitution, procuring, or related conduct?",
    es: "¿Prostitución, proxenetismo o conducta relacionada?",
  },
  {
    key: "n400.p9.moral_polygamy",
    en: "Practiced or been married to more than one person at once?",
    es: "¿Poligamia o más de un cónyuge a la vez?",
  },
  {
    key: "n400.p9.moral_help_smuggle",
    en: "Helped anyone enter or try to enter the U.S. illegally?",
    es: "¿Ayudó a alguien a entrar ilegalmente a EE.UU.?",
  },
  {
    key: "n400.p9.moral_illegal_entry",
    en: "Entered or remained in U.S. without admission/parole?",
    es: "¿Entró o permaneció sin admisión o parole?",
  },
  {
    key: "n400.p9.moral_deportation_removal",
    en: "Removed, deported, or excluded from the U.S.?",
    es: "¿Expulsado, deportado o excluido de EE.UU.?",
  },
  {
    key: "n400.p9.moral_selective_service",
    en: "Failed to register for Selective Service (if required)?",
    es: "¿Incumplió registro del Servicio Selectivo (si aplica)?",
  },
  {
    key: "n400.p9.moral_lied_gov",
    en: "Ever lied to U.S. government to obtain an immigration benefit?",
    es: "¿Mintió al gobierno de EE.UU. para obtener beneficio migratorio?",
  },
  {
    key: "n400.p9.moral_false_testimony",
    en: "Ever given false testimony for an immigration benefit?",
    es: "¿Falso testimonio para beneficio migratorio?",
  },
  {
    key: "n400.p9.moral_fraud_docs",
    en: "Fraud or misrepresentation to any U.S. government agency?",
    es: "¿Fraude o declaración falsa ante autoridad de EE.UU.?",
  },
  {
    key: "n400.p9.moral_sold_weapons",
    en: "Illegal weapons trafficking or failed to support dependents (see instructions)?",
    es: "¿Tráfico ilegal de armas o incumplimiento de manutención?",
  },
  {
    key: "n400.p9.moral_advocated_overthrow",
    en: "Advocated opposition to U.S. government or world communism exceptions?",
    es: "¿Abogó contra el gobierno de EE.UU. (ver instrucciones)?",
  },
  {
    key: "n400.p9.moral_persecution",
    en: "Participated in persecution, genocide, or torture?",
    es: "¿Participó en persecución, genocidio o tortura?",
  },
  {
    key: "n400.p9.moral_recruitment",
    en: "Recruitment or training for paramilitary / use of weapons (see instructions)?",
    es: "¿Reclutamiento o entrenamiento paramilitar?",
  },
  {
    key: "n400.p9.moral_weapon_use",
    en: "Used a weapon against someone or with intent to harm?",
    es: "¿Usó arma contra alguien o con intención de dañar?",
  },
  {
    key: "n400.p9.moral_served_force",
    en: "Served in armed group (police, militia, rebel, etc.)?",
    es: "¿Sirvió en grupo armado (policía, milicia, rebelde)?",
  },
  {
    key: "n400.p9.moral_detention_facility",
    en: "Worked in detention facility or as prison guard?",
    es: "¿Trabajó en centro de detención o como guardia?",
  },
  {
    key: "n400.p9.moral_worn_uniform",
    en: "Worn official uniform in non-U.S. armed service?",
    es: "¿Usó uniforme oficial en fuerza armada no estadounidense?",
  },
  {
    key: "n400.p9.moral_tribe_clan",
    en: "Member of tribe or clan involved in combat?",
    es: "¿Miembro de tribu o clan involucrado en combate?",
  },
  {
    key: "n400.p9.moral_terrorist",
    en: "Engaged in sabotage, espionage, or terrorism?",
    es: "¿Participó en sabotaje, espionaje o terrorismo?",
  },
  {
    key: "n400.p9.moral_threat_use_force",
    en: "Used force while purporting to act under official authority?",
    es: "¿Usó fuerza bajo apariencia de autoridad oficial?",
  },
  {
    key: "n400.p9.moral_exchange_hostages",
    en: "Participated in hostage exchanges or similar (see instructions)?",
    es: "¿Participó en intercambio de rehenes o similar?",
  },
  {
    key: "n400.p9.moral_genocide",
    en: "Participated in genocide?",
    es: "¿Participó en genocidio?",
  },
  {
    key: "n400.p9.moral_torture",
    en: "Participated in torture or extrajudicial killing?",
    es: "¿Tortura o ejecución extrajudicial?",
  },
  {
    key: "n400.p9.moral_sexual_offense",
    en: "Serious injury, sexual offense, or kidnapping-related conduct?",
    es: "¿Lesión grave, delito sexual o secuestro?",
  },
  {
    key: "n400.p9.moral_trafficking",
    en: "Human trafficking or related offenses?",
    es: "¿Trata de personas u otros delitos relacionados?",
  },
  {
    key: "n400.p9.moral_child_removed",
    en: "Removed a child from lawful custody or withheld custody?",
    es: "¿Sustrajo a un menor de custodia legal?",
  },
  {
    key: "n400.p9.moral_voted_fraud",
    en: "False claim to U.S. citizenship for any purpose or benefit?",
    es: "¿Falsa ciudadanía para cualquier fin o beneficio?",
  },
  {
    key: "n400.p9.moral_owes_taxes",
    en: "Federal, state, or local taxes owed and not paid (if applicable)?",
    es: "¿Impuestos atrasados federales, estatales o locales?",
  },
  {
    key: "n400.p9.moral_attachments_true",
    en: "Understand that attachments must be true copies (attestation context)?",
    es: "Entiende que los anexos deben ser copias fidedignas",
  },
];

/** Moral character field keys — derived from `PART9_ITEMS` (single source of truth). */
export const N400_MORAL_CHARACTER_FIELD_KEYS: readonly string[] = PART9_ITEMS.map((item) => item.key);

function part9Fields(): VerticalFieldDefinition[] {
  return PART9_ITEMS.map((item, i) =>
    bool(item.key, S.additional, i, item.en, item.es, {
      sourceRef: `N-400 Part 9 (${i + 1})`,
      weight: 1,
    })
  );
}

export function buildN400Fields(): VerticalFieldDefinition[] {
  const A = S.applicant;
  const ET = S.employmentTravel;
  const AD = S.additional;
  const CT = S.contact;

  const physicalAddress: VerticalFieldDefinition = {
    key: "address",
    type: "address",
    sectionId: A,
    order: 300,
    labels: {
      en: "Physical street number and name",
      es: "Calle y número (domicilio físico)",
    },
    stage: "application",
    weight: 12,
  };

  return [
    enm(
      "n400.p1.eligibilityBasis",
      A,
      0,
      "Basis for applying (general, marriage, military, other)",
      "Base (general, matrimonio, militar, otra)",
      {
        sourceRef: "N-400 Part 1",
        validation: [{ kind: "enum", value: ["general", "marriage", "military", "other"] }],
        weight: 20,
      }
    ),
    tx(
      "n400.p1.eligibilityExplanation",
      A,
      1,
      "Explain if basis is “other”",
      "Explique si la base es “otra”",
      {
        visibility: {
          allOf: [{ fieldKey: "n400.p1.eligibilityBasis", equals: "other" }],
        },
        sourceRef: "N-400 Part 1",
      }
    ),
    dt(
      "dateBecameLpr",
      A,
      2,
      "Date became lawful permanent resident",
      "Fecha en que se obtuvo la residencia permanente",
      {
        sourceRef: "N-400 Part 1",
        weight: 25,
        outputMappings: [
          { destinationKind: "pdf", destinationKey: "dateBecameLawfulPermanentResident" },
        ],
      }
    ),
    num(
      "yearsAsLpr",
      A,
      3,
      "Years as permanent resident (if known)",
      "Años como residente permanente",
      { sourceRef: "N-400 Part 1", weight: 5 }
    ),

    tx("alienNumber", A, 100, "A-Number (if any)", "Número A (si aplica)", {
      sourceRef: "N-400 Part 2",
      outputMappings: [
        { destinationKind: "pdf", destinationKey: "aNumber" },
        { destinationKind: "pdf", destinationKey: "part3ANumber" },
      ],
    }),
    tx("firstName", A, 101, "Given name", "Nombre", {
      validation: [{ kind: "required" }],
      weight: 15,
    }),
    tx("middleName", A, 102, "Middle name (if any)", "Segundo nombre", { weight: 5 }),
    tx("lastName", A, 103, "Family name", "Apellido", {
      validation: [{ kind: "required" }],
      weight: 15,
    }),
    bool(
      "n400.p2.nameLegallyChanged",
      A,
      104,
      "Has your name legally changed?",
      "¿Su nombre ha cambiado legalmente?",
      { sourceRef: "N-400 Part 2" }
    ),
    tx("n400.p2.priorLegalNames", A, 105, "All other legal names used", "Otros nombres legales", {
      visibility: { allOf: [{ fieldKey: "n400.p2.nameLegallyChanged", equals: true }] },
    }),
    bool(
      "n400.p2.ssnProvided",
      A,
      106,
      "Do you have (or had) a U.S. Social Security number?",
      "¿Tiene o tuvo número de Seguro Social de EE.UU.?",
      {}
    ),
    tx("n400.p2.ssn", A, 107, "Social Security number", "Número de Seguro Social", {
      visibility: { allOf: [{ fieldKey: "n400.p2.ssnProvided", equals: true }] },
    }),
    dt("dateOfBirth", A, 108, "Date of birth", "Fecha de nacimiento", {
      validation: [{ kind: "required" }],
      weight: 20,
      outputMappings: [{ destinationKind: "pdf", destinationKey: "dateOfBirth" }],
    }),
    tx("n400.p2.birthCity", A, 109, "City/town/village of birth", "Ciudad/pueblo de nacimiento", {
      weight: 10,
    }),
    tx("countryOfBirth", A, 110, "Country of birth", "País de nacimiento", {
      weight: 10,
      outputMappings: [
        { destinationKind: "pdf", destinationKey: "countryOfBirth" },
        { destinationKind: "pdf", destinationKey: "countryOfCitizenshipOrNationality" },
      ],
    }),
    enm("gender", A, 111, "Gender", "Sexo", {
      validation: [{ kind: "enum", value: ["male", "female", "nonbinary", "unspecified"] }],
    }),
    bool(
      "n400.p2.disabilityAccommodations",
      A,
      112,
      "Request disability accommodations for interview?",
      "¿Solicita adaptaciones por discapacidad para la entrevista?",
      {}
    ),
    tx("n400.p2.accommodationDetails", A, 113, "Describe accommodations", "Describa las adaptaciones", {
      visibility: {
        allOf: [{ fieldKey: "n400.p2.disabilityAccommodations", equals: true }],
      },
    }),

    tx("n400.p3.usOnlineAccountNumber", A, 200, "USCIS online account number (if any)", "Cuenta en línea USCIS", {}),
    enm("maritalStatus", A, 201, "Marital status", "Estado civil", {
      validation: [
        {
          kind: "enum",
          value: ["single", "married", "divorced", "widowed", "separated", "civil_union"],
        },
      ],
      outputMappings: [{ destinationKind: "pdf", destinationKey: "currentMaritalStatus" }],
    }),
    enm("n400.p3.ethnicity", A, 202, "Ethnicity — Hispanic or Latino?", "¿Es hispano o latino?", {
      validation: [{ kind: "enum", value: ["hispanic", "not_hispanic"] }],
    }),
    tx("n400.p3.race", A, 203, "Race (per form instructions)", "Raza", {}),
    num("n400.p3.heightFeet", A, 204, "Height — feet", "Estatura — pies", {}),
    num("n400.p3.heightInches", A, 205, "Height — inches", "Estatura — pulgadas", {}),
    num("n400.p3.weightPounds", A, 206, "Weight — pounds", "Peso — libras", {}),
    enm("n400.p3.eyeColor", A, 207, "Eye color", "Color de ojos", {
      validation: [
        {
          kind: "enum",
          value: ["brown", "blue", "green", "hazel", "gray", "maroon", "pink", "unknown"],
        },
      ],
    }),
    enm("n400.p3.hairColor", A, 208, "Hair color", "Color de cabello", {
      validation: [
        {
          kind: "enum",
          value: ["bald", "black", "blond", "brown", "gray", "red", "sandy", "white", "unknown"],
        },
      ],
    }),

    physicalAddress,
    tx("city", A, 301, "City or town", "Ciudad", { weight: 8 }),
    tx("state", A, 302, "State", "Estado", { weight: 8 }),
    tx("zip", A, 303, "ZIP Code", "Código postal", { weight: 8 }),
    dt("n400.p4.physicalSinceDate", A, 304, "Lived at this address since", "Vive aquí desde", {}),
    bool(
      "n400.p4.mailingSameAsPhysical",
      A,
      305,
      "Mailing address same as physical?",
      "¿Correo igual que domicilio físico?",
      {}
    ),
    tx("n400.p4.mailingStreet", A, 306, "Mailing — street", "Correo — calle", {
      visibility: { allOf: [{ fieldKey: "n400.p4.mailingSameAsPhysical", equals: false }] },
    }),
    tx("n400.p4.mailingCity", A, 307, "Mailing — city", "Correo — ciudad", {
      visibility: { allOf: [{ fieldKey: "n400.p4.mailingSameAsPhysical", equals: false }] },
    }),
    tx("n400.p4.mailingState", A, 308, "Mailing — state", "Correo — estado", {
      visibility: { allOf: [{ fieldKey: "n400.p4.mailingSameAsPhysical", equals: false }] },
    }),
    tx("n400.p4.mailingZip", A, 309, "Mailing — ZIP", "Correo — ZIP", {
      visibility: { allOf: [{ fieldKey: "n400.p4.mailingSameAsPhysical", equals: false }] },
    }),
    bool(
      "n400.p4.otherPriorAddresses",
      A,
      310,
      "Other residences in past 5 years?",
      "¿Otras residencias en los últimos 5 años?",
      {}
    ),
    tx("n400.p4.priorAddress1Street", A, 311, "Prior residence — street", "Residencia anterior — calle", {
      visibility: { allOf: [{ fieldKey: "n400.p4.otherPriorAddresses", equals: true }] },
    }),
    tx("n400.p4.priorAddress1City", A, 312, "Prior residence — city", "Residencia anterior — ciudad", {
      visibility: { allOf: [{ fieldKey: "n400.p4.otherPriorAddresses", equals: true }] },
    }),
    tx("n400.p4.priorAddress1State", A, 313, "Prior residence — state", "Residencia anterior — estado", {
      visibility: { allOf: [{ fieldKey: "n400.p4.otherPriorAddresses", equals: true }] },
    }),
    tx("n400.p4.priorAddress1Zip", A, 314, "Prior residence — ZIP", "Residencia anterior — ZIP", {
      visibility: { allOf: [{ fieldKey: "n400.p4.otherPriorAddresses", equals: true }] },
    }),
    dt("n400.p4.priorAddress1From", A, 315, "Prior residence — from", "Desde", {
      visibility: { allOf: [{ fieldKey: "n400.p4.otherPriorAddresses", equals: true }] },
    }),
    dt("n400.p4.priorAddress1To", A, 316, "Prior residence — to", "Hasta", {
      visibility: { allOf: [{ fieldKey: "n400.p4.otherPriorAddresses", equals: true }] },
    }),

    tx("n400.p5.motherGiven", A, 400, "Mother’s given name", "Nombre de la madre", {}),
    tx("n400.p5.motherFamily", A, 401, "Mother’s family name", "Apellido de la madre", {}),
    dt("n400.p5.motherDob", A, 402, "Mother’s date of birth", "Fecha de nacimiento de la madre", {}),
    tx("n400.p5.motherBirthCountry", A, 403, "Mother’s country of birth", "País de nacimiento de la madre", {}),
    bool("n400.p5.motherDeceased", A, 404, "Mother deceased?", "¿Madre fallecida?", {}),
    tx("n400.p5.fatherGiven", A, 405, "Father’s given name", "Nombre del padre", {}),
    tx("n400.p5.fatherFamily", A, 406, "Father’s family name", "Apellido del padre", {}),
    dt("n400.p5.fatherDob", A, 407, "Father’s date of birth", "Fecha de nacimiento del padre", {}),
    tx("n400.p5.fatherBirthCountry", A, 408, "Father’s country of birth", "País de nacimiento del padre", {}),
    bool("n400.p5.fatherDeceased", A, 409, "Father deceased?", "¿Padre fallecido?", {}),

    bool("n400.p6.currentlyMarried", A, 500, "Currently married?", "¿Actualmente casado/a?", {}),
    tx("n400.p6.spouseGiven", A, 501, "Current spouse given name", "Nombre del cónyuge", {
      visibility: { allOf: [{ fieldKey: "n400.p6.currentlyMarried", equals: true }] },
    }),
    tx("n400.p6.spouseFamily", A, 502, "Current spouse family name", "Apellido del cónyuge", {
      visibility: { allOf: [{ fieldKey: "n400.p6.currentlyMarried", equals: true }] },
    }),
    dt("n400.p6.spouseDob", A, 503, "Spouse date of birth", "Fecha de nacimiento del cónyuge", {
      visibility: { allOf: [{ fieldKey: "n400.p6.currentlyMarried", equals: true }] },
    }),
    dt("n400.p6.dateOfMarriage", A, 504, "Date of marriage to current spouse", "Fecha del matrimonio actual", {
      visibility: { allOf: [{ fieldKey: "n400.p6.currentlyMarried", equals: true }] },
    }),
    bool("n400.p6.spouseUsCitizen", A, 505, "Current spouse is a U.S. citizen?", "¿Cónyuge actual es ciudadano de EE.UU.?", {
      visibility: { allOf: [{ fieldKey: "n400.p6.currentlyMarried", equals: true }] },
    }),
    num("n400.p6.priorMarriagesCount", A, 506, "Number of prior marriages", "Número de matrimonios anteriores", {}),
    bool(
      "n400.p6.priorSpouseImmigrationBenefit",
      A,
      507,
      "Did any former spouse obtain a green card through you?",
      "¿Algún ex cónyuge obtuvo residencia por usted?",
      {}
    ),
    tx("n400.p6.priorSpouseImmigrationExplain", A, 508, "Explain (former spouse benefit)", "Explique (beneficio del ex cónyuge)", {
      visibility: {
        allOf: [{ fieldKey: "n400.p6.priorSpouseImmigrationBenefit", equals: true }],
      },
    }),

    tx("n400.p7.employerOrSchool1", ET, 0, "Current employer or school (name)", "Empleo o estudios actual — nombre", { weight: 10 }),
    tx("n400.p7.occupation1", ET, 1, "Occupation", "Ocupación", {}),
    dt("n400.p7.fromDate1", ET, 2, "Employer/school — from", "Desde", {}),
    tx("n400.p7.employerOrSchool2", ET, 3, "Prior employer or school (name)", "Empleo o estudios anterior — nombre", {}),
    tx("n400.p7.occupation2", ET, 4, "Prior occupation", "Ocupación anterior", {}),
    dt("n400.p7.fromDate2", ET, 5, "Prior — from", "Anterior desde", {}),
    dt("n400.p7.toDate2", ET, 6, "Prior — to", "Anterior hasta", {}),

    bool(
      "n400.p8.hasTripsOutsideUS",
      ET,
      100,
      "Trips outside the U.S. (over 24h) in statutory period?",
      "¿Viajes fuera de EE.UU. (más de 24 h) en el período?",
      {}
    ),
    tx("n400.p8.trip1Country", ET, 101, "Trip — country or region", "Viaje — país", {
      visibility: { allOf: [{ fieldKey: "n400.p8.hasTripsOutsideUS", equals: true }] },
    }),
    dt("n400.p8.trip1Depart", ET, 102, "Trip — departed", "Salida", {
      visibility: { allOf: [{ fieldKey: "n400.p8.hasTripsOutsideUS", equals: true }] },
    }),
    dt("n400.p8.trip1Return", ET, 103, "Trip — returned", "Regreso", {
      visibility: { allOf: [{ fieldKey: "n400.p8.hasTripsOutsideUS", equals: true }] },
    }),

    ...part9Fields(),

    bool(
      "n400.p10.denialRiskFactors",
      AD,
      100,
      "Any conduct in Part 10 instructions to disclose?",
      "¿Algún motivo de la Parte 10 a declarar?",
      {}
    ),
    tx("n400.p10.denialExplain", AD, 101, "Part 10 explanation", "Explicación Parte 10", {
      visibility: { allOf: [{ fieldKey: "n400.p10.denialRiskFactors", equals: true }] },
    }),

    bool("n400.p11.militaryService", AD, 200, "Current or past U.S. armed forces?", "¿Fuerzas armadas de EE.UU. actual o pasado?", {}),
    tx("n400.p11.militaryBranch", AD, 201, "Branch (if yes)", "Rama militar", {
      visibility: { allOf: [{ fieldKey: "n400.p11.militaryService", equals: true }] },
    }),
    dt("n400.p11.serviceFrom", AD, 202, "Service from", "Servicio desde", {
      visibility: { allOf: [{ fieldKey: "n400.p11.militaryService", equals: true }] },
    }),
    dt("n400.p11.serviceTo", AD, 203, "Service to", "Servicio hasta", {
      visibility: { allOf: [{ fieldKey: "n400.p11.militaryService", equals: true }] },
    }),

    bool("n400.p12.childSupportObligation", AD, 300, "Child support / court orders (see instructions)?", "¿Manutención u órdenes judiciales?", {}),
    tx("n400.p12.childSupportExplain", AD, 301, "Explain child support / orders", "Explique manutención", {
      visibility: { allOf: [{ fieldKey: "n400.p12.childSupportObligation", equals: true }] },
    }),

    bool("n400.p13.nameChangeRequested", AD, 400, "Requesting a name change with naturalization?", "¿Solicita cambio de nombre?", {}),
    tx("n400.p13.newFullName", AD, 401, "New name (if requesting change)", "Nombre nuevo", {
      visibility: { allOf: [{ fieldKey: "n400.p13.nameChangeRequested", equals: true }] },
    }),

    bool("n400.p14.certifyUnderstandEnglish", AD, 500, "Understand English and attachment requirements?", "¿Comprende requisitos de inglés y anexos?", {}),

    bool("n400.p15.usedInterpreter", AD, 600, "Interpreter used for this application?", "¿Se usó intérprete?", {}),
    tx("n400.p15.interpreterName", AD, 601, "Interpreter full name", "Nombre del intérprete", {
      visibility: { allOf: [{ fieldKey: "n400.p15.usedInterpreter", equals: true }] },
    }),

    bool("n400.p16.usedPreparer", AD, 700, "Attorney/preparer assisted?", "¿Asistencia de abogado o preparador?", {}),
    tx("n400.p16.preparerName", AD, 701, "Preparer full name", "Nombre del preparador", {
      visibility: { allOf: [{ fieldKey: "n400.p16.usedPreparer", equals: true }] },
    }),

    {
      key: "phone",
      type: "phone",
      sectionId: CT,
      order: 0,
      labels: { en: "Daytime phone", es: "Teléfono diurno" },
      stage: "application",
      weight: 12,
    },
    {
      key: "email",
      type: "email",
      sectionId: CT,
      order: 1,
      labels: { en: "Email", es: "Correo electrónico" },
      stage: "application",
    },
    enm(
      "preferredContactMethod",
      CT,
      2,
      "Preferred contact method",
      "Método de contacto preferido",
      {
        validation: [
          { kind: "enum", value: ["sms", "whatsapp", "email", "phone"] },
        ],
        weight: 8,
      }
    ),
  ];
}

import type { VerticalFieldDefinition } from "../../verticalConfig";

type F = VerticalFieldDefinition;

export function tx(
  key: string,
  sectionId: string,
  order: number,
  en: string,
  es: string,
  extra?: Partial<F>
): F {
  return {
    key,
    type: "text",
    sectionId,
    order,
    labels: { en, es },
    stage: "application",
    ...extra,
  };
}

export function dt(
  key: string,
  sectionId: string,
  order: number,
  en: string,
  es: string,
  extra?: Partial<F>
): F {
  return {
    key,
    type: "date",
    sectionId,
    order,
    labels: { en, es },
    stage: "application",
    ...extra,
  };
}

export function num(
  key: string,
  sectionId: string,
  order: number,
  en: string,
  es: string,
  extra?: Partial<F>
): F {
  return {
    key,
    type: "number",
    sectionId,
    order,
    labels: { en, es },
    stage: "application",
    ...extra,
  };
}

export function bool(
  key: string,
  sectionId: string,
  order: number,
  en: string,
  es: string,
  extra?: Partial<F>
): F {
  return {
    key,
    type: "boolean",
    sectionId,
    order,
    labels: { en, es },
    stage: "application",
    ...extra,
  };
}

export function enm(
  key: string,
  sectionId: string,
  order: number,
  en: string,
  es: string,
  extra?: Partial<F>
): F {
  return {
    key,
    type: "enum",
    sectionId,
    order,
    labels: { en, es },
    stage: "application",
    ...extra,
  };
}

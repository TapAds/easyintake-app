/**
 * Logos clipped from `public/settings/crm-integrations-reference.png` (1024×460)
 * so glyphs match the design reference.
 */
const REF_W = 1024;
const REF_H = 460;

/** Top-left of each 40×40 logo inside the reference image (source pixels). */
const CLIP: Record<CrmId, { x: number; y: number }> = {
  pipedrive: { x: 46, y: 154 },
  gohighlevel: { x: 534, y: 154 },
  hubspot: { x: 46, y: 238 },
  salesforce: { x: 534, y: 238 },
  attio: { x: 46, y: 322 },
  exlynx: { x: 534, y: 322 },
  agencyzoom: { x: 46, y: 388 },
  agentcrm: { x: 520, y: 382 },
};

export type CrmId =
  | "pipedrive"
  | "gohighlevel"
  | "hubspot"
  | "salesforce"
  | "attio"
  | "exlynx"
  | "agencyzoom"
  | "agentcrm";

const SPRITE_SRC = "/settings/crm-integrations-reference.png";

export function CrmLogo({
  id,
  className,
  size = 40,
}: {
  id: CrmId;
  className?: string;
  size?: number;
}) {
  const p = CLIP[id];
  const scale = size / 40;
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-md ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${SPRITE_SRC})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${REF_W * scale}px ${REF_H * scale}px`,
        backgroundPosition: `${-p.x * scale}px ${-p.y * scale}px`,
      }}
      role="img"
      aria-hidden
    />
  );
}

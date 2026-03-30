import Image from "next/image";

/**
 * Raster marks: `public/settings/crm/*.png`.
 * Other CRMs: sprite `public/settings/crm-integrations-reference.png`.
 */
const REF_W = 1024;
const REF_H = 460;

export type CrmId =
  | "pipedrive"
  | "gohighlevel"
  | "hubspot"
  | "salesforce"
  | "attio"
  | "exlynx"
  | "agencyzoom"
  | "agentcrm";

const RASTER_SRC: Partial<Record<CrmId, string>> = {
  pipedrive: "/settings/crm/pipedrive.png",
  gohighlevel: "/settings/crm/gohighlevel.png",
  hubspot: "/settings/crm/hubspot.png",
  salesforce: "/settings/crm/salesforce.png",
  attio: "/settings/crm/attio.png",
};

/** Top-left of each 40×40 logo inside the reference sprite (source pixels). */
const SPRITE_CLIP: Partial<Record<CrmId, { x: number; y: number }>> = {
  exlynx: { x: 534, y: 322 },
  agencyzoom: { x: 46, y: 388 },
  agentcrm: { x: 520, y: 382 },
};

const SPRITE_SRC = "/settings/crm-integrations-reference.png";

function rasterPath(id: CrmId): string | undefined {
  return RASTER_SRC[id];
}

export function CrmLogo({
  id,
  className,
  size = 40,
}: {
  id: CrmId;
  className?: string;
  size?: number;
}) {
  const raster = rasterPath(id);
  if (raster) {
    return (
      <Image
        src={raster}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-md object-contain ${className ?? ""}`}
        sizes={`${size}px`}
      />
    );
  }

  const p = SPRITE_CLIP[id];
  if (!p) {
    return null;
  }
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

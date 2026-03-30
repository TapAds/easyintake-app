export type LegalContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string }
  | { type: "list"; items: string[] };

export function LegalDocumentBlocks({ blocks }: { blocks: LegalContentBlock[] }) {
  return (
    <div className="mt-3 space-y-3 text-foreground/80 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === "list") {
          return (
            <ul
              key={i}
              className="list-disc pl-6 space-y-1 marker:text-foreground/50"
            >
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "subheading") {
          return (
            <h3
              key={i}
              className="text-base font-semibold text-foreground pt-2 first:pt-0"
            >
              {block.text}
            </h3>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

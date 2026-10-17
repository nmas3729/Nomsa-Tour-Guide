// Photo attribution is intentionally not rendered in public UI to keep images clean.
// Complete creator/license/source records remain in `src/lib/image-attributions.ts`
// and `docs/image-audit-log.md` for internal audit purposes.
export function ImageAttribution({
  src: _src,
  className: _className = "",
}: {
  src: string;
  className?: string;
}) {
  void _src;
  void _className;
  return null;
}

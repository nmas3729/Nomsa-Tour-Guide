# Image Guidelines

## Source approval

Use, in order of preference:

1. Nomsa Tour Guides' own photographs with documented permission.
2. Official South African tourism, conservation, and destination sources with explicit reuse permission.
3. Photographer portfolios with documented commercial-use permission.
4. Stock libraries with a verified commercial license for the exact photograph.
5. Free-stock sources only after checking the actual image and current license terms.

Never infer subject, location, identity, or rights from a filename, alt text, thumbnail, or stock-site name alone. Visually inspect the exact asset. Confirm location using trustworthy source metadata or distinctive, recognizable landmarks. When the exact location is uncertain, use a regional or subject-only label and record the uncertainty.

## Asset and attribution records

- Keep approved destination and experience images under `public/images/south-africa/` with descriptive filenames.
- Record the image's original URL, visible subject, intended page/component, location evidence, creator, license, attribution terms, and decision in `docs/image-audit-log.md`.
- Keep the creator, license, and source URL in `src/lib/image-attributions.ts` for photographs presented with on-image attribution.
- For Creative Commons images, retain attribution and source/license links as required by the exact license. Follow ShareAlike terms when distributing an adaptation. Record CC0 or public-domain status without implying that attribution is required.
- For Unsplash or another stock library, link the exact image source and license terms. Do not invent a photographer when the image page does not identify one.
- Do not silently replace an image whose source or commercial rights are unresolved. Leave it unchanged, mark it `UNVERIFIED` or `PARTIALLY VERIFIED`, and document why.

## Alt text and crops

- Describe the visible subject and only the location that the image evidence supports.
- Use descriptive alt text for informative destination and experience photographs; use empty alt text for purely decorative images.
- Avoid repeating nearby prose or adding unsupported claims such as a specific estate, beach, landmark, wildlife sighting, or community.
- Use `object-cover` only when the subject remains recognizable at the image's rendered aspect ratio. Check focal crops on mobile, tablet, and desktop, particularly portrait wildlife photographs and wide landscapes.
- Use the approved image path consistently across listing cards, detail galleries, booking summaries, and social metadata. Avoid reusing an image to imply a different place or activity.

## Guide portraits

- A named guide portrait must be a real photo whose identity and permission to publish are confirmed.
- Never use a stock model or generated portrait for a named guide.
- If an authorized photo is not available, omit the portrait URL and keep the initials avatar fallback.
- Apply the same requirements to guide cards, experience hosts, booking summaries, guide profiles, and review avatars. Re-audit user-supplied portraits before publication.

## Validation checklist

Before publishing an image change:

1. Open the actual full-size source and confirm the visible subject.
2. Confirm location evidence and commercial-use terms for the exact image.
3. Add or update the audit-log entry and visible attribution where required.
4. Check the alt text, source mapping, local asset path, and Next.js image configuration.
5. Render every affected page and inspect desktop, tablet, and mobile crops.
6. Confirm no non-image behavior or layout changes were introduced.

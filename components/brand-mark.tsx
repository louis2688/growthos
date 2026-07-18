import Image from "next/image";

/**
 * The brand mark — Dave's logo (purple colorway), cropped square in public/brand/mark.png.
 * The source PNG has a white background, so it sits on a white rounded tile with a hairline
 * border — readable on the dark glass shell, light theme, and the login gradient alike.
 * ponytail: PNG-in-tile until Dave exports a transparent SVG; then the tile can go.
 */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <span
      className={`grid flex-none place-items-center overflow-hidden rounded-lg border border-black/10 bg-white ${className}`}
    >
      <Image src="/brand/mark.png" alt="" width={22} height={22} aria-hidden />
    </span>
  );
}

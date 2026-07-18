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

/**
 * Full brand lockup: mark + product name + the house line. "by LaunchLift" is HTML rather than
 * baked into the raster — crisp at every size, and it follows the theme.
 */
export function BrandLockup() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className="size-9" />
      <span className="flex flex-col justify-center">
        <span className="font-heading text-lg font-bold leading-tight">GrowthOS</span>
        <span className="text-[10px] font-medium leading-none tracking-wide text-muted-foreground">
          by LaunchLift
        </span>
      </span>
    </span>
  );
}

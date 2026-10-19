import Image from "next/image";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block shrink-0 overflow-hidden bg-[#0b1729] ring-1 ring-[#c9a65e]/45 shadow-[0_2px_12px_rgba(7,19,37,0.35)] ${className ?? ""}`}
    >
      <Image
        alt=""
        className="h-full w-full scale-[1.2] object-cover"
        height={768}
        src="/logo.webp"
        width={1408}
      />
    </span>
  );
}

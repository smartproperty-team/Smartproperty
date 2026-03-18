import { PaletteButton } from "./PaletteButton";

export function PaletteNavbar() {
  const links = ["Home", "Features", "Properties", "Contact"];

  return (
    <header className="sticky top-0 z-30 border-b border-palette-secondary/25 bg-palette-primary/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a href="#" className="text-lg font-bold tracking-tight text-white">
          SmartProperty
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link}>
              <a
                href="#"
                className="text-sm font-medium text-white/85 transition-colors hover:text-palette-accent"
              >
                {link}
              </a>
            </li>
          ))}
        </ul>

        <PaletteButton variant="accent" className="hidden md:inline-flex">
          Get Started
        </PaletteButton>

        <PaletteButton
          variant="outline"
          className="md:hidden !px-3 !py-2 !text-xs"
        >
          Menu
        </PaletteButton>
      </nav>
    </header>
  );
}

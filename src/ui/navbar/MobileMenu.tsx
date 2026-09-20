"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import AuthStatus from "./AuthStatus"; // Importamos AuthStatus
import LanguageSwitcher from "./LanguageSwitcher";

interface Props {
  links: { name: string; href: string }[];
  onOpen?: () => void;
}

export default function MobileMenu({ links, onOpen }: Props) {
  const t = useTranslations("nav");
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollPositionRef = useRef({ x: 0, y: 0 });

  const isActiveLink = (href: string) =>
    href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setIsMounted(false), 420);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    firstLinkRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeMenu, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const clickedTrigger = buttonRef.current?.contains(target);
      const clickedNavigation = navigationRef.current?.contains(target);

      if (!clickedTrigger && !clickedNavigation) closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closeMenu, isOpen]);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const body = document.body;
    const root = document.documentElement;
    const previousStyles = {
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      rootOverflow: root.style.overflow,
      rootOverscrollBehavior: root.style.overscrollBehavior,
    };
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousStyles.bodyOverflow;
      body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
      root.style.overflow = previousStyles.rootOverflow;
      root.style.overscrollBehavior = previousStyles.rootOverscrollBehavior;
      window.scrollTo(scrollPositionRef.current.x, scrollPositionRef.current.y);
    };
  }, [isMounted]);

  const openMenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    scrollPositionRef.current = { x: window.scrollX, y: window.scrollY };
    onOpen?.();
    setIsMounted(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsOpen(true));
    });
  };

  return (
    <>
      <div className="relative z-50 xl:hidden">
        <button
          ref={buttonRef}
          type="button"
          onClick={isOpen ? closeMenu : openMenu}
          aria-label={isOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {isOpen ? <ChevronRight className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {isMounted &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              className={`fixed right-0 top-0 z-40 h-dvh w-dvw bg-black/65 transition-opacity duration-[420ms] ${
                isOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={closeMenu}
            />
            <nav
              ref={navigationRef}
              id="mobile-navigation"
              aria-label={t("mobileNavigation")}
              aria-hidden={!isOpen}
              inert={!isOpen}
              className={`fixed right-0 top-0 z-50 flex h-dvh w-[min(64vw,25rem)] flex-col border-l border-white/10 bg-black p-5 transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                isOpen
                  ? "translate-x-0 animate-[mobile-drawer-enter_420ms_cubic-bezier(0.22,1,0.36,1)]"
                  : "translate-x-full"
              }`}
            >
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label={t("closeMenu")}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-8 flex flex-col gap-1">
                {links.map((link, index) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    ref={index === 0 ? firstLinkRef : undefined}
                    onClick={closeMenu}
                    aria-current={isActiveLink(link.href) ? "page" : undefined}
                    className={`font-display flex min-h-11 items-center rounded-xl px-3 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                      isActiveLink(link.href)
                        ? "bg-white/15 text-white focus-visible:ring-white/60"
                        : "text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:ring-white/60"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              <div className="mt-auto border-t border-white/10 pt-4">
                 <LanguageSwitcher onLanguageChange={closeMenu} />
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <AuthStatus isMobile={true} />
              </div>
            </nav>
          </>,
          document.body,
        )}
    </>
  );
}

"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

type SidebarMotionDivProps = Omit<React.ComponentProps<typeof motion.div>, "children"> & {
  children?: React.ReactNode;
};

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: SidebarMotionDivProps) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as unknown as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: SidebarMotionDivProps) => {
  const { open, setOpen, animate } = useSidebar();

  return (
    <motion.div
      className={cn(
        // No w-17 — framer-motion controls all width
        "relative z-40 h-full py-4 hidden md:flex md:flex-col shrink-0 overflow-hidden",
        "glass border-r border-border",
        className
      )}
      animate={{ width: animate ? (open ? "260px" : "64px") : "260px" }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {/* X button — appears top-right only when expanded */}
      <AnimatePresence>
        {open ? (
          <motion.button
            key="close-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="absolute top-3 right-3 z-50 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </motion.button>
        ) : null}
      </AnimatePresence>

      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <>
      {/* Mobile top bar */}
      <div
        className={cn(
          "sticky top-0 z-40 h-14 px-4 flex flex-row md:hidden items-center justify-between w-full shrink-0",
          "bg-background/80 border-b border-border"
        )}
        {...props}
      >
        <div className="text-sm font-semibold text-foreground/80">Menu</div>
        <button
          onClick={() => setOpen(!open)}
          className="text-foreground p-2 rounded-lg hover:bg-accent/70 transition-colors duration-200"
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            {/* Dim overlay — NO blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
            />

            {/* Slide-in drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-[80vw] max-w-80 md:hidden",
                "bg-background border-r border-border",
                "flex flex-col px-4 pt-4 pb-6",
                className
              )}
            >
              {/* Drawer header with X */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground/90">NeuroLex</span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close sidebar"
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">{children}</div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  active,
  ...props
}: {
  link: Links;
  className?: string;
  active?: boolean;
  props?: LinkProps;
}) => {
  const { open, setOpen, animate } = useSidebar();
  const showLabel = !animate || open;

  return (
    <Link
      href={link.href}
      onClick={() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setOpen(false);
        }
      }}
      className={cn(
        "flex items-center py-2 px-2 rounded-lg transition-colors duration-200",
        animate && !open ? "justify-center" : "justify-start gap-3",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
        className
      )}
      {...props}
    >
      {/* Icon always visible */}
      <span className="shrink-0">{link.icon}</span>

      {/* Label fades + collapses in/out */}
      <AnimatePresence initial={false}>
        {showLabel && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="text-sm font-semibold whitespace-nowrap overflow-hidden"
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
};
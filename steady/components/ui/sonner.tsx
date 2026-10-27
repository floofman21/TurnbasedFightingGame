"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      toastOptions={{
        // Prototype toast: inverted surface, centered at the bottom.
        style: {
          background: "var(--fg)",
          color: "var(--bg)",
          border: "none",
          borderRadius: "9px",
          fontWeight: 500,
        },
      }}
      {...props}
    />
  );
}

export { Toaster };

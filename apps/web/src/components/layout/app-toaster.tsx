"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Global toast notification container styled for the FaceLens dark theme.
 */
export function AppToaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#1B202B",
          border: "1px solid #252A35",
          color: "#FFFFFF",
        },
      }}
    />
  );
}

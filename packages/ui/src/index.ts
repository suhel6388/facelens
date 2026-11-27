export { cn } from "./utils";

export const DESIGN_TOKENS = {
  background: "#08090D",
  surface: "#101218",
  card: "#151821",
  elevated: "#1B202B",
  border: "#252A35",
  primary: "#E94B78",
  secondary: "#6575FF",
  foreground: "#FFFFFF",
  muted: "#9CA3AF",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

export { BrandLogo, type BrandLogoProps } from "./components/brand-logo";
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Input, type InputProps } from "./components/input";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card";
export { StatusBadge, type BadgeStatus, type StatusBadgeProps } from "./components/badge";
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ConfirmDialog,
  type ConfirmDialogProps,
} from "./components/dialog";

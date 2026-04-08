import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-border/70 bg-background text-foreground shadow-xl",
          title: "text-sm font-semibold",
          description: "text-sm text-muted-foreground",
          actionButton: "rounded-full",
          cancelButton: "rounded-full",
        },
      }}
    />
  );
}

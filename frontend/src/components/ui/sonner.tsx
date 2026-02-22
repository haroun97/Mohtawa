import { Toaster as Sonner, toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

/** Toaster with position responsive to viewport: bottom-center on mobile, bottom-right on desktop. */
export function ResponsiveToaster(props: Omit<ToasterProps, "position">) {
  const isMobile = useIsMobile();
  return <Toaster {...props} position={isMobile ? "bottom-center" : "bottom-right"} />;
}

export { Toaster, toast };

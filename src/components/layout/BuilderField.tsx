import { memo, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import type { TypographyField } from "../../types/resume";
import { FieldLayoutPopover } from "./FieldLayoutPopover";

interface BuilderFieldProps {
  label: string;
  field?: TypographyField;
  className?: string;
  children: ReactNode;
}

export const BuilderField = memo(function BuilderField({
  label,
  field,
  className,
  children,
}: BuilderFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {field ? <FieldLayoutPopover field={field} compact /> : null}
      </div>
      {children}
    </div>
  );
});

import type { ButtonHTMLAttributes } from "react";
import { STR } from "../strings";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  blockingSlice: string;
  children: React.ReactNode;
};

export function EmBreveButton({ blockingSlice, children, className, ...rest }: Props) {
  const tooltip = STR.emBreve.tooltip.replace("{slice}", blockingSlice);
  const cls = `btn btn--primary${className ? ` ${className}` : ""}`;
  return (
    <button
      {...rest}
      type="button"
      disabled
      title={tooltip}
      className={cls}
      data-testid={`em-breve-${blockingSlice}`}
    >
      {children}
    </button>
  );
}

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "primary", className, ...rest }: Props) {
  const cls = `btn btn--${variant}${className ? ` ${className}` : ""}`;
  return <button {...rest} className={cls} />;
}

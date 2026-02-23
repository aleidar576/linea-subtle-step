import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (valueCents: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Input de moeda em centavos.
 * Exibe valor formatado com vírgula (ex: "29,00").
 * Aceita apenas dígitos; bloqueia pontos, letras e especiais.
 * `value` e `onChange` trabalham em centavos (int).
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = "0,00", className, disabled }, ref) => {
    const format = (cents: number): string => {
      const str = String(Math.max(0, Math.round(cents)));
      const padded = str.padStart(3, "0");
      const reais = padded.slice(0, -2);
      const centavos = padded.slice(-2);
      return `${reais},${centavos}`;
    };

    const [display, setDisplay] = React.useState(() => (value ? format(value) : ""));

    React.useEffect(() => {
      setDisplay(value ? format(value) : "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      if (!raw) {
        setDisplay("");
        onChange(0);
        return;
      }
      const cents = parseInt(raw, 10);
      setDisplay(format(cents));
      onChange(cents);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Block period/dot
      if (e.key === ".") e.preventDefault();
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          R$
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          value={display}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };

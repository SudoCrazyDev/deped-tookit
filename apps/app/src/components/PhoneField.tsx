import { forwardRef, type ChangeEvent } from "react";
import { caretAfterFormat, countDigits, formatSubscriber, toSubscriberDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Props = {
  /** The bare ten-digit subscriber number. */
  value: string;
  onChange: (digits: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  name?: string;
  "aria-describedby"?: string;
};

/**
 * Philippine mobile entry with a fixed +63 and digit grouping as you type.
 *
 * The country code lives outside the editable area so it cannot be deleted or
 * mistyped, and the field carries only the subscriber number.
 */
export const PhoneField = forwardRef<HTMLInputElement, Props>(function PhoneField(
  { value, onChange, onBlur, disabled, invalid, id, name, ...aria },
  ref,
) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = countDigits(input.value, caret);

    const digits = toSubscriberDigits(input.value);
    onChange(digits);

    // React will re-render with the formatted value; restore the caret against
    // the same digit afterwards so editing mid-number does not jump to the end.
    const formatted = formatSubscriber(digits);
    requestAnimationFrame(() => {
      const next = caretAfterFormat(formatted, digitsBeforeCaret);
      input.setSelectionRange(next, next);
    });
  }

  return (
    <div
      className={cn(
        "flex h-9 w-full overflow-hidden rounded-md border border-input bg-transparent shadow-xs",
        "transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        invalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span
        aria-hidden="true"
        className="flex select-none items-center border-r bg-muted px-3 text-sm font-medium text-muted-foreground tabular"
      >
        +63
      </span>
      <input
        ref={ref}
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="917 123 4567"
        aria-invalid={invalid}
        disabled={disabled}
        value={formatSubscriber(value)}
        onChange={handleChange}
        onBlur={onBlur}
        className="min-w-0 flex-1 bg-transparent px-3 py-1 text-base tracking-wide outline-none tabular placeholder:text-muted-foreground md:text-sm"
        {...aria}
      />
    </div>
  );
});

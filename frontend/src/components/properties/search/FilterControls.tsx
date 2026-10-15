// ===========================================
// Small controls for the filters dialog
// ===========================================

import { Minus, Plus, type LucideIcon } from "lucide-react";
import { useId, useRef, type KeyboardEvent } from "react";

// ---------- Stepper: "Any", "1+", "2+" ... as on Airbnb ----------

interface CountStepperProps {
  label: string;
  value?: number;
  max?: number;
  anyLabel: string;
  fewerLabel: string;
  moreLabel: string;
  onChange: (value: number | undefined) => void;
}

export function CountStepper({
  label,
  value,
  max = 8,
  anyLabel,
  fewerLabel,
  moreLabel,
  onChange,
}: CountStepperProps) {
  const id = useId();
  const current = value ?? 0;

  return (
    <div className="lsx-stepper" role="group" aria-labelledby={id}>
      <span id={id} className="lsx-stepper__label">
        {label}
      </span>
      <div className="lsx-stepper__control">
        <button
          type="button"
          className="lsx-stepper__btn"
          aria-label={fewerLabel}
          disabled={current === 0}
          onClick={() => onChange(current > 1 ? current - 1 : undefined)}
        >
          <Minus size={16} aria-hidden="true" />
        </button>
        {/* Read out after each change, like Airbnb's aria-live stepper. */}
        <output className="lsx-stepper__value" aria-live="polite">
          {current ? `${current}+` : anyLabel}
        </output>
        <button
          type="button"
          className="lsx-stepper__btn"
          aria-label={moreLabel}
          disabled={current >= max}
          onClick={() => onChange(current + 1)}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ---------- Segmented control: one choice, arrow keys move it ----------

interface SegmentedProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div className="lsx-segmented" role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Switch row: a feature with a one-line explanation ----------

interface SwitchRowProps {
  icon: LucideIcon;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SwitchRow({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: SwitchRowProps) {
  const id = useId();
  return (
    <div className="lsx-switch-row">
      <div className="lsx-switch-row__lead">
        <Icon size={22} aria-hidden="true" />
        <div className="lsx-switch-row__text">
          <strong id={`${id}-label`}>{label}</strong>
          <small id={`${id}-hint`}>{hint}</small>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        className="lsx-switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

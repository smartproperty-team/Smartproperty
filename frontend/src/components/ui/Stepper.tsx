import type { ReactNode } from "react";
import "./stepper.css";

export interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  children: ReactNode;
  actions?: ReactNode;
  ariaLabel?: string;
  allowStepNavigation?: boolean;
  onStepChange?: (stepIndex: number) => void;
}

export function Stepper({
  steps,
  currentStep,
  children,
  actions,
  ariaLabel = "Form steps",
  allowStepNavigation = false,
  onStepChange,
}: StepperProps) {
  return (
    <section className="ui-stepper">
      <div className="ui-stepper-steps" role="list" aria-label={ariaLabel}>
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isStepClickable =
            allowStepNavigation &&
            typeof onStepChange === "function" &&
            index <= currentStep;

          const stepContent = (
            <>
              <span
                className={`ui-stepper-circle ${
                  isCompleted
                    ? "is-completed"
                    : isActive
                      ? "is-active"
                      : "is-upcoming"
                }`}
                aria-hidden="true"
              >
                {isCompleted ? "✓" : index + 1}
              </span>
              <span
                className={`ui-stepper-label ${isActive ? "is-active" : ""}`}
              >
                {step.label}
              </span>
            </>
          );

          return (
            <div key={step.id} className="ui-stepper-item" role="listitem">
              {isStepClickable ? (
                <button
                  type="button"
                  className="ui-stepper-step ui-stepper-step-button"
                  onClick={() => onStepChange(index)}
                  aria-current={isActive ? "step" : undefined}
                >
                  {stepContent}
                </button>
              ) : (
                <div
                  className="ui-stepper-step"
                  aria-current={isActive ? "step" : undefined}
                >
                  {stepContent}
                </div>
              )}

              {index < steps.length - 1 && (
                <span
                  className={`ui-stepper-connector ${index < currentStep ? "is-completed" : ""}`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="ui-stepper-content">{children}</div>
      {actions && <div className="ui-stepper-actions">{actions}</div>}
    </section>
  );
}

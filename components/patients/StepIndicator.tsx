"use client";

import { Check } from "lucide-react";
import { Step } from "./registration-steps";

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <nav aria-label="Registration progress" className="mb-8 select-none">
      <ol className="flex items-center justify-center">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <li key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isCompleted && onStepClick(step.id)}
                  disabled={!isCompleted && !isActive}
                  aria-current={isActive ? "step" : undefined}
                  className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all
                    ${isActive ? "bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/20" : ""}
                    ${isCompleted ? "bg-primary text-primary-foreground cursor-pointer hover:opacity-90" : ""}
                    ${!isActive && !isCompleted ? "bg-muted text-muted-foreground border border-border cursor-default" : ""}
                  `}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id + 1}
                </button>
                <span className={`text-[11px] font-semibold mt-1.5 text-center leading-tight
                  ${isActive ? "text-primary" : ""}
                  ${isCompleted ? "text-primary" : ""}
                  ${!isActive && !isCompleted ? "text-muted-foreground" : ""}
                `}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-10 h-px mx-2 mb-5 ${isCompleted ? "bg-primary" : "bg-border"}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

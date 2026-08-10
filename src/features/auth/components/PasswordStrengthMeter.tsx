import React from "react";

interface PasswordStrengthMeterProps {
  strength: {
    score: number;
    label: string;
    color: string;
  };
}

const PasswordStrengthMeter = React.memo(
  ({ strength }: PasswordStrengthMeterProps) => {
    if (!strength.label) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength:</span>
          <span
            className={`font-medium ${strength.color.replace("bg-", "text-")}`}
          >
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((level) => (
            <div
              key={level}
              className={`h-1 flex-1 rounded-full transition-colors ${
                level <= strength.score ? strength.color : "bg-gray-3"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }
);

PasswordStrengthMeter.displayName = "PasswordStrengthMeter";

export default PasswordStrengthMeter;

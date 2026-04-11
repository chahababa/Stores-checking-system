"use client";

type ConfirmSubmitButtonProps = {
  label: string;
  confirmMessage?: string;
  className?: string;
  testId?: string;
};

export function ConfirmSubmitButton({
  label,
  confirmMessage,
  className,
  testId,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={className}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          return;
        }

        event.currentTarget.form?.requestSubmit();
      }}
    >
      {label}
    </button>
  );
}

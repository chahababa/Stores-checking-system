"use client";

type ConfirmSubmitButtonProps = {
  label: string;
  confirmMessage?: string;
  className?: string;
};

export function ConfirmSubmitButton({
  label,
  confirmMessage,
  className,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      type="button"
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

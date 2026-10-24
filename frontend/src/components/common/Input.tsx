import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-danger focus:ring-danger focus:border-danger',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

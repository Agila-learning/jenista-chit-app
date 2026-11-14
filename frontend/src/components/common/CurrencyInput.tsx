import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { formatIndianNumber, parseIndianNumber, calculateIndianCursorPosition } from '../../utils/indianCurrency';
import { cn } from '../../utils/cn';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string | null | undefined;
  onChange: (rawAmount: number, formattedString: string, rawString: string) => void;
  allowDecimals?: boolean;
  prefix?: string;
  label?: string;
  error?: string;
  helperText?: string;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      value,
      onChange,
      allowDecimals = false,
      prefix = '₹',
      label,
      error,
      helperText,
      className,
      id,
      placeholder = '0',
      disabled,
      ...props
    },
    forwardedRef
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const generatedId = React.useId();
    const inputId = id || generatedId;

    // Track the internal formatted display string
    const [displayValue, setDisplayValue] = useState<string>(() => {
      if (value === null || value === undefined || value === '') return '';
      return formatIndianNumber(value, { allowDecimals });
    });

    // Store cursor position to restore after React render
    const cursorRef = useRef<number | null>(null);

    // Sync when external value prop changes
    useEffect(() => {
      const formatted = formatIndianNumber(value, { allowDecimals });
      setDisplayValue(prev => {
        // If numeric value didn't change, avoid resetting display to preserve user-entered decimal points like "100."
        if (parseIndianNumber(prev) === parseIndianNumber(value)) {
          return prev;
        }
        return formatted;
      });
    }, [value, allowDecimals]);

    // Restore cursor position seamlessly
    useLayoutEffect(() => {
      if (cursorRef.current !== null && inputRef.current) {
        inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
        cursorRef.current = null;
      }
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawEntered = e.target.value;
      const currentCursor = e.target.selectionStart ?? rawEntered.length;

      // Allow digits and only one dot if allowDecimals
      let sanitized = rawEntered.replace(/[^0-9.]/g, '');
      if (!allowDecimals) {
        sanitized = sanitized.replace(/\./g, '');
      } else {
        const parts = sanitized.split('.');
        if (parts.length > 2) {
          sanitized = parts[0] + '.' + parts.slice(1).join('');
        }
      }

      const formatted = formatIndianNumber(sanitized, { allowDecimals });
      const newCursorPos = calculateIndianCursorPosition(rawEntered, currentCursor, formatted);

      cursorRef.current = newCursorPos;
      setDisplayValue(formatted);

      const rawNumeric = parseIndianNumber(formatted);
      onChange(rawNumeric, formatted, sanitized);
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            {label}
          </label>
        )}
        <div className="relative rounded-xl shadow-2xs">
          {prefix && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-slate-500 font-bold text-sm sm:text-base select-none">{prefix}</span>
            </div>
          )}
          <input
            id={inputId}
            ref={(node) => {
              inputRef.current = node;
              if (typeof forwardedRef === 'function') {
                forwardedRef(node);
              } else if (forwardedRef) {
                (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
              }
            }}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full rounded-xl border border-slate-300 bg-white py-2 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
              prefix ? 'pl-8 pr-3' : 'px-3',
              error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-200',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

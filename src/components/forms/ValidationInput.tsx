'use client';

import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

interface ValidationInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  validationRules?: ValidationRule[];
  showValidation?: boolean;
  onValidationChange?: (isValid: boolean) => void;
  error?: string; // Add error prop for external validation errors
}

export const ValidationInput = forwardRef<HTMLInputElement, ValidationInputProps>(
  ({ label, value, validationRules = [], showValidation = true, onValidationChange, onChange, className, error, type, ...props }, ref) => {
    const inputId = useId();
    const [errors, setErrors] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [isTouched, setIsTouched] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Use ref to avoid useCallback dependency issues
    const onValidationChangeRef = useRef(onValidationChange);
    onValidationChangeRef.current = onValidationChange;

    const validateInput = useCallback((value: string) => {
      const newErrors: string[] = [];
      const newWarnings: string[] = [];

      validationRules.forEach(rule => {
        if (!rule.test(value)) {
          if (rule.message.includes('wajib') || rule.message.includes('required')) {
            newErrors.push(rule.message);
          } else {
            newWarnings.push(rule.message);
          }
        }
      });

      setErrors(newErrors);
      setWarnings(newWarnings);

      const currentValid = newErrors.length === 0;
      setIsValid(currentValid);
      onValidationChangeRef.current?.(currentValid);
    }, [validationRules]);

    useEffect(() => {
      if (value !== undefined) {
        validateInput(String(value));
      }
    }, [value, validateInput]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsTouched(true);
      validateInput(e.target.value);
      onChange?.(e);
    };

    const handleBlur = () => {
      setIsTouched(true);
    };

    const isPasswordField = type === 'password';
    const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : type;
    const hasErrors = (errors.length > 0 && isTouched) || !!error;
    const hasWarnings = warnings.length > 0 && isTouched && errors.length === 0 && !error;
    const isSuccess = isValid && isTouched && String(value).length > 0 && !error;

    return (
      <div className="form-group">
        <label htmlFor={inputId} className="form-label text-gray-800 font-medium">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="relative">
          <input
            id={inputId}
            type={inputType}
            className={cn(
              'form-input transition-all duration-200',
              (isPasswordField || hasErrors || hasWarnings) && 'pr-10', // Add padding for icons
              hasErrors && 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50',
              hasWarnings && 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50',
              isSuccess && 'border-green-500 focus:border-green-500 focus:ring-green-500 bg-green-50',
              className
            )}
            ref={ref}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            {...props}
          />

          {/* Password visibility toggle - highest priority */}
          {isPasswordField && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
              )}
            </button>
          )}

          {/* Error Icon - only show if not password field */}
          {hasErrors && !isPasswordField && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}

          {/* Warning Icon - only show if not password field */}
          {hasWarnings && !isPasswordField && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          )}
        </div>

        {/* External error - always show if exists */}
        {error && (
          <div className="mt-2">
            <p className="text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {error}
            </p>
          </div>
        )}

        {/* Internal validation messages */}
        {showValidation && isTouched && (
          <div className="mt-2 space-y-1">
            
            {/* Internal validation errors */}
            {errors.map((errorMsg, index) => (
              <p key={`error-${index}`} className="text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {errorMsg}
              </p>
            ))}

            {warnings.map((warning, index) => (
              <p key={`warning-${index}`} className="text-sm text-yellow-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                </svg>
                {warning}
              </p>
            ))}

            {isSuccess && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Valid
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

ValidationInput.displayName = 'ValidationInput';

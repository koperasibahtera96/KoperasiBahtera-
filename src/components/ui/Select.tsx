'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className = ''
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedOutsideSelect = selectRef.current && !selectRef.current.contains(target);
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (clickedOutsideSelect && clickedOutsideDropdown) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && selectRef.current) {
      const rect = selectRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const dropdown = isOpen && mounted ? (
    <div 
      ref={dropdownRef}
      className="fixed z-[9999] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto transition-colors duration-200 drop-shadow-xl"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => !option.disabled && handleSelect(option.value)}
          disabled={option.disabled}
          className={`
            w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 focus:bg-gray-50 dark:focus:bg-gray-600 focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
            ${value === option.value ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 font-medium' : 'text-gray-900 dark:text-white'}
            ${option.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center justify-between">
            <span>{option.label}</span>
            {value === option.value && (
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <div className={`relative ${className}`} ref={selectRef}>
        {/* Trigger */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`
            w-full px-3 py-2 text-left bg-white dark:bg-gray-700 border rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200
            flex items-center justify-between
            ${isOpen ? 'border-emerald-500 ring-2 ring-emerald-500' : 'border-gray-300 dark:border-gray-600'}
          `}
        >
          <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-300'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 dark:text-gray-300 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown rendered via portal */}
      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </>
  );
}

// Compound components for better API
export const SelectTrigger = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`relative ${className}`}>{children}</div>
);

export const SelectContent = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
    {children}
  </div>
);

export const SelectItem = ({ 
  value, 
  children, 
  onSelect, 
  isSelected = false,
  disabled = false 
}: { 
  value: string; 
  children: React.ReactNode; 
  onSelect: (value: string) => void;
  isSelected?: boolean;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={() => !disabled && onSelect(value)}
    disabled={disabled}
    className={`
      w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-colors duration-150
      ${isSelected ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-gray-900'}
      ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <div className="flex items-center justify-between">
      <span>{children}</span>
      {isSelected && (
        <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  </button>
);
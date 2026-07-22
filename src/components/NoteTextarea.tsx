import React, { useState, useEffect } from 'react';

interface NoteTextareaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  id?: string;
}

export function NoteTextarea({ value, onChange, placeholder, className, readOnly, id }: NoteTextareaProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync local value when the prop value changes (e.g., loaded from file or synchronized from Firestore)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  // Debounced update to the global store
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  // Ensure final update on blur
  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  return (
    <textarea
      id={id}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      readOnly={readOnly}
      placeholder={placeholder}
      className={className}
      spellCheck="false"
    />
  );
}

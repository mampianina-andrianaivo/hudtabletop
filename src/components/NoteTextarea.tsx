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
  const onChangeRef = React.useRef(onChange);

  // Keep ref up to date with the latest onChange callback
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync local value when the prop value changes (e.g., loaded from file or synchronized from Firestore)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  // Debounced update to the global store using the ref to prevent timer cancellation on render
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChangeRef.current(localValue);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localValue, value]);

  // Ensure final update on blur
  const handleBlur = () => {
    if (localValue !== value) {
      onChangeRef.current(localValue);
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

import React, { useState, useEffect, useRef } from 'react';

interface NoteTextareaProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  id?: string;
}

export const NoteTextarea = React.memo(function NoteTextarea({ value, onChange, placeholder, className, readOnly, id }: NoteTextareaProps) {
  const [localValue, setLocalValue] = useState(value);
  const isFocusedRef = useRef(false);
  const onChangeRef = useRef(onChange);

  // Keep ref up to date with the latest onChange callback
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync local value when the prop value changes externally, but ONLY if not focused
  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  // Ensure final update and sync on blur
  const handleBlur = () => {
    isFocusedRef.current = false;
    if (localValue !== value) {
      onChangeRef.current(localValue);
    }
  };

  // Debounced update to the global store using the ref
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChangeRef.current(localValue);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localValue, value]);

  return (
    <textarea
      id={id}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      readOnly={readOnly}
      placeholder={placeholder}
      className={className}
      spellCheck="false"
    />
  );
});


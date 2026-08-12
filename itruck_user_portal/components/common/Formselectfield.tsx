import { SearchableSelect } from "./SearchableSelect";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormSelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: boolean;
}

/**
 * Standard dropdown / select input with search support.
 *
 * Usage:
 *   <FormSelectField
 *     label="Material"
 *     value={materialId}
 *     onChange={setMaterialId}
 *     options={materials.map(m => ({ value: m.id, label: m.materials_type }))}
 *   />
 */
export default function FormSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = `— Select ${label} —`,
  required = false,
  fullWidth = true,
  disabled = false,
  helperText,
  error = false,
}: FormSelectFieldProps) {
  return (
    <SearchableSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      required={required}
      fullWidth={fullWidth}
      disabled={disabled}
      helperText={helperText}
      error={error}
    />
  );
}
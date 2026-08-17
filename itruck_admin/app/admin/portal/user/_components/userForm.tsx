"use client";

import { UserForm as NewUserForm } from "./userForm/userForm";
import type { UserFormProps } from "./userForm/userForm";

export type { UserFormProps };

/**
 * Compatibility wrapper:
 * older imports use default export from `components/userForm.tsx`.
 * We now delegate to the load-style `_components/userForm/userForm.tsx`.
 */
export default function UserForm(props: UserFormProps) {
  return <NewUserForm {...props} />;
}

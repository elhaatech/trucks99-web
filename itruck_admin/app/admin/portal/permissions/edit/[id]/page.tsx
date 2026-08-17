"use client";

import { use } from "react";
import { PermissionForm } from "../../_components/PermissionForm";

export default function EditPermissionPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  return <PermissionForm mode="edit" editId={unwrappedParams.id} />;
}

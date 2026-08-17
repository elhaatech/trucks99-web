"use client";

import dynamic from "next/dynamic";

const RoleForm = dynamic(() => import("../_components/roleForm/roleForm"), { ssr: false });

export default function RoleCreatePage() {
  return <RoleForm />;
}

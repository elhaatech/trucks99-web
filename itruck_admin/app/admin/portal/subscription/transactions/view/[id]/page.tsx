"use client";

import { use } from "react";
import { TransactionViewPage } from "../../components/transactionviewpage";

interface Props {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: Props) {
  const { id } = use(params);
  return <TransactionViewPage id={id} />;
}
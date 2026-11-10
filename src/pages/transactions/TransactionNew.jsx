import React from "react";
import PageHeader from "../../components/ui/PageHeader";
import TransactionForm from "../../components/transactions/TransactionForm";

export default function TransactionNew() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Add Transaction" subtitle="The form adapts to the transaction type you choose." />
      <TransactionForm />
    </div>
  );
}

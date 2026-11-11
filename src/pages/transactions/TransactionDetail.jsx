import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

import { transactionsApi } from "../../api/transactions";
import { transactionTypesApi } from "../../api/transactionTypes";
import { categoriesApi } from "../../api/categories";
import { accountsApi } from "../../api/accounts";
import { paymentMethodsApi } from "../../api/paymentMethods";
import { prioritiesApi } from "../../api/priorities";
import { contactsApi } from "../../api/contacts";
import { apiErrorMessage } from "../../api/client";

import PageHeader from "../../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import DeleteGuardDialog from "../../components/ui/DeleteGuardDialog";
import { useDeleteGuard } from "../../hooks/useDeleteGuard";
import Modal from "../../components/ui/Modal";
import { Input, TextArea } from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import { formatCurrency, formatDate, formatTime, formatDateTime, txnDisplayAmount } from "../../lib/formatters";

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-sm text-ink font-medium">{value ?? "—"}</p>
    </div>
  );
}

export default function TransactionDetail() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refData, setRefData] = useState({ types: [], categories: [], accounts: [], paymentMethods: [], priorities: [], contacts: [] });

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [t, types, categories, accounts, paymentMethods, priorities, contacts] = await Promise.all([
        transactionsApi.get(code),
        transactionTypesApi.list(),
        categoriesApi.list(),
        accountsApi.list({ include_system: true }),
        paymentMethodsApi.list(),
        prioritiesApi.list(),
        contactsApi.list(),
      ]);
      setTxn(t);
      setRefData({ types, categories, accounts, paymentMethods, priorities, contacts });
    } catch (err) {
      toast.error(apiErrorMessage(err));
      navigate("/transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const deleteGuard = useDeleteGuard(
    (c) => transactionsApi.remove(c), // no cascade/confirm step for transactions — only blocked or allowed
    () => navigate("/transactions")
  );

  if (loading || !txn) return <Spinner />;

  const nameOf = (list, slug) => list.find((x) => x.slug === slug)?.name || "—";

  const openEdit = () => {
    setEditForm({
      description: txn.description,
      reference_no: txn.reference_no || "",
      remarks: txn.remarks || "",
      priority_slug: txn.priority_slug,
      payment_method_slug: txn.payment_method_slug,
    });
    setEditOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await transactionsApi.update(txn.transaction_code, editForm);
      setTxn(updated);
      toast.success("Transaction updated.");
      setEditOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={txn.transaction_code}
        subtitle={`Recorded ${formatDateTime(txn.created_at)}`}
        actions={
          <div className="sfms-actions">
            <Button variant="secondary" onClick={openEdit}>
              Edit
            </Button>
            <Button variant="danger" onClick={() => deleteGuard.request(txn.transaction_code, `transaction ${txn.transaction_code}`)}>
              Delete
            </Button>
          </div>
        }
      />

      <div className="space-y-5 mt-6">
        <Card>
          <CardHeader
            title="Overview"
            action={
              <span className={`text-xl font-semibold ${txnDisplayAmount(txn) >= 0 ? "text-emerald" : "text-danger"}`}>
                {formatCurrency(txnDisplayAmount(txn))}
              </span>
            }
          />
          <CardBody className="grid sm:grid-cols-3 gap-5">
            <Field label="Date" value={formatDate(txn.txn_date)} />
            <Field label="Time" value={formatTime(txn.txn_time)} />
            <Field label="Type" value={<Badge tone="neutral">{nameOf(refData.types, txn.transaction_type_slug)}</Badge>} />
            <Field label="Category" value={nameOf(refData.categories, txn.category_slug)} />
            {txn.goal_slug && <Field label="Goal" value={<Link to="/goals" className="text-primary hover:underline">View linked goal ({txn.allocation_action === "release" ? "Released" : "Allocated"})</Link>} />}
            <Field label="Amount" value={formatCurrency(txn.amount)} />
            <Field label="Charges" value={formatCurrency(txn.charges)} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Accounts & Payment" />
          <CardBody className="grid sm:grid-cols-2 gap-5">
            <Field label="From Account" value={nameOf(refData.accounts, txn.from_account_slug)} />
            <Field label="To Account" value={nameOf(refData.accounts, txn.to_account_slug)} />
            {txn.charges > 0 && <Field label="Charges Borne By" value={txn.charges_borne_by === "to_account" ? "To Account" : "From Account"} />}
            <Field label="Payment Method" value={nameOf(refData.paymentMethods, txn.payment_method_slug)} />
            <Field label="Priority" value={<Badge tone="gold">{nameOf(refData.priorities, txn.priority_slug)}</Badge>} />
            {txn.contact_slug && <Field label="Contact" value={nameOf(refData.contacts, txn.contact_slug)} />}
            {txn.loan_code && (
              <Field
                label="Related Loan"
                value={
                  <Link to="/loans" className="text-primary hover:underline">
                    {txn.loan_code} →
                  </Link>
                }
              />
            )}
            {txn.credit_purchase_slug && (
              <Field
                label="Related Credit Purchase"
                value={
                  <Link to="/credit-purchases" className="text-primary hover:underline">
                    View credit purchases →
                  </Link>
                }
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="grid sm:grid-cols-2 gap-5">
            <Field label="Description" value={txn.description} />
            <Field label="Reference Number" value={txn.reference_no} />
            <div className="sm:col-span-2">
              <Field label="Remarks" value={txn.remarks} />
            </div>
          </CardBody>
        </Card>

        <p className="text-xs text-muted px-1">
          Amount, accounts, category, and transaction type can't be edited once saved. To change
          those, delete this transaction and record a new one.
        </p>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Transaction"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="luxury" onClick={handleEditSave} loading={saving}>
              Save Changes
            </Button>
          </>
        }
      >
        {editForm && (
          <form onSubmit={handleEditSave} className="space-y-4">
            <Input label="Description" required value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            <Select label="Priority" value={editForm.priority_slug} onChange={(e) => setEditForm({ ...editForm, priority_slug: e.target.value })}>
              {refData.priorities.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select label="Payment Method" value={editForm.payment_method_slug} onChange={(e) => setEditForm({ ...editForm, payment_method_slug: e.target.value })}>
              {refData.paymentMethods.map((pm) => (
                <option key={pm.slug} value={pm.slug}>
                  {pm.name}
                </option>
              ))}
            </Select>
            <Input label="Reference Number" value={editForm.reference_no} onChange={(e) => setEditForm({ ...editForm, reference_no: e.target.value })} />
            <TextArea label="Remarks" rows={3} value={editForm.remarks} onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })} />
          </form>
        )}
      </Modal>

      <DeleteGuardDialog guard={deleteGuard} itemNoun={`transaction ${txn.transaction_code}`} />
    </div>
  );
}

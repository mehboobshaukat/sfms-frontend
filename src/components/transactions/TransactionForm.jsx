import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { transactionTypesApi } from "../../api/transactionTypes";
import { categoriesApi } from "../../api/categories";
import { groupsApi } from "../../api/groups";
import { contactsApi } from "../../api/contacts";
import { accountsApi } from "../../api/accounts";
import { paymentMethodsApi } from "../../api/paymentMethods";
import { prioritiesApi } from "../../api/priorities";
import { loansApi } from "../../api/loans";
import { creditPurchasesApi } from "../../api/creditPurchases";
import { transactionsApi } from "../../api/transactions";
import { apiErrorMessage } from "../../api/client";

import { Input, TextArea } from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { Card, CardBody, CardHeader } from "../ui/Card";
import Spinner from "../ui/Spinner";
import Badge from "../ui/Badge";
import { formatCurrency, todayISODate, nowHHMM } from "../../lib/formatters";
import { NEW_LOAN_TYPES, SETTLEMENT_LOAN_TYPES, CREDIT_PURCHASE_SETTLEMENT_TYPES, CHARGES_BORNE_BY_OPTIONS } from "../../lib/constants";

const norm = (s) => (s || "").trim().toLowerCase();
const CREDIT_TYPE_FOR_SETTLEMENT = { "item payment made": "received", "item payment received": "given" };

export default function TransactionForm() {
  const navigate = useNavigate();

  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loans, setLoans] = useState([]);
  const [creditPurchases, setCreditPurchases] = useState([]);
  const [loadingRefData, setLoadingRefData] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    txn_date: todayISODate(),
    txn_time: nowHHMM(),
    transaction_type_slug: "",
    category_slug: "",
    group_filter: "",
    description: "",
    from_account_slug: "",
    to_account_slug: "",
    payment_method_slug: "",
    contact_slug: "",
    priority_slug: "",
    amount: "",
    charges: "0",
    charges_borne_by: "from_account",
    reference_no: "",
    remarks: "",
    loan_code: "",
    due_date: "",
    credit_purchase_slug: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const [t, a, p] = await Promise.all([
          transactionTypesApi.list({ active_only: true }),
          accountsApi.list({ active_only: true }),
          prioritiesApi.list({ active_only: true }),
        ]);
        setTypes(t);
        setAccounts(a);
        setPriorities(p);
      } catch (err) {
        toast.error(apiErrorMessage(err));
      } finally {
        setLoadingRefData(false);
      }
    })();
  }, []);

  const selectedType = types.find((t) => t.slug === form.transaction_type_slug);
  const typeName = norm(selectedType?.name);
  const nature = selectedType?.nature; // "inflow" | "outflow" | "transfer" — drives account requirement directly, no hardcoded name lists
  const isLoanType = NEW_LOAN_TYPES.includes(typeName) || SETTLEMENT_LOAN_TYPES.includes(typeName);
  const isNewLoanType = NEW_LOAN_TYPES.includes(typeName);
  const isSettlementLoanType = SETTLEMENT_LOAN_TYPES.includes(typeName);
  const isCreditSettlement = CREDIT_PURCHASE_SETTLEMENT_TYPES.includes(typeName);

  const controllingAccountSlug = nature === "inflow" ? form.to_account_slug : form.from_account_slug;
  const showChargesBorneBy = nature === "transfer" && Number(form.charges) > 0;

  // ---- Cascading loads ----
  useEffect(() => {
    let cancelled = false;
    setForm((f) => ({ ...f, category_slug: "", group_filter: "" }));
    setCategories([]);
    if (!form.transaction_type_slug) {
      setLoadingCategories(false);
      return () => { cancelled = true; };
    }

    setLoadingCategories(true);
    categoriesApi
      .list({ transaction_type_slug: form.transaction_type_slug, active_only: true })
      .then((items) => {
        if (!cancelled) setCategories(items);
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.transaction_type_slug]);

  useEffect(() => {
    setForm((f) => ({ ...f, group_filter: "" }));
    setGroups([]);
    if (!form.category_slug) return;
    groupsApi.list({ category_slug: form.category_slug, active_only: true }).then(setGroups).catch((err) => toast.error(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_slug]);

  useEffect(() => {
    let cancelled = false;
    if (!form.category_slug) {
      setContacts([]);
      setLoadingContacts(false);
      return () => { cancelled = true; };
    }
    // Group is OPTIONAL: category alone auto-loads contacts from every
    // linked group (union); adding group_filter just narrows the list.
    const params = { category_slug: form.category_slug, active_only: true };
    if (form.group_filter) params.group_slug = form.group_filter;
    setLoadingContacts(true);
    contactsApi
      .list(params)
      .then((items) => {
        if (!cancelled) setContacts(items);
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingContacts(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_slug, form.group_filter]);

  useEffect(() => {
    let cancelled = false;
    setForm((f) => ({ ...f, payment_method_slug: "" }));
    setPaymentMethods([]);
    if (!controllingAccountSlug) {
      setLoadingPaymentMethods(false);
      return () => { cancelled = true; };
    }

    setLoadingPaymentMethods(true);
    paymentMethodsApi
      .list({ account_slug: controllingAccountSlug, active_only: true })
      .then((items) => {
        if (cancelled) return;
        setPaymentMethods(items);
        // A new Cash account receives one default Cash payment method. If an
        // account has exactly one active method, selecting it automatically is
        // predictable and removes an unnecessary first-transaction step.
        if (items.length === 1) {
          setForm((f) => ({ ...f, payment_method_slug: items[0].slug }));
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingPaymentMethods(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controllingAccountSlug]);

  useEffect(() => {
    setForm((f) => ({ ...f, loan_code: "" }));
    setLoans([]);
    if (!isSettlementLoanType) return;
    const loanType = typeName === "loan repaid" ? "received" : "given";
    loansApi.active(loanType).then(setLoans).catch((err) => toast.error(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeName, isSettlementLoanType]);

  useEffect(() => {
    setForm((f) => ({ ...f, credit_purchase_slug: "" }));
    setCreditPurchases([]);
    if (!isCreditSettlement) return;
    creditPurchasesApi.list({ credit_type: CREDIT_TYPE_FOR_SETTLEMENT[typeName], is_completed: false }).then(setCreditPurchases).catch((err) => toast.error(apiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeName, isCreditSettlement]);

  const visibleLoans = useMemo(() => {
    if (!form.contact_slug) return loans;
    return loans.filter((l) => l.contact_slug === form.contact_slug);
  }, [loans, form.contact_slug]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleTypeChange = (e) => {
    const nextSlug = e.target.value;
    const nextType = types.find((t) => t.slug === nextSlug);
    const defaultAccount = accounts.find((a) => a.is_default && !a.is_system) || accounts.find((a) => norm(a.name) === "cash");

    setForm((f) => ({
      ...f,
      transaction_type_slug: nextSlug,
      from_account_slug: nextType?.nature === "outflow" && defaultAccount ? defaultAccount.slug : "",
      to_account_slug: nextType?.nature === "inflow" && defaultAccount ? defaultAccount.slug : "",
      payment_method_slug: "",
      contact_slug: "",
      loan_code: "",
      due_date: "",
      credit_purchase_slug: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isLoanType && !form.contact_slug) {
      setError("Contact is required for loan transactions.");
      return;
    }
    if (isSettlementLoanType && !form.loan_code) {
      setError("Please select the loan this transaction settles.");
      return;
    }
    if (isCreditSettlement && !form.credit_purchase_slug) {
      setError("Please select the credit purchase this payment settles.");
      return;
    }
    if (nature === "inflow" && !form.to_account_slug) {
      setError("Please select the account receiving the funds.");
      return;
    }
    if (nature === "outflow" && !form.from_account_slug) {
      setError("Please select the account the funds are coming from.");
      return;
    }
    if (nature === "transfer" && (!form.from_account_slug || !form.to_account_slug)) {
      setError("Please select both the From and To accounts.");
      return;
    }
    if (!form.payment_method_slug) {
      setError("Please select a payment method.");
      return;
    }

    const payload = {
      txn_date: form.txn_date,
      txn_time: form.txn_time + ":00",
      transaction_type_slug: form.transaction_type_slug,
      category_slug: form.category_slug,
      description: form.description,
      payment_method_slug: form.payment_method_slug,
      contact_slug: form.contact_slug || null,
      priority_slug: form.priority_slug,
      amount: Number(form.amount),
      charges: Number(form.charges || 0),
      charges_borne_by: form.charges_borne_by,
      reference_no: form.reference_no || null,
      remarks: form.remarks || null,
      from_account_slug: form.from_account_slug || null,
      to_account_slug: form.to_account_slug || null,
      loan_code: isSettlementLoanType ? form.loan_code : null,
      due_date: isNewLoanType && form.due_date ? form.due_date : null,
      credit_purchase_slug: isCreditSettlement ? form.credit_purchase_slug : null,
    };

    setSubmitting(true);
    try {
      const created = await transactionsApi.create(payload);
      toast.success(`Transaction ${created.transaction_code} created.`);
      navigate(`/transactions/${created.transaction_code}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not save this transaction."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRefData) return <Spinner />;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3" role="alert">
          {error}
        </div>
      )}

      <Card>
        <CardHeader title="What kind of transaction is this?" />
        <CardBody className="space-y-4">
          <Select label="Transaction Type" required value={form.transaction_type_slug} onChange={handleTypeChange}>
            <option value="">Select a type…</option>
            {types.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.nature})
              </option>
            ))}
          </Select>

          {form.transaction_type_slug && (
            <Select
              label="Category"
              required
              value={form.category_slug}
              onChange={set("category_slug")}
              disabled={loadingCategories}
              hint={loadingCategories ? "Loading the categories linked to this transaction type…" : undefined}
            >
              <option value="">
                {loadingCategories ? "Loading categories…" : categories.length ? "Select a category…" : "No categories linked to this type yet"}
              </option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </CardBody>
      </Card>

      {form.category_slug && (
        <Card>
          <CardHeader
            title="Who is this related to?"
            subtitle={isLoanType ? "Contact is required for loan transactions." : "Optional — narrow the contact list by group if you like."}
          />
          <CardBody className="space-y-4">
            {groups.length > 0 && (
              <Select label="Group (optional filter)" value={form.group_filter} onChange={set("group_filter")}>
                <option value="">All groups linked to this category</option>
                {groups.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </Select>
            )}
            <Select
              label={`Contact${isLoanType ? " (required)" : " (optional)"}`}
              required={isLoanType}
              value={form.contact_slug}
              onChange={set("contact_slug")}
              disabled={loadingContacts}
              hint={
                isLoanType
                  ? "Loans require a real counterparty so balances and repayments stay traceable."
                  : "Optional for normal transactions."
              }
            >
              <option value="">
                {loadingContacts ? "Loading contacts…" : contacts.length ? "Select a contact…" : "No contacts available"}
              </option>
              {contacts.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
            {isLoanType && !loadingContacts && contacts.length === 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => navigate("/settings/contacts")}>
                Add a contact
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {isSettlementLoanType && (
        <Card>
          <CardHeader
            title={typeName === "loan repaid" ? "Which loan are you repaying?" : "Which loan are you collecting?"}
            subtitle="Only active (incomplete) loans of the matching type are shown."
          />
          <CardBody>
            <Select label="Loan" required value={form.loan_code} onChange={set("loan_code")}>
              <option value="">{visibleLoans.length ? "Select a loan…" : "No active matching loans found"}</option>
              {visibleLoans.map((l) => (
                <option key={l.loan_code} value={l.loan_code}>
                  {l.loan_code} — remaining {formatCurrency(l.remaining_amount)}
                  {l.due_date ? ` (due ${l.due_date})` : ""}
                </option>
              ))}
            </Select>
          </CardBody>
        </Card>
      )}

      {isCreditSettlement && (
        <Card>
          <CardHeader
            title={typeName === "item payment made" ? "Which credit purchase are you paying off?" : "Which credit purchase are you collecting on?"}
            subtitle="Only outstanding (not fully settled) credit purchases of the matching type are shown."
          />
          <CardBody>
            <Select label="Credit Purchase" required value={form.credit_purchase_slug} onChange={set("credit_purchase_slug")}>
              <option value="">{creditPurchases.length ? "Select…" : "No outstanding credit purchases found"}</option>
              {creditPurchases.map((cp) => (
                <option key={cp.slug} value={cp.slug}>
                  {cp.item_description} — remaining {formatCurrency(cp.remaining_amount)}
                </option>
              ))}
            </Select>
          </CardBody>
        </Card>
      )}

      {form.transaction_type_slug && (
        <Card>
          <CardHeader
            title="Where does the money move?"
            subtitle={
              nature === "inflow"
                ? "The source is resolved automatically by the system — just pick the receiving account."
                : nature === "outflow"
                ? "The destination is resolved automatically by the system — just pick the source account."
                : "Select both accounts for this transfer."
            }
          />
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {(nature === "outflow" || nature === "transfer") && (
                <Select label="From Account" required value={form.from_account_slug} onChange={set("from_account_slug")}>
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name} ({formatCurrency(a.current_balance)})
                    </option>
                  ))}
                </Select>
              )}
              {(nature === "inflow" || nature === "transfer") && (
                <Select label="To Account" required value={form.to_account_slug} onChange={set("to_account_slug")}>
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.slug} value={a.slug}>
                      {a.name} ({formatCurrency(a.current_balance)})
                    </option>
                  ))}
                </Select>
              )}
            </div>
            {showChargesBorneBy && (
              <Select
                label="Charges deducted from"
                hint="From account: sender pays the fee on top. To account: fee is skimmed off what arrives (e.g. an agent withdrawal)."
                value={form.charges_borne_by}
                onChange={set("charges_borne_by")}
              >
                {CHARGES_BORNE_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </CardBody>
        </Card>
      )}

      {controllingAccountSlug && (
        <Card>
          <CardBody className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              required
              value={form.payment_method_slug}
              onChange={set("payment_method_slug")}
              disabled={loadingPaymentMethods}
              hint={loadingPaymentMethods ? "Loading payment methods for the selected account…" : undefined}
            >
              <option value="">
                {loadingPaymentMethods ? "Loading payment methods…" : paymentMethods.length ? "Select…" : "No payment methods for this account"}
              </option>
              {paymentMethods.map((pm) => (
                <option key={pm.slug} value={pm.slug}>
                  {pm.name}
                </option>
              ))}
            </Select>
            <Select label="Priority" required value={form.priority_slug} onChange={set("priority_slug")}>
              <option value="">Select…</option>
              {priorities.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </Select>
          </CardBody>
        </Card>
      )}

      {form.transaction_type_slug && (
        <Card>
          <CardHeader title="Amount & details" />
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Date" type="date" required value={form.txn_date} onChange={set("txn_date")} />
              <Input label="Time" type="time" required value={form.txn_time} onChange={set("txn_time")} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Amount" type="number" min="0.01" step="0.01" required value={form.amount} onChange={set("amount")} />
              <Input label="Charges (optional)" type="number" min="0" step="0.01" value={form.charges} onChange={set("charges")} />
            </div>
            <Input label="Description" required value={form.description} onChange={set("description")} />
            {isNewLoanType && (
              <Input label="Due Date (optional)" type="date" value={form.due_date} onChange={set("due_date")} hint="When you expect this loan to be settled." />
            )}
            <Input label="Reference Number (optional)" value={form.reference_no} onChange={set("reference_no")} />
            <TextArea label="Remarks (optional)" rows={3} value={form.remarks} onChange={set("remarks")} />
          </CardBody>
        </Card>
      )}

      {isLoanType && (
        <Badge tone="gold">{isNewLoanType ? "This opens a new loan automatically." : "This settles the loan you selected above."}</Badge>
      )}
      {isCreditSettlement && <Badge tone="gold">This settles the credit purchase you selected above.</Badge>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" variant="luxury" loading={submitting} disabled={!form.transaction_type_slug}>
          Save Transaction
        </Button>
      </div>
    </form>
  );
}

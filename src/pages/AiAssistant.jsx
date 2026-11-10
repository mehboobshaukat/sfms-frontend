import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import StatTile from '../components/ui/StatTile';
import GridBackdrop from '../components/ui/GridBackdrop';
import { aiBulkApi } from '../api/aiBulk';
import { transactionDraftsApi } from '../api/transactionDrafts';
import { apiErrorMessage } from '../api/client';
import './AiAssistant.css';

/* Scope: SFMS AI Assistant UI only. No transaction posting endpoints or payloads changed. */
const EMPTY = { types: [], categories: [], accounts: [], contacts: [], payment_methods: [], priorities: [] };
const SESSION_KEY = 'sfms_ai_session';
const showName = (list, slug) => list.find(item => item.slug === slug)?.name || '—';
const str = (value) => value == null ? '' : String(value);
const pad = value => String(value).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const remember = slug => { try { slug ? sessionStorage.setItem(SESSION_KEY, slug) : sessionStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ } };
const recall = () => { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } };
const EXAMPLES = [
  { label: 'Several transactions', text: 'On 12 October 2026 I received PKR 45,000 salary, and spent PKR 1,200 on groceries. Both through Cash. Salary priority Necessary, groceries Wish.' },
  { label: 'Urdu and English', text: '15 اکتوبر 2026 کو کھانے پر 2500 روپے خرچ کیے۔ Category Food, Priority Necessary. پھر علی سے 5000 روپے قرض لیے۔' },
  { label: 'Chinese income', text: '2026年10月9日，收到工资45000巴基斯坦卢比。 Type Income, Category Salary, Priority Necessary.' },
];
const STEPS = ['Describe', 'Clarify', 'Review drafts', 'Approve'];
const FIELD_LABEL = { txn_date:'Date', account_slug:'Account', payment_method_slug:'Payment', priority_slug:'Priority', transaction_type_slug:'Type', category_slug:'Category' };
const DIRECTION_LABEL = { outflow:'Expense', inflow:'Inflow', transfer:'Transfer' };
const OPTION_SUGGESTION = { ai:'AI suggestion', derived:'Derived from notes', default:'Default suggestion' };

/* Same control styling as the toolbars on Accounts / History. */
const FIELD = 'h-11 rounded-xl border border-cardBorder bg-input px-3 text-sm font-semibold text-ink outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15';
const PILL_ON = 'border-transparent bg-gradient-to-br from-[#1b7bff] to-[#0a47d6] text-white shadow-luxury';
const PILL_OFF = 'border-cardBorder bg-card text-nav hover:border-primary-border hover:text-primary';

function draftIsComplete(fields, options) {
  const f = fields || {};
  const t = options.types.find(x => x.slug === f.transaction_type_slug);
  const nature = t?.nature;
  const from = f.from_account_slug, to = f.to_account_slug;
  const account = nature === 'inflow' ? to : from;
  const loanName = (t?.name || '').trim().toLowerCase();
  const isLoan = ['loan received','loan given','loan repaid','loan collected'].includes(loanName);
  const isSettlement = ['loan repaid','loan collected'].includes(loanName);
  const isCreditSettlement = ['item payment made','item payment received'].includes(loanName);
  return !!(f.description?.trim() && Number.isFinite(Number(f.amount)) && Number(f.amount) > 0 &&
    f.txn_date && f.txn_time && t && f.category_slug && f.payment_method_slug && f.priority_slug &&
    options.categories.some(c => c.slug === f.category_slug && c.type_slugs.includes(f.transaction_type_slug)) &&
    (nature === 'inflow' ? !!to : nature === 'outflow' ? !!from : nature === 'transfer' ? !!(from && to && from !== to) : false) &&
    options.payment_methods.some(m => m.slug === f.payment_method_slug && m.account_slug === account) &&
    (!isLoan || f.contact_slug) && (!isSettlement || f.loan_code) && (!isCreditSettlement || f.credit_purchase_slug));
}

const KIND_VARIANT = { light: 'secondary', danger: 'danger', dangerGhost: 'dangerGhost', primary: 'luxury' };
function SmallButton({ children, onClick, disabled, kind = 'light', title }) {
  return <Button size="sm" variant={KIND_VARIANT[kind] || 'secondary'} title={title} onClick={onClick} disabled={disabled}>{children}</Button>;
}
function BotAvatar({ size = 'md' }) { return <span className={`ai-bot-avatar ai-bot-avatar--${size}`} aria-hidden="true"><Icon name="spark" size={size === 'sm' ? 16 : 22} strokeWidth={1.9} /></span>; }
function AgentBubble({ children }) { return <div className="ai-line"><BotAvatar size="sm" /><div className="ai-bubble">{children}</div></div>; }
function InlineSelect({ value, items, onChange, placeholder = 'Choose…', disabled = false, title }) {
  return <select aria-label={title || placeholder} title={title || placeholder} value={value || ''} disabled={disabled} onChange={e => onChange(e.target.value)}>
    <option value="">{placeholder}</option>{items.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}
  </select>;
}

function QuestionCard({ q, choice, onChange, disabled }) {
  const value = choice?.mode === 'set' ? choice.value : '';
  const setValue = value => onChange(value ? { mode: 'set', value } : undefined);
  const extra = Math.max(0, (q.affected_count || 0) - (q.items?.length || 0));
  const answered = choice?.mode === 'set';
  return <div className={`ai-question ${answered ? 'ai-question--answered' : ''}`} data-question={q.id}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <strong className="text-[13.5px] font-bold text-ink">{q.question}</strong>
      <Badge tone={answered ? 'emerald' : 'neutral'}>{answered ? 'Answered · ' : ''}{q.scope === 'batch' ? 'Whole batch' : q.scope === 'group' ? `${q.affected_count} entries` : '1 entry'}</Badge>
    </div>
    {q.hint && <p className="ai-caption mt-1">{q.hint}</p>}
    {!!q.items?.length && q.scope !== 'item' && <details className="ai-details mt-2"><summary>Applies to {q.affected_count || q.items.length} entries</summary><ul>{q.items.map(item => <li key={item.id}>{item.amount || '?'} · {item.text}</li>)}{extra > 0 && <li>+ {extra} more</li>}</ul></details>}
    {choice?.mode === 'skip' && <p className="ai-caption mt-2">Skipped. Fill this field during draft review.</p>}
    {choice?.mode === 'each' && <p className="ai-caption mt-2">You'll answer this separately for each entry.</p>}
    {(!choice || choice.mode === 'set') && <div className="ai-answer-input">
      {q.input === 'select' && <select aria-label={q.question} value={value} onChange={e => setValue(e.target.value)} disabled={disabled}><option value="">Select an answer</option>{q.choices?.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>}
      {q.input === 'date' && <><input aria-label={q.question} type="date" value={value} onChange={e => setValue(e.target.value)} disabled={disabled} /><SmallButton disabled={disabled} onClick={() => setValue(todayISO())}>Today</SmallButton></>}
      {q.input === 'time' && <input aria-label={q.question} type="time" value={value} onChange={e => setValue(e.target.value)} disabled={disabled} />}
      {q.input === 'number' && <input aria-label={q.question} type="number" step="0.01" min="0.01" value={value} onChange={e => setValue(e.target.value)} disabled={disabled} placeholder="Amount" />}
    </div>}
    {q.suggested && !choice && <p className="ai-caption mt-2">Suggested: {q.input === 'select' ? showName(q.choices || [], q.suggested) : q.suggested}. Choose it yourself to confirm.</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      {q.allow_each && choice?.mode !== 'each' && <SmallButton disabled={disabled} onClick={() => onChange({ mode: 'each' })}>Answer individually</SmallButton>}
      {q.allow_skip && choice?.mode !== 'skip' && <SmallButton disabled={disabled} onClick={() => onChange({ mode: 'skip' })}>Fill later</SmallButton>}
      {choice && <SmallButton disabled={disabled} onClick={() => onChange(undefined)}>Clear answer</SmallButton>}
    </div>
  </div>;
}

function PlanSummary({ plan, options }) {
  const chips = Object.entries(plan.field_summary || {}).map(([field, item]) => ({ field, ...item }));
  const detected = plan.detected || {};
  return <div className="flex flex-col gap-3">
    {plan.degraded && <div className="rounded-xl border border-gold/30 bg-gold-light px-3.5 py-2.5 text-xs text-ink" role="status"><strong>Basic extraction mode.</strong> The AI provider is unavailable, so check type and category yourself. {plan.degraded_reasons?.[0] || ''}</div>}
    <p className="m-0 text-[14px] text-ink"><strong>{plan.entry_count} {plan.entry_count === 1 ? 'entry' : 'entries'} found</strong> <span className="text-muted">· {plan.item_count} proposed draft{plan.item_count === 1 ? '' : 's'}. Nothing has been posted.</span></p>
    {!!chips.length && <div className="flex flex-wrap gap-1.5">{chips.map(chip => <span key={chip.field} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${chip.ready === chip.total ? 'bg-emerald-glow text-emerald' : 'bg-gold-light text-gold'}`}>{FIELD_LABEL[chip.field] || chip.field} {chip.ready}/{chip.total}</span>)}</div>}
    {Object.values(detected).some(Boolean) && <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {detected.global_date && <span>Date <strong className="text-ink">{detected.global_date}</strong></span>}
      {detected.global_account_slug && <span>Account <strong className="text-ink">{showName(options.accounts, detected.global_account_slug)}</strong></span>}
      {detected.global_payment_method_slug && <span>Payment <strong className="text-ink">{showName(options.payment_methods, detected.global_payment_method_slug)}</strong></span>}
      {detected.global_priority_slug && <span>Priority <strong className="text-ink">{showName(options.priorities, detected.global_priority_slug)}</strong></span>}
      {detected.global_time && <span>Time <strong className="text-ink">{detected.global_time}</strong></span>}
    </div>}
    <details className="ai-details"><summary>View extracted entries ({plan.items?.length || 0})</summary><div className="ai-entries">{(plan.items || []).map(item => <div key={item.id}><b>{item.amount || 'Amount ?'}</b><span>{item.description}</span>{item.direction && <em>{DIRECTION_LABEL[item.direction] || item.direction}</em>}</div>)}</div></details>
  </div>;
}

/* Editable row stays mounted between table refreshes. Saving a draft never posts a transaction. */
function DraftRow({ draft, options, onFinished, selected, onToggleSelect, onDirtyChange, bulkBusy }) {
  const [form, setForm] = useState(() => ({ ...draft.parsed_fields }));
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setForm({ ...draft.parsed_fields }); setDirty(false); setError(''); }, [draft.slug, draft.updated_at]);
  useEffect(() => { onDirtyChange(draft.slug, dirty); }, [draft.slug, dirty, onDirtyChange]);
  const pending = draft.ambiguous_fields?.pending || {};
  const sources = draft.ambiguous_fields?.field_sources || {};
  const notes = draft.ambiguous_fields?.warnings || [];
  const type = options.types.find(x => x.slug === form.transaction_type_slug);
  const nature = type?.nature;
  const isLoan = ['loan received','loan given','loan repaid','loan collected'].includes((type?.name || '').trim().toLowerCase());
  const isSettlement = ['loan repaid','loan collected'].includes((type?.name || '').trim().toLowerCase());
  const isCreditSettlement = ['item payment made','item payment received'].includes((type?.name || '').trim().toLowerCase());
  const categories = options.categories.filter(x => !form.transaction_type_slug || x.type_slugs.includes(form.transaction_type_slug));
  const accountSlug = nature === 'inflow' ? form.to_account_slug : form.from_account_slug;
  const methods = options.payment_methods.filter(x => !!accountSlug && x.account_slug === accountSlug);
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const resetType = v => {
    setForm(f => {
      const next = options.types.find(x => x.slug === v)?.nature;
      const acct = f.from_account_slug || f.to_account_slug || pending.account_slug || null;
      const keepAccount = !!acct && (next === 'inflow' || next === 'outflow');
      const method = keepAccount ? (f.payment_method_slug || pending.payment_method_slug || '') : '';
      const validMethod = method && options.payment_methods.some(m => m.slug === method && m.account_slug === acct);
      return { ...f, transaction_type_slug: v, category_slug: '', contact_slug: null,
        from_account_slug: keepAccount && next === 'outflow' ? acct : null,
        to_account_slug: keepAccount && next === 'inflow' ? acct : null,
        payment_method_slug: validMethod ? method : '' };
    });
    setDirty(true);
  };
  const updateAccount = (key, value) => { setForm(f => ({ ...f, [key]: value || null, payment_method_slug: '' })); setDirty(true); };
  const missing = !draftIsComplete(form, options);
  const cleaned = () => ({ ...form, amount: str(form.amount), charges: str(form.charges || '0'), contact_slug: form.contact_slug || null,
    from_account_slug: form.from_account_slug || null, to_account_slug: form.to_account_slug || null,
    loan_code: form.loan_code || null, credit_purchase_slug: form.credit_purchase_slug || null,
    txn_time: (form.txn_time || '12:00') + ((form.txn_time || '12:00').length === 5 ? ':00' : '') });
  const saveDraft = async () => {
    setBusy(true); setError('');
    try { await transactionDraftsApi.updateFields(draft.slug, cleaned()); setDirty(false); toast.success('Draft updated. No money moved.'); await onFinished(); }
    catch (e) { const m = apiErrorMessage(e); setError(m); toast.error(m); } finally { setBusy(false); }
  };
  const postDraft = async () => {
    if (missing) { setDetails(true); setError('Complete all required fields before posting.'); return; }
    if (!window.confirm(`POST this real transaction?\n\n${form.description}\nAmount: ${form.amount}\nAccount: ${showName(options.accounts, accountSlug)}\n\nThis will change your account balance and create history.`)) return;
    setBusy(true); setError('');
    try {
      await transactionDraftsApi.updateFields(draft.slug, cleaned());
      const result = await transactionDraftsApi.confirm(draft.slug);
      toast.success(`Transaction posted: ${result.transaction_code}`);
      await onFinished();
    } catch (e) { const m = apiErrorMessage(e); setError(m); toast.error(m); } finally { setBusy(false); }
  };
  const rejectDraft = async () => {
    if (!window.confirm('Reject this draft? No financial transaction will be created.')) return;
    setBusy(true); setError('');
    try { await transactionDraftsApi.reject(draft.slug); toast.success('Draft rejected'); await onFinished(); }
    catch (e) { const m = apiErrorMessage(e); setError(m); toast.error(m); } finally { setBusy(false); }
  };
  const sourceInfo = Object.entries(sources).filter(([, v]) => OPTION_SUGGESTION[v]).map(([k, v]) => `${FIELD_LABEL[k] || k}: ${OPTION_SUGGESTION[v]}`);
  const sourceLine = draft.ambiguous_fields?.source_line;
  const sourcePart = draft.ambiguous_fields?.source_part;
  const sourceLabel = sourceLine ? `Line ${sourceLine}${sourcePart ? ` · Item ${sourcePart}` : ''}` : 'Source not labeled';
  const lock = busy || bulkBusy;
  return <>
    <tr className={`ai-grid-row ${missing ? 'ai-grid-row--attention' : ''} ${selected ? 'ai-grid-row--selected' : ''}`}>
      <td className="ai-grid-select"><input type="checkbox" aria-label={`Select ${form.description || 'draft transaction'}`} checked={!!selected} onChange={onToggleSelect} disabled={lock} /></td>
      <td className="ai-grid-source"><span title={sourceLabel}>{sourceLine ? `L${sourceLine}` : '—'}{sourcePart ? <small>I{sourcePart}</small> : null}</span></td>
      <td><input aria-label="Description" value={form.description || ''} onChange={e => set('description', e.target.value)} maxLength={500} disabled={lock} title={form.description || ''} /></td>
      <td><input aria-label="Amount" className="ai-align-right" type="number" min="0.01" step="0.01" value={str(form.amount)} onChange={e => set('amount', e.target.value)} disabled={lock} placeholder="Required" /></td>
      <td><input aria-label="Transaction date" type="date" value={form.txn_date || ''} onChange={e => set('txn_date', e.target.value)} disabled={lock} /></td>
      <td><InlineSelect title="Transaction type" items={options.types} value={form.transaction_type_slug} onChange={resetType} disabled={lock} /></td>
      <td><InlineSelect title="Category" items={categories} value={form.category_slug} onChange={v => { setForm(f => ({ ...f, category_slug: v, contact_slug: null })); setDirty(true); }} disabled={lock} /></td>
      <td>{(nature === 'outflow' || nature === 'transfer') ? <InlineSelect title="From account" items={options.accounts} value={form.from_account_slug} onChange={v => updateAccount('from_account_slug', v)} disabled={lock} /> : <span className="ai-cell-empty">—</span>}</td>
      <td>{(nature === 'inflow' || nature === 'transfer') ? <InlineSelect title="To account" items={options.accounts} value={form.to_account_slug} onChange={v => updateAccount('to_account_slug', v)} disabled={lock} /> : <span className="ai-cell-empty">—</span>}</td>
      <td><InlineSelect title="Payment method" items={methods} value={form.payment_method_slug} onChange={v => set('payment_method_slug', v)} disabled={lock} /></td>
      <td><InlineSelect title="Contact" items={options.contacts} value={form.contact_slug} onChange={v => set('contact_slug', v || null)} disabled={lock} placeholder="Optional" /></td>
      <td><InlineSelect title="Priority" items={options.priorities} value={form.priority_slug} onChange={v => set('priority_slug', v)} disabled={lock} /></td>
      <td><div className="ai-cell-flags"><Badge tone={missing ? 'gold' : 'emerald'}>{missing ? 'Needs info' : 'Complete'}</Badge>{notes.length > 0 && <small>{notes.length} AI note{notes.length > 1 ? 's' : ''}</small>}{dirty && <small className="ai-unsaved">Unsaved edits</small>}</div></td>
      <td className="ai-grid-actions"><div>
        <SmallButton disabled={lock} onClick={() => setDetails(d => !d)}>{details ? 'Close' : 'Details'}</SmallButton>
        <SmallButton kind="dangerGhost" disabled={lock} title="Reject this draft without posting" onClick={rejectDraft}>Reject</SmallButton>
        <SmallButton kind="primary" disabled={lock || missing} title="Post to your transactions (asks for confirmation)" onClick={postDraft}>{busy ? 'Wait…' : 'Post'}</SmallButton>
      </div></td>
    </tr>
    {details && <tr className="ai-expanded-row"><td colSpan={14}>
      <div className="ai-expanded-content">
        <div>
          <strong className="text-[13px] text-ink">Your original note</strong>
          <p className="ai-source-text">{draft.raw_input}</p>
          <p className="ai-caption">Line {draft.ambiguous_fields?.source_line ?? '?'}{draft.ambiguous_fields?.source_part ? ` · Item ${draft.ambiguous_fields.source_part}` : ''}</p>
          {!!notes.length && <div className="mt-3 rounded-xl border border-gold/30 bg-gold-light px-3.5 py-2.5 text-xs text-ink"><strong>Check these notes</strong><ul className="m-0 mt-1 pl-4">{notes.map((note, i) => <li key={i}>{note}</li>)}</ul></div>}
          {!!sourceInfo.length && <div className="ai-source-tags">{sourceInfo.map((s, i) => <span key={i}>{s}</span>)}</div>}
        </div>
        <div className="ai-expanded-extra">
          <label>Time (24-hour)<input type="time" value={(form.txn_time || '12:00').slice(0, 5)} onChange={e => set('txn_time', e.target.value)} disabled={lock} /></label>
          <label>Charges<input type="number" min="0" step="0.01" value={str(form.charges)} onChange={e => set('charges', e.target.value)} disabled={lock} /></label>
          {(isSettlement || form.loan_code) && <label>Existing loan code<input value={form.loan_code || ''} onChange={e => set('loan_code', e.target.value)} disabled={lock} placeholder="Existing loan identifier" /></label>}
          {(isCreditSettlement || form.credit_purchase_slug) && <label>Credit purchase ID<input value={form.credit_purchase_slug || ''} onChange={e => set('credit_purchase_slug', e.target.value)} disabled={lock} placeholder="Existing purchase identifier" /></label>}
          <label>Reference number <span className="ai-optional">Optional</span><input maxLength={100} value={form.reference_no || ''} onChange={e => set('reference_no', e.target.value)} disabled={lock} placeholder="Receipt or bank reference" /></label>
          {(isLoan && !isSettlement) && <label>Loan due date <span className="ai-optional">Optional</span><input type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)} disabled={lock} /></label>}
          {nature === 'transfer' && <label>Charges paid by<select value={form.charges_borne_by || 'from_account'} onChange={e => set('charges_borne_by', e.target.value)} disabled={lock}><option value="from_account">From account</option><option value="to_account">To account</option></select></label>}
          <label className="ai-detail-full">Remarks <span className="ai-optional">Optional</span><textarea rows={2} maxLength={1000} value={form.remarks || ''} onChange={e => set('remarks', e.target.value)} disabled={lock} placeholder="Anything else you want on record" /></label>
        </div>
        <div className="ai-expanded-footer">
          <span className="ai-caption">Saving keeps your edits only. Posting needs a separate approval.</span>
          <div><SmallButton kind="dangerGhost" disabled={lock} onClick={rejectDraft}>Reject draft</SmallButton><SmallButton disabled={lock || !dirty} onClick={saveDraft}>Save draft</SmallButton><SmallButton kind="primary" disabled={lock || missing} onClick={postDraft}>Review and post</SmallButton></div>
        </div>
        {error && <p role="alert" className="ai-row-error">{error}</p>}
      </div>
    </td></tr>}
  </>;
}

export default function AiAssistant() {
  const [text, setText] = useState('');
  const [consent, setConsent] = useState(false);
  const [plan, setPlan] = useState(null);
  const [choices, setChoices] = useState({});
  const [userNote, setUserNote] = useState('');
  const [options, setOptions] = useState(EMPTY);
  const [pending, setPending] = useState({ items: [], total: 0, page: 1, page_size: 20 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const [dirtySlugs, setDirtySlugs] = useState([]);
  const conversationEnd = useRef(null);
  const composerRef = useRef(null);
  const load = useCallback(async () => {
    try { const [o, d] = await Promise.all([aiBulkApi.options(), aiBulkApi.drafts(page, pageSize)]); setOptions(o); setPending(d); if (page > 1 && !d.items.length) setPage(p => Math.max(1, p - 1)); }
    catch (e) { setError(apiErrorMessage(e)); } finally { setLoading(false); }
  }, [page, pageSize]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelectedSlugs(prev => prev.filter(slug => pending.items.some(item => item.slug === slug))); setDirtySlugs(prev => prev.filter(slug => pending.items.some(item => item.slug === slug))); }, [pending.items]);
  const markDraftDirty = useCallback((slug, isDirty) => setDirtySlugs(prev => { const had = prev.includes(slug); if (had === isDirty) return prev; return isDirty ? [...prev, slug] : prev.filter(x => x !== slug); }), []);
  /* Suggested financial answers are intentionally NOT pre-selected: user must choose. */
  const acceptView = view => { setPlan(view); setChoices({}); remember(view.session_slug); };
  useEffect(() => { const slug = recall(); if (!slug) return; aiBulkApi.session(slug).then(view => { if (view.status === 'awaiting_answers') { acceptView(view); setUserNote('Your previous unfinished import'); } else remember(null); }).catch(() => remember(null)); }, []);
  useEffect(() => { if (plan) conversationEnd.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); }, [plan?.session_slug, plan?.questions?.length]);
  useEffect(() => { const el = composerRef.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 280)}px`; } }, [text, plan]);
  const resetConversation = (cancelRemote = true) => { if (cancelRemote && plan?.session_slug) aiBulkApi.cancel(plan.session_slug).catch(() => {}); setPlan(null); setChoices({}); setUserNote(''); remember(null); };
  const analyze = async event => {
    event?.preventDefault?.();
    if (!consent || !text.trim() || busy || plan) return;
    setBusy(true); setError('');
    try { const view = await aiBulkApi.analyze(text); setUserNote(text); acceptView(view); }
    catch (e) { const m = apiErrorMessage(e); setError(m); toast.error(m); } finally { setBusy(false); }
  };
  const questions = plan?.questions || [];
  const required = questions.filter(q => q.required), optional = questions.filter(q => !q.required);
  const answered = questions.filter(q => choices[q.id]);
  const requiredAnswered = required.filter(q => choices[q.id]).length;
  const changeAnswer = (id, choice) => setChoices(p => { const n = { ...p }; if (choice) n[id] = choice; else delete n[id]; return n; });
  const serializeAnswers = () => answered.map(q => ({ field: q.field, item_ids: q.field === 'convention' ? [] : q.item_ids, value: choices[q.id].mode === 'set' ? choices[q.id].value : null, mode: choices[q.id].mode }));
  const sendAnswers = async () => {
    setBusy(true); setError('');
    try { acceptView(await aiBulkApi.answer(plan.session_slug, serializeAnswers())); }
    catch (e) { const m = apiErrorMessage(e); setError(m); toast.error(m); } finally { setBusy(false); }
  };
  const createDrafts = async () => {
    setBusy(true); setError('');
    try {
      if (answered.length) await aiBulkApi.answer(plan.session_slug, serializeAnswers());
      const result = await aiBulkApi.finalize(plan.session_slug);
      toast.success(`${result.count} drafts prepared; no transactions posted`);
      setText(''); setConsent(false); resetConversation(false); setPage(1); await load();
      document.getElementById('sfms-ai-review')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    } catch (e) { const m = apiErrorMessage(e); setError(m); toast.error(m); } finally { setBusy(false); }
  };
  const items = pending.items || [];
  const isReady = d => draftIsComplete(d.parsed_fields, options);
  const readyCount = items.filter(isReady).length;
  const viewRows = items.filter(d => {
    const q = search.trim().toLowerCase();
    const matchText = !q || [d.parsed_fields?.description, d.raw_input, d.parsed_fields?.amount].some(value => str(value).toLowerCase().includes(q));
    const eligible = isReady(d);
    return matchText && (filter === 'all' || (filter === 'ready' ? eligible : !eligible));
  });
  const selectedRows = viewRows.filter(d => selectedSlugs.includes(d.slug));
  const selectedReadyRows = selectedRows.filter(isReady);
  const selectedIncompleteCount = selectedRows.length - selectedReadyRows.length;
  const selectedUnsavedCount = selectedRows.filter(row => dirtySlugs.includes(row.slug)).length;
  const allVisibleSelected = !!viewRows.length && viewRows.every(d => selectedSlugs.includes(d.slug));
  const toggleDraftSelection = slug => setSelectedSlugs(prev => prev.includes(slug) ? prev.filter(x => x !== slug) : [...prev, slug]);
  const toggleSelectAllVisible = () => setSelectedSlugs(prev => allVisibleSelected ? prev.filter(slug => !viewRows.some(d => d.slug === slug)) : Array.from(new Set([...prev, ...viewRows.map(d => d.slug)])));
  const selectReadyVisible = () => setSelectedSlugs(prev => Array.from(new Set([...prev, ...viewRows.filter(isReady).map(d => d.slug)])));
  const clearSelection = () => setSelectedSlugs([]);
  const bulkReject = async () => {
    if (!selectedRows.length || busy) return;
    if (!window.confirm(`Reject ${selectedRows.length} selected draft(s)? None will create a transaction.`)) return;
    setBusy(true); setError('');
    try {
      const result = await transactionDraftsApi.rejectSelected(selectedRows.map(row => row.slug));
      toast.success(`${result.count} draft(s) rejected`);
      clearSelection(); await load();
    } catch (e) {
      const m = apiErrorMessage(e); setError(m); toast.error(m);
      // Safe to refresh: server bulk reject is all-or-nothing.
      await load();
    } finally { setBusy(false); }
  };
  const bulkPost = async () => {
    if (!selectedRows.length || busy) return;
    if (selectedIncompleteCount || selectedUnsavedCount) {
      toast.error(selectedUnsavedCount ? 'Save your inline edits first (Details → Save draft).' : 'Complete all selected drafts before posting.');
      return;
    }
    const preview = selectedReadyRows.slice(0, 5).map((row, i) =>
      `${i + 1}. ${row.parsed_fields?.description || row.slug} — ${row.parsed_fields?.amount || '?'}`
    ).join('\n');
    const more = selectedReadyRows.length > 5 ? `\n...and ${selectedReadyRows.length - 5} more` : '';
    if (!window.confirm(`POST ${selectedReadyRows.length} selected real transactions?\n\n${preview}${more}\n\nEvery transaction gets its own code and history. Either ALL will be posted or NONE.`)) return;
    setBusy(true); setError('');
    try {
      const result = await transactionDraftsApi.confirmSelected(selectedReadyRows.map(row => row.slug));
      toast.success(`${result.count} separate transaction(s) posted successfully`);
      clearSelection(); await load();
    } catch (e) {
      const m = apiErrorMessage(e); setError(m); toast.error(m);
      await load();
    } finally { setBusy(false); }
  };
  const nonEmptyLines = useMemo(() => text.split(/\r?\n/).filter(x => x.trim()).length, [text]);
  const fallback = options.ai_provider?.fallback_provider;
  const localOnly = !!options.ai_provider?.local_processing && !fallback;
  const currentStep = plan ? 1 : 0;
  const scrollToReview = () => document.getElementById('sfms-ai-review')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  const filterTabs = [['all', 'All', items.length], ['ready', 'Likely ready', readyCount], ['attention', 'Needs attention', items.length - readyCount]];

  return <div className="ai-copilot space-y-5" id="sfms-ai-assistant">
    <PageHeader
      title="AI Assistant"
      subtitle="Write your money notes in plain words. Every draft waits for your approval before anything is posted."
      actions={<Button variant="secondary" onClick={scrollToReview}>Go to drafts{pending.total ? ` (${pending.total})` : ''}</Button>}
    />

    {/* ---------- overview ---------- */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile icon="transactions" tone="bg-primary-soft text-primary" label="Pending drafts" amount={pending.total} integer note="Waiting for your review" ready={!loading} />
      <StatTile icon="check" tone="bg-emerald-glow text-emerald" label="Ready to post" amount={readyCount} integer note="On this page" ready={!loading} />
      <StatTile icon="info" tone="bg-gold-light text-gold" label="Need attention" amount={items.length - readyCount} integer note="On this page" ready={!loading} />
      <StatTile icon="analytics" tone="bg-[#e0f7fd] text-[#0e9bc0]" label="Selected" amount={selectedRows.length} integer note="For bulk actions" ready={!loading} />
    </div>

    {/* ---------- conversation ---------- */}
    <Card className="!p-0 overflow-hidden" aria-label="AI financial assistant conversation">
      <div className="ai-hero">
        <GridBackdrop tone={0.8} />
        <div className="ai-hero-in flex flex-wrap items-center justify-between gap-x-6 gap-y-4 p-5 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <BotAvatar />
            <div className="min-w-0">
              <h2 className="m-0 font-display text-[1.15rem] font-extrabold tracking-[-0.03em] text-white">Your financial assistant</h2>
              <p className="m-0 mt-0.5 text-[12.5px] text-[#b9cbee]">Write naturally. Nothing posts until you approve it.</p>
            </div>
          </div>
          <ol className="ai-steps" aria-label="Review process">
            {STEPS.map((label, i) => {
              const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'todo';
              return <li key={label} className={`ai-step ai-step--${state}`} aria-current={state === 'active' ? 'step' : undefined}><span>{state === 'done' ? <Icon name="check" size={12} /> : i + 1}</span>{label}</li>;
            })}
          </ol>
        </div>
      </div>

      <div className="ai-feed" aria-live="polite">
        <AgentBubble>
          <strong>Tell me what happened with your money.</strong>
          <p>Send one sentence or a long note in any language. I'll pick out each transaction, organize the details and ask only about what's missing.</p>
          <span className="ai-bubble-meta">You review every draft before it posts.</span>
        </AgentBubble>
        {!plan && !text.trim() && <div className="pl-[42px] max-md:pl-0">
          <p className="m-0 mb-2 text-xs font-semibold text-muted">Try an example</p>
          <div className="flex flex-wrap gap-2">{EXAMPLES.map(ex => <button key={ex.label} type="button" onClick={() => setText(ex.text)} className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${PILL_OFF}`}>{ex.label}</button>)}</div>
        </div>}
        {plan && <>
          <div className="ai-line ai-line--user"><div className="ai-bubble ai-bubble--user"><span className="ai-bubble-meta">Your notes</span><p>{userNote || 'Previous import resumed'}</p></div></div>
          <AgentBubble><PlanSummary plan={plan} options={options} /></AgentBubble>
          {(required.length > 0 || optional.length > 0) && <AgentBubble>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><strong className="text-[14px]">A few details to confirm</strong><p className="ai-caption mt-0.5">Answer what you know. Anything left blank can be filled in during draft review.</p></div>
                <Badge tone={requiredAnswered === required.length ? 'emerald' : 'gold'}>{requiredAnswered}/{required.length} required answered</Badge>
              </div>
              {required.map(q => <QuestionCard key={q.id} q={q} choice={choices[q.id]} onChange={c => changeAnswer(q.id, c)} disabled={busy} />)}
              {!!optional.length && <details className="ai-details"><summary>Optional questions ({optional.length})</summary><div className="mt-2 flex flex-col gap-3">{optional.map(q => <QuestionCard key={q.id} q={q} choice={choices[q.id]} onChange={c => changeAnswer(q.id, c)} disabled={busy} />)}</div></details>}
            </div>
          </AgentBubble>}
          <div className="flex flex-wrap items-center justify-between gap-3 pl-[42px] max-md:pl-0">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted"><Icon name="info" size={13} /> Your answers apply only to the entries they name.</span>
            <div className="flex flex-wrap gap-2">
              <SmallButton disabled={busy} onClick={() => resetConversation()}>Start over</SmallButton>
              {answered.length > 0 && <SmallButton disabled={busy} onClick={sendAnswers}>Send answers ({answered.length})</SmallButton>}
              <SmallButton kind="primary" disabled={busy} onClick={createDrafts}>{busy ? 'Preparing…' : requiredAnswered === required.length ? 'Prepare drafts' : 'Continue with missing details'}</SmallButton>
            </div>
          </div>
        </>}
        <div ref={conversationEnd} />
      </div>

      <div className="ai-composer">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="sfms-ai-notes" className="text-[13px] font-bold text-ink">{plan ? 'Finish the conversation above first' : 'Message SFMS Copilot'}</label>
          {!plan && <span className="text-[11px] font-semibold text-muted">Any language</span>}
        </div>
        <textarea ref={composerRef} id="sfms-ai-notes" placeholder="e.g. On 10 Oct I received 50k salary and paid 1,200 for groceries. Both Cash, priority Necessary…" value={text} maxLength={50000} rows={plan ? 2 : 3} disabled={busy || !!plan} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) { e.preventDefault(); analyze(e); } }} />
        <div className="flex flex-col gap-3 border-t border-itemBorder pt-3">
          <label className="ai-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy || !!plan} /><span>{localOnly ? 'I consent to local processing of my notes and lookup names.' : 'I consent to sending my notes and lookup names to the configured AI provider' + (fallback ? ' or its fallback provider' : '') + '.'} Don't include PINs or passwords.</span></label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted">{text.length.toLocaleString()} / 50,000 characters · {nonEmptyLines} line{nonEmptyLines === 1 ? '' : 's'}<span className="max-md:hidden"> · Enter to analyze, Shift+Enter for a new line</span></span>
            <Button variant="luxury" onClick={analyze} loading={busy} disabled={busy || !!plan || !consent || !text.trim()}>{busy ? 'Analyzing…' : 'Analyze message'}<Icon name="arrowUp" size={16} className="ml-1.5" /></Button>
          </div>
        </div>
      </div>
      {error && <div className="mx-5 mb-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger" role="alert">{error}</div>}
    </Card>

    {/* ---------- review toolbar ---------- */}
    <Card className="!p-3.5 sm:!p-4" id="sfms-ai-review" aria-label="Transaction draft review">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="m-0 font-display text-[1.02rem] font-bold tracking-[-0.02em] text-ink">Review your drafts</h2>
          <p className="m-0 text-xs text-muted">Edit any field in the table. Saving keeps your changes; posting asks you to confirm.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={load} disabled={loading || busy}>Refresh</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[200px] flex-1">
          <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by description or amount…" aria-label="Search drafts" className={`${FIELD} w-full pl-10 pr-10 font-normal`} />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-hover hover:text-ink">×</button>}
        </label>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Draft status">
          {filterTabs.map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${filter === key ? PILL_ON : PILL_OFF}`}>
              {label}<span className={`rounded-full px-1.5 text-[10px] ${filter === key ? 'bg-white/25' : 'bg-primary-soft text-primary'}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>
      {!!items.length && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-itemBorder pt-3">
        <div className="min-w-0">
          <p className="m-0 text-xs font-bold text-ink">{selectedRows.length ? `${selectedRows.length} selected` : 'Bulk actions'}</p>
          <p className="m-0 text-[11.5px] text-muted">{selectedUnsavedCount ? `${selectedUnsavedCount} selected draft(s) have unsaved edits. Use Details → Save draft first.` : 'Bulk actions use saved values. Edited a row? Save it from Details first.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SmallButton disabled={!viewRows.length || busy} onClick={toggleSelectAllVisible}>{allVisibleSelected ? 'Unselect page' : 'Select page'}</SmallButton>
          <SmallButton disabled={!viewRows.some(isReady) || busy} onClick={selectReadyVisible}>Select ready</SmallButton>
          <SmallButton disabled={!selectedRows.length || busy} onClick={clearSelection}>Clear</SmallButton>
          <SmallButton kind="danger" disabled={!selectedRows.length || busy} onClick={bulkReject}>Reject selected</SmallButton>
          <SmallButton kind="primary" disabled={!selectedRows.length || !!selectedIncompleteCount || !!selectedUnsavedCount || busy} onClick={bulkPost}>Post selected</SmallButton>
        </div>
      </div>}
    </Card>

    {/* ---------- drafts ---------- */}
    <Card className="!p-0 overflow-hidden">
      {loading && items.length === 0 ? <Spinner label="Loading your drafts…" />
        : items.length === 0 ? <EmptyState title="No pending drafts" description="Drafts you prepare in the conversation above will show up here for review." />
        : <>
          <div className="ai-grid-scroll" role="region" aria-label="Editable drafts table" tabIndex={0}>
            <table className="ai-drafts-grid">
              <colgroup><col style={{ width: 58 }} /><col style={{ width: 72 }} /><col style={{ width: 230 }} /><col style={{ width: 105 }} /><col style={{ width: 135 }} /><col style={{ width: 135 }} /><col style={{ width: 160 }} /><col style={{ width: 140 }} /><col style={{ width: 140 }} /><col style={{ width: 145 }} /><col style={{ width: 140 }} /><col style={{ width: 125 }} /><col style={{ width: 130 }} /><col style={{ width: 230 }} /></colgroup>
              <thead><tr><th><input type="checkbox" aria-label="Select all visible drafts" checked={allVisibleSelected} onChange={toggleSelectAllVisible} /></th><th>Source</th><th>Description</th><th>Amount</th><th>Date</th><th>Type</th><th>Category</th><th>From</th><th>To</th><th>Payment</th><th>Contact</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{viewRows.length ? viewRows.map(d => <DraftRow key={d.slug} draft={d} options={options} onFinished={load} selected={selectedSlugs.includes(d.slug)} onToggleSelect={() => toggleDraftSelection(d.slug)} onDirtyChange={markDraftDirty} bulkBusy={busy} />) : <tr><td colSpan={14} className="px-5 py-10 text-center text-sm text-muted">No drafts match your search or filter.</td></tr>}</tbody>
            </table>
          </div>
          <p className="m-0 border-t border-itemBorder px-5 py-2.5 text-[11.5px] text-muted">Scroll sideways to edit every field. Source shows which line of your note each draft came from. Search and filters cover the {items.length} draft{items.length === 1 ? '' : 's'} on this page.</p>
          <div className="px-5 pb-3">
            <Pagination page={page} pageSize={pageSize} total={pending.total} onPageChange={setPage} onPageSizeChange={size => { setPage(1); setPageSize(size); }} />
          </div>
        </>}
    </Card>
  </div>;
}

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi } from "../../api/public";
import { apiErrorMessage } from "../../api/client";
import Seo from "../../components/Seo";
import { Ic, useFx } from "./sfmsUi";
import "./common.css";
import "./Contact.css";

// The form posts to POST /api/public/contact; admins read and answer it from the admin panel.
const TOPICS = [
  ["Account help", "chat", "Sign-in, verification, profile or password questions."],
  ["Feedback and ideas", "spark", "Tell us what would make SFMS better for you."],
  ["Report an issue", "bug", "Something not working? Describe what happened."],
];

export default function Contact() {
  const root = useRef();
  const move = useFx(root);
  const [topic, setTopic] = useState(0), [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", website: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await publicApi.submitContact({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || TOPICS[topic][0],
        message: form.message.trim(),
        website: form.website, // honeypot: stays empty for real visitors
      });
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "", website: "" });
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't send your message. Please try again in a moment."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sfms-home" ref={root} onMouseMove={move}>
      <Seo title="Contact Us" description="Questions about your SFMS account or the app? Get in touch and we'll get back to you." path="/contact" />
      <div className="prog" /><div className="glow" />

      <section className="hero sm"><div className="wrap hcenter rv">
        <span className="tag">Contact us</span>
        <h1>Questions? <span className="grad">We are here to help.</span></h1>
        <p className="lead">Choose a topic, tell us what is on your mind, and we will get back to you.</p>
      </div></section>

      <section className="sec" style={{ paddingTop: 20 }}><div className="wrap ct">
        <div className="rv">
          <div className="ct-topics">
            {TOPICS.map(([t, n, d], i) => (
              <button key={t} type="button" className={"ct-card spot" + (i === topic ? " on" : "")} onClick={() => setTopic(i)} aria-pressed={i === topic}>
                <span className="ico"><Ic n={n} /></span><span><b>{t}</b><small>{d}</small></span>
              </button>
            ))}
          </div>
          <div className="ct-tips">
            <h3>Help us help you faster</h3>
            <ul>{["Say what you expected and what happened instead.", "Mention the page you were on and the steps you took.", "Never include your password or sign-in tokens."].map((t) => <li key={t}><Ic n="check" s={16} />{t}</li>)}</ul>
            <Link to="/how-it-works#faq" className="more">Read the FAQ first <Ic n="arrow" s={15} /></Link>
          </div>
        </div>

        <div className="ct-form rv" style={{ "--d": ".12s" }}>
          {sent ? (
            <div className="ct-ok">
              <span className="okc"><Ic n="mail" s={26} /></span>
              <h3>Message sent. Thank you!</h3>
              <p>We have received your message and will reply to the email address you gave us.</p>
              <button type="button" className="btn out" onClick={() => setSent(false)}>Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h3>Send a message</h3><p className="mut">Topic: <b>{TOPICS[topic][0]}</b></p>
              {error && <p className="ct-warn" role="alert">{error}</p>}
              <label className="ct-f">Name<input required maxLength={100} value={form.name} onChange={set("name")} autoComplete="name" /></label>
              <label className="ct-f">Email<input required type="email" maxLength={254} value={form.email} onChange={set("email")} autoComplete="email" /></label>
              <label className="ct-f">Subject (optional)<input maxLength={200} value={form.subject} onChange={set("subject")} placeholder={TOPICS[topic][0]} /></label>
              <label className="ct-f">Message<textarea required minLength={10} maxLength={5000} rows={5} value={form.message} onChange={set("message")} /></label>
              {/* Honeypot: hidden from people, tempting for bots. A filled value makes the backend discard the message. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set("website")}
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
              <button type="submit" className="btn pri lg" style={{ width: "100%" }} disabled={busy}>{busy ? "Sending…" : "Send message"} <Ic n="arrow" s={18} /></button>
            </form>
          )}
        </div>
      </div></section>
    </div>
  );
}

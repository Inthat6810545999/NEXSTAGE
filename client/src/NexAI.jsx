import { useState } from 'react';
import { ArrowRight, Send, Sparkles } from 'lucide-react';
import './next-ai.css';

const suggestions = [
  'มีคอนเสิร์ตในกรุงเทพงบไม่เกิน 1,000 บาทไหม?',
  'มีกิจกรรมอะไรเหมาะกับนักศึกษาบ้าง?',
  'Which events offer a certificate?',
];

export default function NexAI({ request, onOpen, money }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(event) {
    event.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await request('/assistant', { method: 'POST', body: { question: question.trim() } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="container subpage narrow next-ai">
      <div className="subpage-head">
        <div className="eyebrow"><Sparkles size={16} /> NEXSTAGE ASSISTANT</div>
        <h1>NexAI</h1>
        <p>Find events, compare ticket prices, and see what fits your plans.</p>
      </div>
      <div className="next-ai-card">
        <form onSubmit={ask}>
          <label htmlFor="next-ai-question">Ask about an event</label>
          <div className="next-ai-input">
            <input id="next-ai-question" value={question} maxLength={600} required
              onChange={event => setQuestion(event.target.value)} placeholder="What would you like to find?" />
            <button type="submit" className="btn btn-primary" disabled={!question.trim() || loading}>
              <Send size={16} /> Ask
            </button>
          </div>
        </form>
        <div className="next-ai-suggestions" aria-label="Example questions">
          {suggestions.map(example => (
            <button type="button" key={example} onClick={() => setQuestion(example)}>{example}</button>
          ))}
        </div>
        {loading && <p role="status">Looking through NEXSTAGE events…</p>}
        {error && <p className="next-ai-error" role="alert">{error}</p>}
        {result && (
          <div className="next-ai-answer" aria-live="polite">
            <p>{result.answer}</p>
            {result.events.map(event => {
              const prices = event.tickets.filter(ticket => ticket.available > 0).map(ticket => ticket.price);
              return (
                <button key={event.id} type="button" className="next-ai-event" onClick={() => onOpen(event)}>
                  <span><strong>{event.title}</strong>
                    <small>{event.venue} · {prices.length ? 'From ' + money(Math.min(...prices)) : 'No available tickets'}</small>
                  </span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

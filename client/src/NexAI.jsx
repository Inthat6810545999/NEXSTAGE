import { lazy, Suspense, useRef, useState } from 'react';
import { ArrowRight, Send, Sparkles } from 'lucide-react';
import './next-ai.css';

const NexAIMascot = lazy(() => import('./NexAIMascot'));

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
  const [petPosition, setPetPosition] = useState(null);
  const petDrag = useRef(null);
  const cardRef = useRef(null);

  function startPetDrag(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    petDrag.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width, height: rect.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePet(event) {
    if (!petDrag.current) return;
    const { x, y, width, height } = petDrag.current;
    const cardRect = cardRef.current.getBoundingClientRect();
    setPetPosition({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - x)) - cardRect.left,
      top: Math.max(8, Math.min(window.innerHeight - height - 8, event.clientY - y)) - cardRect.top,
      right: 'auto',
      bottom: 'auto',
    });
  }

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
    <section className="container subpage next-ai">
      <div className="next-ai-hero">
        <div className="subpage-head">
          <div className="eyebrow"><Sparkles size={16} /> NEXSTAGE ASSISTANT</div>
          <h1>NexAI</h1>
          <p>Find events, compare ticket prices, and see what fits your plans.</p>
        </div>
      </div>
      <div className="next-ai-card" ref={cardRef}>
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
        <aside className="next-ai-pet" style={petPosition || undefined} aria-label="NexAI pet" title="Drag to move" onPointerDown={startPetDrag} onPointerMove={movePet} onPointerUp={() => { petDrag.current = null; }} onPointerCancel={() => { petDrag.current = null; }}>
          <div className="next-ai-mascot-panel"><Suspense fallback={<div className="nex-ai-mascot nex-ai-mascot-loading">✦</div>}><NexAIMascot /></Suspense></div>
        </aside>
      </div>
    </section>
  );
}

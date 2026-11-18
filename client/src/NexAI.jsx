import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [petPose, setPetPose] = useState('dance');
  const [petFlip, setPetFlip] = useState(0);
  const petDrag = useRef(null);
  const suppressPetClick = useRef(false);
  const cardRef = useRef(null);
  const answerRef = useRef(null);
  const firstEventRef = useRef(null);
  const petWasMoved = useRef(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const placePet = () => {
      if (petWasMoved.current) return;
      if (result) {
        const target = firstEventRef.current || answerRef.current;
        if (target) {
          const rect = target.getBoundingClientRect();
          const placeBeside = rect.left >= 138;
          setPetPosition({
            left: placeBeside ? rect.left - 125 : Math.max(8, Math.min(window.innerWidth - 118, rect.left)),
            top: placeBeside ? rect.top - 8 : rect.top - 118,
          });
          return;
        }
      }
      const rect = card.getBoundingClientRect();
      const compact = window.matchMedia('(max-width: 560px)').matches;
      setPetPosition({ left: rect.right - (compact ? 120 : 155), top: rect.top - (compact ? 88 : 62) });
    };
    const observer = new ResizeObserver(placePet);
    observer.observe(card);
    window.addEventListener('resize', placePet);
    window.addEventListener('scroll', placePet, true);
    placePet();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', placePet);
      window.removeEventListener('scroll', placePet, true);
    };
  }, [result]);

  useEffect(() => {
    if (petPose !== 'point') return;
    let pointerStart;
    const resumeDance = () => setPetPose('dance');
    const resumeAfterMove = event => {
      if (!pointerStart) {
        pointerStart = { x: event.clientX, y: event.clientY };
        return;
      }
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 16) resumeDance();
    };
    window.addEventListener('pointerdown', resumeDance, true);
    window.addEventListener('pointermove', resumeAfterMove);
    window.addEventListener('keydown', resumeDance);
    window.addEventListener('wheel', resumeDance, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', resumeDance, true);
      window.removeEventListener('pointermove', resumeAfterMove);
      window.removeEventListener('keydown', resumeDance);
      window.removeEventListener('wheel', resumeDance);
    };
  }, [petPose]);

  function startPetDrag(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    suppressPetClick.current = false;
    petDrag.current = { x: event.clientX - rect.left, y: event.clientY - rect.top, startX: event.clientX, startY: event.clientY, width: rect.width, height: rect.height, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePet(event) {
    if (!petDrag.current) return;
    const { x, y, startX, startY, width, height } = petDrag.current;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) < 4 && !petDrag.current.moved) return;
    petDrag.current.moved = true;
    suppressPetClick.current = true;
    petWasMoved.current = true;
    setPetPose('dance');
    setPetPosition({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - x)),
      top: Math.max(8, Math.min(window.innerHeight - height - 8, event.clientY - y)),
    });
  }

  function flipPet() {
    if (!suppressPetClick.current) setPetFlip(value => value + 1);
  }

  async function ask(event) {
    event.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    setPetPose('dance');
    petWasMoved.current = false;
    try {
      const answer = await request('/assistant', { method: 'POST', body: { question: question.trim() } });
      setResult(answer);
      setPetPose('point');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
            <p ref={answerRef}>{result.answer}</p>
            {result.events.map((event, index) => {
              const prices = event.tickets.filter(ticket => ticket.available > 0).map(ticket => ticket.price);
              return (
                <button key={event.id} ref={index === 0 ? firstEventRef : undefined} type="button" className="next-ai-event" onClick={() => onOpen(event)}>
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
    {petPosition && createPortal(
      <aside className="next-ai-pet" style={petPosition} role="button" tabIndex={0} aria-label="NexAI pet. Click to flip or drag to move." title="Click to flip · Drag to move" onClick={flipPet} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPetFlip(value => value + 1); } }} onPointerDown={startPetDrag} onPointerMove={movePet} onPointerUp={() => { petDrag.current = null; }} onPointerCancel={() => { petDrag.current = null; }}>
        <div className="next-ai-mascot-panel"><Suspense fallback={<div className="nex-ai-mascot nex-ai-mascot-loading">✦</div>}><NexAIMascot pose={petPose} flipToken={petFlip} /></Suspense></div>
        {petPose === 'point' && <ArrowRight className="next-ai-pet-pointer" size={26} aria-hidden="true" />}
      </aside>, document.body
    )}
    </>
  );
}

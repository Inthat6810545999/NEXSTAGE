import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Box, Eye, Layers3, Map, MapPin, Maximize, Minimize, RotateCcw } from 'lucide-react';
import { runway, sectionColors, sections, stage } from './venue-layout';
import './venue-preview.css';

const VenueScene = lazy(() => import('./VenueScene'));
const options = count => Array.from({ length: count }, (_, index) => index + 1);

function VenueMap({ selection, onSelect }) {
  return (
    <svg className="venue-map" viewBox="-27 -23 54 50" aria-label="Illustrative Impact Arena seating map">
      <rect x="-26" y="-22" width="52" height="48" rx="3" className="venue-map-shell" />
      <rect x={stage.x - stage.width / 2} y={stage.z - stage.depth / 2} width={stage.width} height={stage.depth} rx="1.2" fill="#48276e" />
      <rect x={runway.x - runway.width / 2} y={runway.z - runway.depth / 2} width={runway.width} height={runway.depth} rx=".45" fill="#48276e" />
      <text className="venue-map-stage" x="0" y={stage.z}>MAIN STAGE</text>
      {sections.map(section => (
        <g key={section.id} role="button" tabIndex={0}
          aria-label={section.level + ' ' + section.id + ' ' + section.name}
          aria-pressed={selection.section.id === section.id}
          className="venue-map-section"
          transform={'translate(' + section.x + ' ' + section.z + ')'}
          onClick={() => onSelect(section)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect(section);
            }
          }}>
          <rect x={-section.width / 2} y={-section.depth / 2} width={section.width} height={section.depth}
            transform={'rotate(' + -section.yaw + ')'}
            rx=".55" fill={sectionColors[section.level]} />
          <text className={section.level === 'Lower' ? 'venue-map-light-label' : undefined}>{section.id}</text>
        </g>
      ))}
    </svg>
  );
}

export default function VenuePreview({ event, mode, onMode, onBack }) {
  const [selection, setSelection] = useState({ section: sections[0], row: 5, seat: 5 });
  const [view, setView] = useState('overview');
  const [reset, setReset] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const viewport = useRef(null);
  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const [fillViewport, setFillViewport] = useState(false);
  const expanded = browserFullscreen || fillViewport;
  const { section, row, seat } = selection;
  const showMap = mode === '2d' || unavailable;

  useEffect(() => {
    function syncFullscreen() {
      setBrowserFullscreen(document.fullscreenElement === viewport.current);
    }
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    function dismissExpanded(event) {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      event.preventDefault();
      if (document.fullscreenElement === viewport.current) {
        void document.exitFullscreen();
      } else {
        setFillViewport(false);
      }
    }
    document.addEventListener('keydown', dismissExpanded, true);
    return () => document.removeEventListener('keydown', dismissExpanded, true);
  }, [expanded]);

  async function toggleFullscreen() {
    const element = viewport.current;
    if (document.fullscreenElement === element) {
      await document.exitFullscreen();
    } else if (fillViewport) {
      setFillViewport(false);
    } else {
      if (document.fullscreenEnabled && element.requestFullscreen) {
        try {
          await element.requestFullscreen();
          return;
        } catch {
          // Some embedded browsers disallow native fullscreen.
        }
      }
      setFillViewport(true);
    }
  }

  function selectSection(next) {
    setSelection({ section: next, row: Math.ceil(next.rows / 2), seat: Math.ceil(next.seats / 2) });
  }

  function viewFromSeat() {
    setView('seat');
    setReset(value => value + 1);
    onMode('3d');
  }

  return (
    <div className="venue-preview">
      <header className="venue-header">
        <button type="button" className="venue-back" autoFocus onClick={onBack}><ArrowLeft size={16} /> Back to tickets</button>
        <div className="venue-heading">
          <div className="venue-eyebrow"><MapPin size={13} /> {event.venue}</div>
          <h2>{event.title}</h2>
        </div>
        <div className="venue-modes" role="group" aria-label="Venue preview mode">
          <button type="button" aria-pressed={!showMap} disabled={unavailable} onClick={() => onMode('3d')}><Box size={16} /> 3D Preview</button>
          <button type="button" aria-pressed={showMap} onClick={() => onMode('2d')}><Map size={16} /> 2D Map</button>
        </div>
      </header>

      <div className="venue-layout">
        <div ref={viewport} className={fillViewport ? 'venue-viewport is-expanded' : 'venue-viewport'}>
          {showMap ? (
            <VenueMap selection={selection} onSelect={selectSection} />
          ) : (
            <Suspense fallback={<div className="venue-loading" role="status">Loading 3D preview…</div>}>
              <VenueScene selection={selection} view={view} reset={reset} onSelect={setSelection} onUnavailable={setUnavailable} />
            </Suspense>
          )}
          <div className="venue-view-tag">{showMap ? 'TOP VIEW' : view === 'seat' ? 'VIEW FROM SEAT' : 'ARENA OVERVIEW'}</div>
          {!showMap && (
            <button type="button" className="venue-reset" onClick={() => { setView('overview'); setReset(value => value + 1); }}>
              <RotateCcw size={15} /> Overview
            </button>
          )}
          <div className="venue-view-hint">
            {showMap ? 'Select a section to explore' : view === 'seat' ? 'Drag to look around · Scroll to zoom' : 'Drag to orbit · Scroll or pinch to zoom'}
          </div>
          <button type="button" className="venue-fullscreen" onClick={toggleFullscreen}
            aria-label={expanded ? 'Exit fullscreen' : 'Fullscreen'}
            title={expanded ? 'Exit fullscreen' : 'Fullscreen'}>
            {expanded ? <Minimize size={17} aria-hidden="true" /> : <Maximize size={17} aria-hidden="true" />}
          </button>
        </div>

        <aside className="venue-controls">
          <div className="venue-control-icon"><Layers3 size={19} /></div>
          <h3>Find your view</h3>
          <p>Pick a section, row and seat to see the stage from that spot.</p>
          <label>Section<select value={section.id} onChange={e => selectSection(sections.find(item => item.id === e.target.value))}>
            {sections.map(item => <option key={item.id} value={item.id}>{item.level} {item.id} · {item.name}</option>)}
          </select></label>
          <div className="venue-row-seat">
            <label>Row<select value={row} onChange={e => setSelection({ section, row: Number(e.target.value), seat })}>
              {options(section.rows).map(value => <option key={value}>{value}</option>)}
            </select></label>
            <label>Seat<select value={seat} onChange={e => setSelection({ section, row, seat: Number(e.target.value) })}>
              {options(section.seats).map(value => <option key={value}>{value}</option>)}
            </select></label>
          </div>
          <button type="button" className="btn btn-primary venue-seat-button" disabled={unavailable} onClick={viewFromSeat}><Eye size={17} /> View from this seat</button>
          {unavailable && <p role="status">3D is unavailable in this browser. The 2D map is still available.</p>}
          <div className="venue-legend" aria-label="Seating levels">
            {Object.entries(sectionColors).map(([level, color]) => <span key={level}><i style={{ backgroundColor: color }} />{level}</span>)}
          </div>
        </aside>
      </div>
      <p className="venue-disclaimer">Illustrative layout and sightlines. Actual concert layouts can vary. Previewing a seat does not reserve it.</p>
    </div>
  );
}

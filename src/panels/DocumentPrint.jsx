import React, { useEffect, useRef, useState } from 'react';
import { fmtDate, today } from './ui';
import { ageOf } from './DoctorViews';

const TYPES = [
  ['certificate', 'Medical certificate'],
  ['referral', 'Referral letter'],
  ['prescription', 'Prescription (Rx)'],
];
const OFFICE = ['City Health and Sanitation Department', 'City Health Office · Calapan City Hall Compound, Oriental Mindoro', '(043) 288 1234 · clinic@calapan.gov.ph'];
const longDate = (iso) => fmtDate(iso, { month: 'long', day: 'numeric', year: 'numeric' });
const keyFor = (user) => `clinic-esig-${user.id || user.email || 'doctor'}`;

/* ---- e-signature pad: draw once, stamped on every document ---- */
function SignaturePad({ value, onSave, onClear }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (value) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height); img.src = value; }
  }, [value]);

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * ref.current.width, ((e.clientY - r.top) / r.height) * ref.current.height];
  };
  const down = (e) => { drawing.current = true; const ctx = ref.current.getContext('2d'); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#101c2e'; ctx.beginPath(); ctx.moveTo(...pos(e)); ref.current.setPointerCapture(e.pointerId); };
  const move = (e) => { if (!drawing.current) return; const ctx = ref.current.getContext('2d'); ctx.lineTo(...pos(e)); ctx.stroke(); setDirty(true); };
  const up = () => { drawing.current = false; };

  return (
    <div className="esig">
      <b>Your e-signature</b>
      <p className="hint" style={{ margin: '6px 0 10px' }}>Sign once — the same signature is stamped on every certificate, referral letter and prescription you issue.</p>
      <canvas ref={ref} width="520" height="130" className="padc" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} aria-label="Signature pad" />
      <div className="btns">
        <button onClick={() => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); setDirty(false); onClear(); }}>Clear</button>
        <button className="btn" disabled={!dirty} onClick={() => { onSave(ref.current.toDataURL('image/png')); setDirty(false); }}>Save signature</button>
      </div>
    </div>
  );
}

const Fld = ({ label, wide, children }) => <label className={wide ? 'w' : ''}><span className="lbl">{label}</span>{children}</label>;

export default function DocumentPrint({ user, patients = [], initialType = 'certificate', initialPatient, onBack }) {
  const [type, setType] = useState(initialType);
  const [sig, setSig] = useState('');
  const [license, setLicense] = useState('');
  const day = today();
  const base = (p) => ({ name: p?.name || '', age: p ? ageOf(p.birthdate) ?? '' : '', sex: p?.sex || '', address: p?.address || '' });
  const [f, setF] = useState({
    ...base(initialPatient), date: day, purpose: 'Work', diagnosis: '', restDays: '1', restStart: day, remarks: '',
    urgency: 'Routine', facility: '', department: '', reason: '', findings: '', refills: 'No refill',
    meds: [{ name: '', dose: '', freq: '', days: '', sig: '' }], advice: '',
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => { try { setSig(localStorage.getItem(keyFor(user)) || ''); setLicense(localStorage.getItem(keyFor(user) + '-lic') || ''); } catch { /* storage unavailable */ } }, [user]);
  const saveSig = (v) => { setSig(v); try { localStorage.setItem(keyFor(user), v); } catch { /* ignore */ } };
  const clearSig = () => { setSig(''); try { localStorage.removeItem(keyFor(user)); } catch { /* ignore */ } };
  const saveLic = (v) => { setLicense(v); try { localStorage.setItem(keyFor(user) + '-lic', v); } catch { /* ignore */ } };

  const pickPatient = (id) => { const p = patients.find((x) => String(x.id) === String(id)); if (p) setF((s) => ({ ...s, ...base(p) })); };
  const restEnd = (() => { const d = new Date(f.restStart + 'T00:00:00'); d.setDate(d.getDate() + Math.max(0, Number(f.restDays) - 1)); return isNaN(d) ? '' : d.toISOString().slice(0, 10); })();
  const setMed = (i, k, v) => setF((s) => ({ ...s, meds: s.meds.map((m, j) => (j === i ? { ...m, [k]: v } : m)) }));
  const meds = f.meds.filter((m) => m.name.trim());
  const docNo = { certificate: 'MC', referral: 'RL', prescription: 'RX' }[type] + '-' + day.slice(0, 4) + '-' + String(Date.now()).slice(-4);
  const titleOf = { certificate: 'Medical Certificate', referral: 'Referral Letter', prescription: 'Prescription' }[type];

  const bullets = {
    certificate: [`Certifies that ${f.name || 'the patient'} was seen on ${longDate(f.date)}.`, `Diagnosis on the certificate: ${f.diagnosis || '—'}.`, `${f.restDays} day(s) of rest recommended${restEnd ? `, until ${longDate(restEnd)}` : ''}.`, `Issued for ${f.purpose.toLowerCase()} purposes with your signature and license number.`],
    referral: [`Addressed to ${f.facility || '—'}${f.department ? ` — ${f.department}` : ''}.`, `Working diagnosis: ${f.diagnosis || '—'}.`, `Marked as ${f.urgency.toLowerCase()} referral.`, 'Includes your findings, the reason for referral, and a receiving signature line.'],
    prescription: [`${meds.length} medicine(s) prescribed for ${f.name || 'the patient'} on ${longDate(f.date)}.`, ...meds.map((m) => `${m.name} — ${[m.dose, m.freq, m.days && `${m.days} days`].filter(Boolean).join(', ')}.`), `For ${f.diagnosis || '—'}; ${f.refills.toLowerCase()}.`],
  }[type];

  return (
    <>
      <div className="tw print-hide" style={{ justifyContent: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div className="seg">{TYPES.map(([k, l]) => <button key={k} className={k === type ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}</div>
        <span className="warn" style={{ margin: 0, padding: '9px 12px' }}>In the print dialog choose “Save as PDF” to email the document to the patient instead of printing it.</span>
      </div>

      <div className="g2 print-hide">
        <div className="pc">
          {patients.length > 0 && (
            <label className="fl"><span className="lbl">Fill from patient</span>
              <select defaultValue={initialPatient?.id || ''} onChange={(e) => pickPatient(e.target.value)}>
                <option value="">Choose a patient…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · P-{p.id}</option>)}
              </select>
            </label>
          )}
          <div className="fg">
            <Fld label="Patient"><input value={f.name} onChange={set('name')} /></Fld>
            <Fld label="Age"><input value={f.age} onChange={set('age')} /></Fld>
            <Fld label="Sex"><select value={f.sex} onChange={set('sex')}><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select></Fld>
            <Fld label="Date issued"><input type="date" value={f.date} onChange={set('date')} /></Fld>
            {type === 'certificate' && (<>
              <Fld label="Purpose"><select value={f.purpose} onChange={set('purpose')}><option>Work</option><option>School</option><option>Travel</option><option>Other</option></select></Fld>
              <Fld label="Rest days"><input type="number" min="1" value={f.restDays} onChange={set('restDays')} /></Fld>
              <Fld label="Diagnosis" wide><textarea rows="2" value={f.diagnosis} onChange={set('diagnosis')} /></Fld>
              <Fld label="Rest starts"><input type="date" value={f.restStart} onChange={set('restStart')} /></Fld>
              <Fld label="Patient address" wide><textarea rows="2" value={f.address} onChange={set('address')} /></Fld>
              <Fld label="Remarks" wide><textarea rows="2" value={f.remarks} onChange={set('remarks')} /></Fld>
            </>)}
            {type === 'referral' && (<>
              <Fld label="Urgency"><select value={f.urgency} onChange={set('urgency')}><option>Routine</option><option>Urgent</option><option>Emergency</option></select></Fld>
              <Fld label="Referred to (facility)" wide><textarea rows="2" value={f.facility} onChange={set('facility')} /></Fld>
              <Fld label="Department / service"><input value={f.department} onChange={set('department')} /></Fld>
              <Fld label="Working diagnosis"><input value={f.diagnosis} onChange={set('diagnosis')} /></Fld>
              <Fld label="Reason for referral" wide><textarea rows="2" value={f.reason} onChange={set('reason')} /></Fld>
              <Fld label="Findings on examination" wide><textarea rows="2" value={f.findings} onChange={set('findings')} /></Fld>
            </>)}
            {type === 'prescription' && (<>
              <Fld label="Refills allowed"><select value={f.refills} onChange={set('refills')}><option>No refill</option><option>1 refill</option><option>2 refills</option></select></Fld>
              <Fld label="Diagnosis / indication" wide><input value={f.diagnosis} onChange={set('diagnosis')} /></Fld>
              <div className="w">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <div><b>Medicines</b><div className="hint" style={{ fontSize: 13 }}>Dosage, frequency and how long to take each one.</div></div>
                  <button onClick={() => setF((s) => ({ ...s, meds: [...s.meds, { name: '', dose: '', freq: '', days: '', sig: '' }] }))}>+ Add medicine</button>
                </div>
                {f.meds.map((m, i) => (
                  <div key={i} className="medbox">
                    <span className="lbl">Medicine {i + 1}</span>
                    <input placeholder="Medicine & strength" value={m.name} onChange={(e) => setMed(i, 'name', e.target.value)} />
                    <div className="fg">
                      <input placeholder="Dosage" value={m.dose} onChange={(e) => setMed(i, 'dose', e.target.value)} />
                      <input placeholder="Frequency" value={m.freq} onChange={(e) => setMed(i, 'freq', e.target.value)} />
                      <input placeholder="Days" value={m.days} onChange={(e) => setMed(i, 'days', e.target.value)} />
                    </div>
                    <input placeholder="Instructions (optional)" value={m.sig} onChange={(e) => setMed(i, 'sig', e.target.value)} />
                    {f.meds.length > 1 && <button className="linkbtn" onClick={() => setF((s) => ({ ...s, meds: s.meds.filter((_, j) => j !== i) }))}>Remove</button>}
                  </div>
                ))}
              </div>
              <Fld label="Advice" wide><textarea rows="2" value={f.advice} onChange={set('advice')} /></Fld>
            </>)}
          </div>
          <label className="fl" style={{ marginTop: 16 }}><span className="lbl">PRC license no.</span><input value={license} onChange={(e) => saveLic(e.target.value)} placeholder="e.g. 0114523" /></label>
          <SignaturePad value={sig} onSave={saveSig} onClear={clearSig} />
        </div>

        <div>
          <div className="pc">
            <span className="lbl" style={{ marginBottom: 6 }}>What the document says</span>
            <ul className="bl">{bullets.map((x, i) => <li key={i}>{x}</li>)}</ul>
            {!sig && <div className="warn">No e-signature yet. Draw and save one so the document is signed when it prints.</div>}
          </div>
          <div className="esg">
            <span className="lbl" style={{ display: 'flex', justifyContent: 'space-between' }}>E-signature<span className="pill">{sig ? 'Signed' : 'Not signed'}</span></span>
            <div className="pad">{sig && <img src={sig} alt="Saved signature" style={{ height: '100%' }} />}</div>
            <b style={{ display: 'block', textAlign: 'center' }}>{user.name}</b>
          </div>
        </div>
      </div>

      <div className="paper">
        <div className="ph">
          <div><b>{OFFICE[0]}</b><br />{OFFICE[1]}<br />{OFFICE[2]}</div>
          <div style={{ textAlign: 'right' }}><small style={{ letterSpacing: '.12em' }}>DOCUMENT NO.</small><br /><b>{docNo}</b><br />{longDate(f.date)}</div>
        </div>
        <div className="pb">
          <div className="rp">REPUBLIC OF THE PHILIPPINES</div>
          <h2>{titleOf}</h2>
          {type === 'certificate' && (<>
            <p>This is to certify that <u>{f.name || '________'}</u>{f.age && <>, {f.age} years old</>}{f.sex && <>, {f.sex.toLowerCase()}</>}{f.address && <>, of {f.address}</>}, was seen and examined at this office on <u>{longDate(f.date)}</u>.</p>
            <p><b>Diagnosis:</b> <u>{f.diagnosis || '________'}</u></p>
            <p>He/she is advised <b>{f.restDays} day(s)</b> of rest, from {longDate(f.restStart)}{restEnd && <> until {longDate(restEnd)}</>}. This certificate is issued for <b>{f.purpose.toLowerCase()}</b> purposes.</p>
            {f.remarks && <p><b>Remarks:</b> {f.remarks}</p>}
          </>)}
          {type === 'referral' && (<>
            <p><b>To:</b> The Medical Director, <u>{f.facility || '________'}</u>{f.department && <> — <u>{f.department}</u></>}</p>
            <p>This is to refer <u>{f.name || '________'}</u>{f.age && <>, {f.age} years old</>}{f.sex && <>, {f.sex.toLowerCase()}</>}, who was examined and treated at this City Health Office on <u>{longDate(f.date)}</u>.</p>
            <p><b>Working diagnosis:</b> <u>{f.diagnosis || '________'}</u></p>
            {f.findings && <p><b>Findings on examination:</b> {f.findings}</p>}
            {f.reason && <p><b>Reason for referral:</b> {f.reason}</p>}
            <p>Considered a <b>{f.urgency.toUpperCase()}</b> case. Kindly extend to the patient the necessary diagnostic services and care. Thank you very much for your kind assistance.</p>
          </>)}
          {type === 'prescription' && (<>
            <div className="rxhead">
              <div><small>PATIENT</small><br /><b>{f.name || '________'}</b></div>
              <div><small>AGE / SEX</small><br /><b>{[f.age, f.sex].filter(Boolean).join(' / ') || '—'}</b></div>
              <div><small>DIAGNOSIS</small><br /><b>{f.diagnosis || '—'}</b></div>
            </div>
            <table>
              <thead><tr><th>#</th><th>MEDICINE</th><th>DOSAGE</th><th>FREQUENCY</th><th>DURATION</th></tr></thead>
              <tbody>
                {meds.map((m, i) => (
                  <tr key={i}><td>{i + 1}.</td><td><b>{m.name}</b>{m.sig && <><br /><small>Sig: {m.sig}</small></>}</td><td>{m.dose}</td><td>{m.freq}</td><td>{m.days && `${m.days} days`}</td></tr>
                ))}
              </tbody>
            </table>
            {f.advice && <p><b>Advice:</b> {f.advice}</p>}
            <p><small>Refills: <b>{f.refills}</b> · Please follow the dosage and frequency exactly as written.</small></p>
          </>)}
          <div className="sig">
            <div>PATIENT SIGNATURE<br />{f.name}</div>
            <div>
              {sig && <img src={sig} alt="" style={{ height: 46, display: 'block', margin: '-48px 0 4px' }} />}
              <b>{user.name}</b><br />{type === 'prescription' ? 'Prescribing physician' : 'Attending physician'}{license && <> · PRC License {license}</>}
            </div>
          </div>
        </div>
      </div>

      <div className="btns print-hide" style={{ marginTop: 20 }}>
        <button className="btn" onClick={() => window.print()}>Print document</button>
        <button onClick={onBack}>← Back to doctor console</button>
      </div>
    </>
  );
}

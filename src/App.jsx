import React, { useEffect, useState } from 'react';
import { ASSETS } from './assets';
import LivePanel from './LivePanel';
import GoogleLoginButton from './GoogleLoginButton';
import ClinicMap from './ClinicMap';
import { api, login, logout, restoreSession, clearSession } from './api';

/* -------------------------------------------------------------------------- */
/*  Icon                                                                      */
/* -------------------------------------------------------------------------- */

function Icon({ name = 'cross', size = 20 }) {
  const paths = {
    cross: (
      <>
        <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
      </>
    ),
    phone: (
      <path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 2-2 2-3 2A19 19 0 0 1 3 6c0-1 0-3 2-3z" />
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 2v6m10-6v6M3 11h18m-14 5h4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    stethoscope: (
      <>
        <path d="M4 3v6a5 5 0 0 0 10 0V3M2 3h4m6 0h4M9 14v2a5 5 0 0 0 10 0v-3" />
        <circle cx="19" cy="10" r="3" />
      </>
    ),
    qr: (
      <>
        <path d="M3 3h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm12 0h3v3h3v3h-6zm6-3v3M12 3v9H3m9 3v6" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.cross}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Photo                                                                     */
/* -------------------------------------------------------------------------- */

// Add your own image URLs in src/assets.js when ready.
function Photo({ file, box, alt, className = '' }) {
  const [, , w, h] = box;
  const [failed, setFailed] = useState(false);
  const imageUrl = failed ? '' : ASSETS[file];

  return (
    <div
      className={`photo ${imageUrl ? 'has-image' : 'image-placeholder'} ${className}`}
      style={{ aspectRatio: `${w}/${h}` }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={alt} onError={() => setFailed(true)} />
      ) : (
        <div className="placeholder-label">
          <span>YOUR IMAGE</span>
          <small>{alt}</small>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Static content                                                            */
/* -------------------------------------------------------------------------- */

const services = [
  [
    'General medicine',
    'Consultations for fever, cough, hypertension and diabetes, with maintenance medicines under the city health programme where available.',
    [121, 258, 239, 180],
  ],
  [
    'Pediatrics & child care',
    'Well-child check-ups, immunisation schedules and treatment for the common illnesses children bring home from school.',
    [378, 258, 239, 180],
  ],
  [
    'Maternal & OB–GYN care',
    'Prenatal check-ups, family planning counselling and postnatal follow-ups with our OB–GYN team, room 7.',
    [636, 258, 239, 180],
  ],
];

const schedules = [
  [
    'Monday',
    [
      ['8:00 AM – 12:00 NN', 'Dr. Maria L. Santos', 'General Medicine · Room 3'],
      ['1:00 PM – 5:00 PM', 'Dr. Jose P. Rivera', 'Pediatrics · Room 1'],
    ],
  ],
  [
    'Tuesday',
    [
      ['8:00 AM – 12:00 NN', 'Dr. Ana C. Mendoza', 'Internal Medicine · Room 5'],
      ['1:00 PM – 4:00 PM', 'Dr. Liza M. Bautista', 'OB–GYN · Room 7'],
    ],
  ],
  [
    'Wednesday',
    [
      ['8:00 AM – 12:00 NN', 'Dr. Ramon T. Dela Cruz', 'Dental Services · Dental Clinic'],
      ['1:00 PM – 5:00 PM', 'Dr. Paolo S. Aquino', 'Eye & ENT · Room 6'],
    ],
  ],
  [
    'Thursday',
    [['8:00 AM – 4:00 PM', 'Dr. Liza M. Bautista', 'OB–GYN · Room 7']],
  ],
  [
    'Friday',
    [['8:00 AM – 12:00 NN', 'Dr. Maria L. Santos', 'General Medicine · Room 3']],
  ],
];

const faqs = [
  [
    'Who can use the online appointment system?',
    'Patients can create an account and sign in to view available clinic schedules.',
  ],
  [
    'How many patients can book each schedule?',
    'Each doctor’s session has a limited number of slots. Available slots appear in Book visit after signing in.',
  ],
  [
    'What happens if I arrive late?',
    'Please approach the clinic staff when you arrive. They can advise you about your queue position and available consultation slots.',
  ],
  [
    'How do I reschedule or cancel?',
    'Open Appointments to cancel an eligible booking, then book another available schedule.',
  ],
  [
    'Do I need to print the QR code?',
    'You can show your QR ticket on your phone. A printed copy can also be used. Open Appointments after booking to view your QR ticket.',
  ],
  [
    'Who can see my medical records?',
    'Sign in to view your own records. Clinic staff and doctors have access according to the server’s permissions.',
  ],
];

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  /* ---- State ---- */
  const [route, setRoute] = useState(location.hash || '#home');
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [chat, setChat] = useState(false);

  const [user, setUser] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const isRegister = route === '#register';
  const isLogin = route === '#login' || isRegister;

  /* ---- Hash routing ---- */
  useEffect(() => {
    const onHashChange = () => {
      setRoute(location.hash || '#home');
      setMenu(false);
      setNotice('');
    };

    addEventListener('hashchange', onHashChange);
    return () => removeEventListener('hashchange', onHashChange);
  }, []);

  /* ---- Session restore + expiry handling ---- */
  useEffect(() => {
    let active = true;

    const expired = () => {
      setUser(null);
      location.hash = 'login';
      setNotice('Your session expired. Please sign in again.');
    };

    window.addEventListener('clinic-session-expired', expired);

    async function restore() {
      try {
        if (restoreSession()) {
          const data = await api('/auth/me');
          if (active) setUser(data.user);
        }
      } catch (e) {
        if (e.status === 401 || e.status === 403) clearSession();
        if (active) setNotice(e.message);
      } finally {
        if (active) setRestoring(false);
      }
    }

    restore();

    return () => {
      active = false;
      window.removeEventListener('clinic-session-expired', expired);
    };
  }, []);

  /* ---- Scroll behaviour on route change ---- */
  useEffect(() => {
    if (isLogin || route === '#home') {
      window.scrollTo(0, 0);
    } else {
      requestAnimationFrame(() =>
        document.getElementById(route.slice(1))?.scrollIntoView({ behavior: 'smooth' })
      );
    }
  }, [route, isLogin]);

  /* ---- Auth actions ---- */
  async function signIn(e) {
    e.preventDefault();
    if (authBusy) return;

    const form = e.currentTarget;
    setAuthBusy(true);
    setNotice('');

    try {
      const values = Object.fromEntries(new FormData(form));
      setUser(await login(values, isRegister));
      form.reset();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    try {
      await logout();
    } catch (e) {
      alert(
        'Signed out on this device. Server logout failed; the session may remain active until it expires.'
      );
    } finally {
      setUser(null);
      location.hash = 'login';
    }
  }

  const book = () => {
    location.hash = 'login';
    setNotice('Sign in to book an appointment.');
  };

  /* ---- Early returns ---- */
  if (restoring) {
    return (
      <main className="wrap">
        <p role="status">Checking your session…</p>
      </main>
    );
  }

  if (user) return <LivePanel user={user} onLogout={signOut} />;

  /* ---- Render ---- */
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>

      {/* ============================== HEADER ============================== */}
      <header>
        <div className="nav wrap">
          <a href="#home" className="brand">
            <span className="logo">
              {ASSETS.logo ? (
                <img src={ASSETS.logo} alt="Clinic logo" />
              ) : (
                <span>
                  YOUR
                  <br />
                  LOGO
                </span>
              )}
            </span>
            Calapan City Health Clinic
          </a>

          <button
            className="menu-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>

          <nav className={menu ? 'open' : ''} aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#location">Clinic location</a>
            {!isLogin && <a href="#schedules">Doctors & schedules</a>}
            <a href="#login" aria-current={isLogin ? 'page' : undefined}>
              Login
            </a>
          </nav>

          <a className="nav-phone" href="tel:0432884417">
            <Icon name="phone" size={15} />
            (043) 288-4417
          </a>

          <button className="button small" onClick={book}>
            Book appointment
          </button>
        </div>
      </header>

      {/* =============================== MAIN =============================== */}
      <main id="main">
        {isLogin ? (
          /* ---------------------- LOGIN / REGISTER ---------------------- */
          <section className="login wrap">
            <div className="login-story">
              <span className="logo">
                {ASSETS.logo ? (
                  <img src={ASSETS.logo} alt="Clinic logo" />
                ) : (
                  <span>
                    YOUR
                    <br />
                    LOGO
                  </span>
                )}
              </span>
              <h1>Sign in to your clinic account</h1>
              <p>
                Patients manage bookings and QR tickets. Clinic staff run the queue and
                schedules. Doctors view appointments, manage their queue and update visit
                records.
              </p>
              <ul className="benefits">
                <li>One account for every clinic visit</li>
                <li>QR ticket and queue number in your pocket</li>
                <li>Records visible only to you and your doctor</li>
              </ul>
              <small>Calapan City Health & Sanitation Department · Oriental Mindoro</small>
            </div>

            <div className="login-form">
              <h2>{isRegister ? 'Create a patient account' : 'Sign in'}</h2>
              <p>
                {isRegister
                  ? 'Register to book your first clinic visit.'
                  : 'Use your clinic account email and password.'}
              </p>

              <form onSubmit={signIn}>
                {isRegister && (
                  <>
                    <label htmlFor="name">FULL NAME</label>
                    <input
                      id="name"
                      name="name"
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                    />
                  </>
                )}

                <label htmlFor="email">EMAIL ADDRESS</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  required
                />

                <label htmlFor="password">PASSWORD</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder="Enter your password"
                  minLength={isRegister ? 8 : undefined}
                  required
                />

                <p className="demo-note">
                  Your session is kept in this browser tab. Sign out when using a shared
                  computer.
                </p>

                <button className="button full" disabled={authBusy}>
                  {authBusy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}{' '}
                  <span>→</span>
                </button>
              </form>

              <div className="or-divider" aria-hidden="true">
                <span>or</span>
              </div>
              <GoogleLoginButton
                text={isRegister ? 'signup_with' : 'signin_with'}
                onSuccess={(u) => {
                  setNotice('');
                  setUser(u);
                }}
                onError={(e) => setNotice(e.message)}
              />

              {notice && (
                <div className="notice" role="alert">
                  {notice}
                </div>
              )}

              <div className="new-patient">
                {isRegister ? (
                  <a href="#login">Already registered? Sign in</a>
                ) : (
                  <a href="#register">New patient? Create an account</a>
                )}
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* ------------------------- HERO ------------------------- */}
            <section className="hero wrap" id="home">
              <div className="hero-copy">
                <span className="eyebrow">✧ CITY HEALTH OFFICE · CALAPAN CITY</span>
                <h1>
                  Good health,
                  <br />
                  looked after
                  <br />
                  by your own
                  <br />
                  city clinic.
                </h1>
                <p>
                  Reserve a slot before you leave the house, walk in with your queue number
                  already assigned, and keep every consultation, laboratory result and
                  prescription in one record.
                </p>

                <div className="actions">
                  <button className="button" onClick={book}>
                    <Icon name="calendar" size={17} />
                    Book an appointment
                  </button>
                  <a className="button outline" href="#location">
                    <Icon name="pin" size={17} />
                    Clinic location
                  </a>
                </div>

                <div className="pills">
                  {[
                    'Free for Calapan City residents',
                    'QR queue ticket on every booking',
                    'Walk-ins still accommodated',
                  ].map((t) => (
                    <span key={t}>
                      <b>✓</b> {t}
                    </span>
                  ))}
                </div>

                <small>
                  <Icon name="clock" size={14} /> Open Monday to Saturday · Check-in from 8:00
                  AM
                </small>
              </div>

              <Photo
                file="hero"
                source={[1066, 843]}
                box={[543, 162, 369, 550]}
                alt="Doctor speaking with a patient"
                className="hero-photo"
              />
            </section>

            {/* ------------------------ SERVICES ------------------------ */}
            <section className="section wrap" id="services">
              <div className="section-heading">
                <h2 className="marked">
                  Care for every
                  <br />
                  member of the family
                </h2>
                <div>
                  <p>
                    From a child's first vaccination to a lolo's maintenance check for
                    hypertension and diabetes — the City Health Office covers the everyday
                    care that keeps a household healthy.
                  </p>
                  <small>
                    <span className="stars">★★★★★</span> 4.9 / 5 from 1,240 patient reviews{' '}
                    <span className="sample">(sample)</span>
                  </small>
                </div>
              </div>

              <div className="service-grid">
                {services.map(([title, description, box]) => (
                  <article className="service-card" key={title}>
                    <a
                      href="#schedules"
                      aria-label={`See ${title} schedule`}
                      className="service-image"
                    >
                      <Photo
                        file={`service${services.findIndex((item) => item[0] === title) + 1}`}
                        box={box}
                        alt={title}
                      />
                      <span className="arrow">→</span>
                    </a>
                    <div className="service-content">
                      <h3>{title}</h3>
                      <p>{description}</p>
                      <a href="#schedules">See the schedule →</a>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* ------------------------ RECORDS ------------------------ */}
            <section className="tinted">
              <div className="section wrap records">
                <div className="records-image">
                  <Photo
                    file="records"
                    source={[1009, 724]}
                    box={[119, 201, 345, 345]}
                    alt="Clinic staff maintaining patient records"
                  />
                  <div className="floating-card">
                    <Icon name="shield" />
                    <div>
                      City Health Office
                      <small>Records kept confidential</small>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="marked">
                    A clinic that remembers
                    <br />
                    your whole history.
                  </h2>
                  <p>
                    Every visit is written into your record — the doctor who saw you, what was
                    diagnosed, the laboratory results and the medicines given. Next time you
                    walk in, that record is already open on the screen, so the conversation
                    starts where it left off instead of from a blank page.
                  </p>

                  <ul className="checks">
                    <li>Last check-up date, diagnosis and lab results in one record</li>
                    <li>QR check-in at the door — no crowding at the counter</li>
                    <li>Laboratory tests covered by city health programs</li>
                    <li>Records visible only to you and your attending doctor</li>
                  </ul>

                  <button className="button" onClick={book}>
                    Book an appointment →
                  </button>

                  <div className="doctor-cards">
                    {[
                      ['LS', 'Dr. Maria L. Santos', 'General Medicine · Room 3'],
                      ['PR', 'Dr. Jose P. Rivera', 'Pediatrics · Room 1'],
                    ].map(([initial, name, desc]) => (
                      <div key={name}>
                        <span className="avatar">{initial}</span>
                        <div>
                          <strong>{name}</strong>
                          <small>{desc}</small>
                          <small>
                            <span className="stars">★</span> 4.9 · Sample profile
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ------------------------- STATS ------------------------- */}
            <section className="wrap stats" aria-label="Sample clinic statistics">
              {[
                ['24,800+', 'Patient visits recorded'],
                ['14', 'Doctors on duty each week'],
                ['4.9 / 5', 'Average patient rating'],
                ['12 min', 'Average wait after check-in'],
              ].map(([num, label], i) => (
                <div key={num}>
                  <span className="round orange">
                    <Icon name={['user', 'stethoscope', 'shield', 'clock'][i]} />
                  </span>
                  <div>
                    <strong>{num}</strong>
                    <small>{label}</small>
                  </div>
                </div>
              ))}
              <span className="stats-note">Sample figures from the design</span>
            </section>

            {/* -------------------------- STEPS -------------------------- */}
            <section className="tinted">
              <div className="section wrap">
                <div className="center-heading">
                  <h2 className="marked">
                    Three steps from your phone
                    <br />
                    to the consultation room
                  </h2>
                  <p>
                    No forms at the counter, no guessing when your turn is coming. The whole
                    <br className="desktop" /> visit is tracked from the moment you book.
                  </p>
                </div>

                <div className="steps">
                  {[
                    [
                      'calendar',
                      'Book online in a minute',
                      'Pick a doctor, date and time. Only available slots appear, so you can choose an appointment that fits your day.',
                    ],
                    [
                      'qr',
                      'Keep your QR queue ticket',
                      'Your appointment and QR code are saved in your account. Keep a screenshot or open your ticket when you arrive.',
                    ],
                    [
                      'stethoscope',
                      'Check in and get seen',
                      'Staff scan your ticket at the door. The doctor opens your record, and the visit is saved to your history.',
                    ],
                  ].map(([icon, title, body], i) => (
                    <article key={title}>
                      <span className="step-number">0{i + 1}</span>
                      <span className="soft-icon">
                        <Icon name={icon} />
                      </span>
                      <h3>{title}</h3>
                      <p>{body}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* ------------------------ SCHEDULES ------------------------ */}
            <section className="section wrap" id="schedules">
              <h2 className="marked">Doctors on duty this week</h2>
              <p>
                Each schedule carries a fixed number of slots, so a session closes by itself
                once it is full.
              </p>
              <p className="sample">
                Sample schedules from the design — confirm actual availability with the clinic.
              </p>

              <div className="schedule-table">
                {schedules.map(([day, doctors]) => (
                  <div className="schedule-day" key={day}>
                    <strong>{day}</strong>
                    <div>
                      {doctors.map(([time, name, desc]) => (
                        <div className="schedule-row" key={name}>
                          <span>
                            <Icon name="clock" size={14} />
                            {time}
                          </span>
                          <div>
                            <b>{name}</b>
                            <small>{desc}</small>
                          </div>
                          <button className="text-button schedule-book" onClick={book}>
                            Book →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* --------------------------- FAQ --------------------------- */}
            <section className="tinted">
              <div className="section wrap faq">
                <h2 className="marked">
                  Frequently
                  <br />
                  asked questions
                </h2>
                <div>
                  {faqs.map(([q, a]) => (
                    <details key={q}>
                      <summary>
                        {q}
                        <span>+</span>
                      </summary>
                      <p>{a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>

            {/* ------------------------ LOCATION ------------------------ */}
            <section className="section wrap location" id="location">
              <div>
                <h2 className="marked">Find the clinic</h2>
                <p>
                  The City Health Office sits inside the Calapan City Hall compound, a short
                  walk from the main entrance.
                </p>

                <div className="address">
                  <Icon name="pin" />
                  <strong>
                    City Health Office, Calapan City Hall Compound, Calapan City, Oriental
                    Mindoro
                  </strong>
                </div>

                <div className="hours">
                  {[
                    ['Monday – Friday', '8:00 AM – 5:00 PM'],
                    ['Saturday', '8:00 AM – 12:00 NN'],
                    ['Sunday & holidays', 'Closed'],
                  ].map(([day, time]) => (
                    <div key={day}>
                      <strong>
                        <Icon name="clock" size={16} />
                        {day}
                      </strong>
                      <span>{time}</span>
                    </div>
                  ))}
                </div>

                <small className="muted">
                  Walk-in patients are accommodated from 8:00 AM. On your first visit, bring a
                  valid ID and your PhilHealth number if you have one.
                </small>
              </div>

              <ClinicMap />
            </section>

            {/* ---------------------------- CTA ---------------------------- */}
            <section className="wrap cta">
              <div>
                <span className="eyebrow">YOUR CITY. YOUR CARE.</span>
                <h2>
                  Your next check-up
                  <br />
                  is one tap away.
                </h2>
                <p>
                  Reserve a slot before you travel, walk in with your number already
                  assigned, and leave with your prescription and medical certificate in hand.
                </p>

                <div className="actions">
                  <button className="button" onClick={book}>
                    Book an appointment →
                  </button>
                  <a className="button outline" href="tel:0432884417">
                    <Icon name="phone" size={16} />
                    Contact the clinic
                  </a>
                </div>
              </div>

              <Photo
                file="reception"
                box={[119, 201, 345, 345]}
                alt="Calapan clinic reception staff"
              />
            </section>
          </>
        )}
      </main>

      {/* ============================== FOOTER ============================== */}
      <footer>
        <div className="wrap footer-grid">
          <div>
            <a href="#home" className="footer-brand">
              Calapan City Health Clinic
            </a>
            <p>
              Calapan City Health and Sanitation Department
              <br />
              In-person care, appointments, QR queueing and patient records for every
              resident.
            </p>
            <a href="tel:0432884417">(043) 288-4417</a>
            <p>
              City Health Office, Calapan City Hall Compound,
              <br />
              Calapan City, Oriental Mindoro
            </p>
          </div>

          <div className="footer-links">
            <a href="#home">Home</a>
            <button onClick={book}>Book appointment</button>
            <a href="#schedules">Doctors & schedules</a>
            <a href="#location">Clinic location</a>
            <a href="#login">Login</a>
          </div>

          <div>
            <p>
              Monday – Friday <b>8:00 AM – 5:00 PM</b>
            </p>
            <p>
              Saturday <b>8:00 AM – 12:00 NN</b>
            </p>
            <p>
              Sunday & holidays <b>Closed</b>
            </p>
          </div>
        </div>

        <div className="wrap footer-bottom">
          © {new Date().getFullYear()} Calapan City Health Clinic{' '}
          <span>Clinic information subject to confirmation</span>
        </div>
      </footer>

      {/* ========================== CONTACT PANEL =========================== */}
      {chat && (
        <aside className="chat" aria-label="Contact the clinic">
          <div>
            <strong>Talk with the clinic</strong>
            <button aria-label="Close contact panel" onClick={() => setChat(false)}>
              ×
            </button>
          </div>
          <p>For appointment and clinic questions, call during office hours.</p>
          <a className="button" href="tel:0432884417">
            <Icon name="phone" size={16} />
            (043) 288-4417
          </a>
          <p className="sample">This preview does not send chat messages.</p>
        </aside>
      )}

      <button className="chat-toggle" aria-expanded={chat} onClick={() => setChat(!chat)}>
        <Icon name="stethoscope" />
        Talk with Us
      </button>
    </>
  );
}
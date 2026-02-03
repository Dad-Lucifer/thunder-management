import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { FaClock, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { FaPlaystation, FaDesktop, FaVrCardboard } from 'react-icons/fa';
import { GiSteeringWheel, GiCricketBat } from 'react-icons/gi';
import BookingModal from './BookingModal';

/* ---------------------------------------
   Types
--------------------------------------- */
type DeviceType = 'ps' | 'pc' | 'vr' | 'wheel' | 'metabat';

interface Booking {
  id: string;
  name: string;
  time: string;
  devices: DeviceType[];
}

const UpcomingBookings = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);


  /* ---------------------------------------
     Scroll Controls (UNCHANGED)
  --------------------------------------- */
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  /* ---------------------------------------
     Fetch Upcoming Bookings
  --------------------------------------- */
 const fetchBookings = async () => {
  try {
    const res = await axios.get(
      'http://localhost:5000/api/sessions/upcoming'
    );
    setBookings(res.data);
  } catch (error) {
    console.error('Failed to load upcoming bookings', error);
  } finally {
    setLoading(false);
  }
};
useEffect(() => {
  fetchBookings();
}, []);


  /* ---------------------------------------
     JSX (UI UNCHANGED)
  --------------------------------------- */
  return (
    <section className="upcoming-section">
      <div className="section-header">
        <h3 className="section-title">Upcoming Bookings</h3>
        <div className="nav-controls">
          <button className="nav-btn" onClick={() => scroll('left')}>
            <FaChevronLeft />
          </button>
          <button className="nav-btn" onClick={() => scroll('right')}>
            <FaChevronRight />
          </button>
        </div>
        <button
  className="btn-primary"
  onClick={() => setShowModal(true)}
>
  New Booking
</button>

      </div>

      <div className="bookings-scroller" ref={scrollRef}>
        {loading && (
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        )}

        {!loading && bookings.map((booking) => (
          <div key={booking.id} className="booking-card">
            <div className="booking-time">
              <FaClock className="clock-icon" />
              <span>{booking.time}</span>
            </div>

            <div className="booking-info">
              <span className="booking-name">{booking.name}</span>

              <div
                className="booking-devices"
                style={{ display: 'flex', gap: '4px', marginTop: '4px' }}
              >
                {booking.devices.map((d, i) => (
                  <span key={i} style={{ color: 'var(--text-secondary)' }}>
                    {d === 'ps' && <FaPlaystation size={12} />}
                    {d === 'pc' && <FaDesktop size={12} />}
                    {d === 'vr' && <FaVrCardboard size={12} />}
                    {d === 'wheel' && <GiSteeringWheel size={12} />}
                    {d === 'metabat' && <GiCricketBat size={12} />}
                  </span>
                ))}
              </div>
            </div>

            <div className="decoration-bar"></div>
          </div>
        ))}

       {showModal && (
  <BookingModal
    onClose={() => setShowModal(false)}
    onSuccess={() => {
      setShowModal(false);
      fetchBookings(); // refresh list properly
    }}
  />
)}


      </div>

      {/* 🔥 ORIGINAL STYLES — UNCHANGED */}
      <style>{`
        .upcoming-section {
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .nav-controls {
          display: flex;
          gap: 10px;
        }

        .nav-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: var(--text-primary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .nav-btn:hover {
          background: var(--accent-yellow);
          color: #000;
        }

        .bookings-scroller {
          display: flex;
          overflow-x: auto;
          gap: 1.5rem;
          padding-bottom: 1rem;
          scrollbar-width: none;
        }
        .bookings-scroller::-webkit-scrollbar {
          display: none;
        }

        .booking-card {
          min-width: 240px;
          background: linear-gradient(
            145deg,
            rgba(26, 60, 94, 0.4),
            rgba(15, 22, 35, 0.8)
          );
          border-radius: 12px;
          padding: 1.25rem;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .booking-time {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent-yellow);
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 0.75rem;
        }

        .booking-name {
          display: block;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .booking-devices {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .decoration-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(
            90deg,
            var(--accent-yellow),
            transparent
          );
        }
      `}</style>
    </section>
  );
};

export default UpcomingBookings;

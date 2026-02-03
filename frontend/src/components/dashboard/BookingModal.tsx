import { useState } from 'react';
import {
  FaPlaystation,
  FaDesktop,
  FaVrCardboard,
  FaTimes
} from 'react-icons/fa';
import { GiSteeringWheel, GiCricketBat } from 'react-icons/gi';
import axios from 'axios';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const BookingModal = ({ onClose, onSuccess }: Props) => {
  const [form, setForm] = useState({
    customerName: '',
    bookingTime: '',
    devices: {
      ps: 0,
      pc: 0,
      vr: 0,
      wheel: 0,
      metabat: 0
    }
  });

  const updateDevice = (key: keyof typeof form.devices, value: number) => {
    setForm(prev => ({
      ...prev,
      devices: { ...prev.devices, [key]: value }
    }));
  };

  const createBooking = async () => {
  if (!form.customerName || !form.bookingTime) {
    alert('Customer name and booking time are required');
    return;
  }

  try {
    await axios.post('http://localhost:5000/api/sessions/booking', {
      ...form,
      bookingTime: new Date(form.bookingTime).toISOString()
    });

    onSuccess();
    onClose();
  } catch (error) {
    console.error(error);
    alert('Failed to create booking');
  }
};


  return (
    <div className="modal-overlay">
      <div className="cyber-card modal-card">
        <div className="modal-header">
          <h3>New Booking</h3>
          <button onClick={onClose}><FaTimes /></button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="input-group full-width">
              <label>Customer Name</label>
              <input
                className="input-field"
                value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
              />
            </div>

            <div className="input-group full-width">
              <label>Booking Time</label>
              <input
                type="datetime-local"
                className="input-field"
                value={form.bookingTime}
                onChange={e => setForm({ ...form, bookingTime: e.target.value })}
              />
            </div>
          </div>

          <h4 className="subsection-title">Device Allocation</h4>
          <div className="devices-grid">
            <Device label="PS5" icon={<FaPlaystation />} value={form.devices.ps}
              onChange={v => updateDevice('ps', v)} />
            <Device label="PC" icon={<FaDesktop />} value={form.devices.pc}
              onChange={v => updateDevice('pc', v)} />
            <Device label="VR" icon={<FaVrCardboard />} value={form.devices.vr}
              onChange={v => updateDevice('vr', v)} />
            <Device label="Wheel" icon={<GiSteeringWheel />} value={form.devices.wheel}
              onChange={v => updateDevice('wheel', v)} />
            <Device label="Meta Bat" icon={<GiCricketBat />} value={form.devices.metabat}
              onChange={v => updateDevice('metabat', v)} />
          </div>

          <div className="action-row">
            <button className="btn-primary" onClick={createBooking}>
              Create Booking
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 200;
        }

        .modal-card {
          width: 520px;
          max-width: 90%;
          padding: 1.5rem;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .modal-header button {
          background: none;
          border: none;
          color: var(--text-muted);
        }

        .devices-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  );
};

const Device = ({
  label,
  icon,
  value,
  onChange
}: {
  label: string;
  icon: JSX.Element;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="device-input">
    <span className="icon-label">{icon} {label}</span>
    <input
      type="number"
      className="input-field small"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    />
  </div>
);

export default BookingModal;

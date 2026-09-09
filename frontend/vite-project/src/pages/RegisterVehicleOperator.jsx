/**
 * RegisterVehicleOperator.jsx
 * Admin-only form to register a vehicle operator.
 * TODO: confirm exact License & Vehicle fields with product team.
 * No backend wiring yet — local state mock store.
 */
import { useState, useRef } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DigitalIdCard } from '../components/personnel/DigitalIdCard';
import { Camera, User, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

// TODO: confirm exact fields for this section
const INITIAL = {
  // Personal
  firstName: '', lastName: '', dob: '', gender: '',
  photoUrl: null,
  // License & Vehicle — TODO: confirm exact fields
  licenseNumber: '', vehicleRegNumber: '', vehicleType: '', assignedRoute: '',
  // Contact
  officialEmail: '', mobileNumber: '', emergencyContact: '',
  // Account
  userId: '', tempPassword: '', role: 'Vehicle Operator', accountStatus: 'Active',
};

const REQUIRED = ['firstName','lastName','licenseNumber','vehicleRegNumber','vehicleType',
                  'officialEmail','mobileNumber','userId','tempPassword','role','accountStatus'];

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
    {children}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
  </label>
);
const Input   = ({ ...p }) => <input {...p} className="form-control" style={{ width: '100%', fontSize: '0.88rem', ...p.style }} />;
const Select  = ({ children, ...p }) => <select {...p} className="form-control" style={{ width: '100%', fontSize: '0.88rem', ...p.style }}>{children}</select>;
const Section = ({ children }) => (
  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--sky-dark)', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 14, paddingBottom: 6, borderBottom: '2px solid var(--sky-tint-2)' }}>
    {children}
  </div>
);

export const RegisterVehicleOperator = () => {
  const [form, setForm]     = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [editMode,  setEditMode]  = useState(false);
  const [records,   setRecords]   = useState([]);
  const fileRef = useRef(null);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errors[k]) setErrors(e => ({ ...e, [k]: null })); };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) set('photoUrl', URL.createObjectURL(file));
  };

  const validate = () => {
    const errs = {};
    REQUIRED.forEach(k => { if (!form[k]?.trim?.()) errs[k] = 'Required'; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please fill all required fields.'); return; }
    const person = { ...form, id: form.userId };
    if (editMode) {
      setRecords(r => r.map(p => p.id === person.id ? person : p));
      toast.success('Record updated.');
    } else {
      setRecords(r => [...r, person]);
      toast.success('Vehicle operator registered.');
    }
    setSubmitted(person);
    setEditMode(false);
  };

  const handleEdit = (person) => { setForm(person); setSubmitted(null); setEditMode(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleDeleteConfirm = () => {
    setRecords(r => r.map(p => p.id === submitted.id ? { ...p, accountStatus: 'Pending Deletion' } : p));
    setSubmitted(s => ({ ...s, accountStatus: 'Pending Deletion' }));
  };

  if (submitted && !editMode) {
    return (
      <div>
        <PageHeader title="Register Vehicle Operator" description="Government personnel registration — admin only." />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, marginBottom: 16,
            background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 8, padding: '10px 16px' }}>
            ✓ Registration complete. Digital ID card generated below.
          </div>
          <DigitalIdCard person={submitted} role="operator" onEdit={() => handleEdit(submitted)} onDeleteConfirm={handleDeleteConfirm} />
        </div>
        <button className="btn btn-secondary" onClick={() => { setForm(INITIAL); setSubmitted(null); setErrors({}); }}>
          + Register Another
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={editMode ? 'Edit Vehicle Operator' : 'Register Vehicle Operator'}
        description="Create a government-issued account for a vehicle operator. Fields marked * are required."
      />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Personal Details */}
        <div className="card">
          <Section>Personal Details</Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            <div><Label required>First Name</Label>
              <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name"
                style={{ borderColor: errors.firstName ? 'var(--danger)' : undefined }} /></div>
            <div><Label required>Last Name</Label>
              <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name"
                style={{ borderColor: errors.lastName ? 'var(--danger)' : undefined }} /></div>
            <div><Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} /></div>
            <div><Label>Gender</Label>
              <Select value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
              </Select></div>
          </div>
          {/* Photo */}
          <div style={{ marginTop: 16 }}>
            <Label>Profile Photo</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {form.photoUrl
                ? <img src={form.photoUrl} alt="Preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--sky-tint-2)' }} />
                : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sky-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--sky-tint-2)' }}><User size={24} color="var(--slate)" /></div>
              }
              <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={14} /> {form.photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
          </div>
        </div>

        {/* License & Vehicle — TODO: confirm exact fields */}
        <div className="card">
          <Section>License &amp; Vehicle Details</Section>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate)', marginBottom: 12, fontStyle: 'italic' }}>
            {/* TODO: confirm exact fields with product team */}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            <div><Label required>Driving License Number</Label>
              {/* TODO: confirm format validation */}
              <Input value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} placeholder="DL-XXXXXXXXXX"
                style={{ borderColor: errors.licenseNumber ? 'var(--danger)' : undefined }} /></div>
            <div><Label required>Vehicle Registration Number</Label>
              {/* TODO: confirm vehicle reg number format */}
              <Input value={form.vehicleRegNumber} onChange={e => set('vehicleRegNumber', e.target.value)} placeholder="AS-XX-XXXX"
                style={{ borderColor: errors.vehicleRegNumber ? 'var(--danger)' : undefined }} /></div>
            <div><Label required>Vehicle Type</Label>
              {/* TODO: confirm vehicle type list */}
              <Select value={form.vehicleType} onChange={e => set('vehicleType', e.target.value)}
                style={{ borderColor: errors.vehicleType ? 'var(--danger)' : undefined }}>
                <option value="">Select</option>
                <option>Truck</option><option>Van</option><option>Ambulance</option>
                <option>SUV</option><option>Other</option>
              </Select></div>
            <div><Label>Assigned Route or Depot (optional)</Label>
              {/* TODO: confirm route/depot list */}
              <Input value={form.assignedRoute} onChange={e => set('assignedRoute', e.target.value)} placeholder="e.g. Haflong–Silchar" /></div>
          </div>
        </div>

        {/* Contact */}
        <div className="card">
          <Section>Contact Details</Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            <div><Label required>Official Email</Label>
              <Input type="email" value={form.officialEmail} onChange={e => set('officialEmail', e.target.value)} placeholder="operator@gov.in"
                style={{ borderColor: errors.officialEmail ? 'var(--danger)' : undefined }} /></div>
            <div><Label required>Official Mobile Number</Label>
              <Input type="tel" value={form.mobileNumber} onChange={e => set('mobileNumber', e.target.value)} placeholder="+91 XXXXX XXXXX"
                style={{ borderColor: errors.mobileNumber ? 'var(--danger)' : undefined }} /></div>
            <div><Label>Emergency Contact (optional)</Label>
              <Input type="tel" value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="+91 XXXXX XXXXX" /></div>
          </div>
        </div>

        {/* Account */}
        <div className="card">
          <Section>Account Details</Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            <div><Label required>System User ID</Label>
              <Input value={form.userId} onChange={e => set('userId', e.target.value)} placeholder="e.g. VOP-2317"
                style={{ borderColor: errors.userId ? 'var(--danger)' : undefined }} /></div>
            <div><Label required>Temporary Password</Label>
              <Input type="password" value={form.tempPassword} onChange={e => set('tempPassword', e.target.value)} placeholder="Temporary password"
                style={{ borderColor: errors.tempPassword ? 'var(--danger)' : undefined }} /></div>
            <div><Label required>Role</Label>
              <Select value={form.role} onChange={e => set('role', e.target.value)}>
                <option>Vehicle Operator</option>
              </Select></div>
            <div><Label required>Account Status</Label>
              <Select value={form.accountStatus} onChange={e => set('accountStatus', e.target.value)}>
                <option>Active</option><option>Inactive</option><option>Pending</option>
              </Select></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px' }}>
            {editMode ? 'Save Changes' : 'Register Operator'} <ChevronRight size={15} />
          </button>
          {editMode && (
            <button type="button" className="btn btn-secondary" onClick={() => { setEditMode(false); setSubmitted(records.at(-1) ?? null); }}>Cancel</button>
          )}
        </div>
      </form>
    </div>
  );
};

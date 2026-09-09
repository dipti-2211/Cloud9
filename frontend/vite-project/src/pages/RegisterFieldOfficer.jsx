/**
 * RegisterFieldOfficer.jsx
 * Admin-only form to register a government field officer.
 * No backend wiring yet — stores submissions in local state.
 */
import { useState, useRef } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { DigitalIdCard } from '../components/personnel/DigitalIdCard';
import { Camera, User, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const INITIAL = {
  // Personal
  firstName: '', lastName: '', dob: '', gender: '',
  photoUrl: null,
  // Employment
  employeeId: '', department: '', designation: '', office: '',
  state: '', district: '', postingLocation: '',
  // Contact
  officialEmail: '', mobileNumber: '', emergencyContact: '',
  // Account
  userId: '', tempPassword: '', role: 'Field Officer', accountStatus: 'Active',
};

const REQUIRED = ['firstName','lastName','employeeId','department','designation','office',
                  'state','district','postingLocation','officialEmail','mobileNumber',
                  'userId','tempPassword','role','accountStatus'];

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
    {children}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
  </label>
);

const Input = ({ ...props }) => (
  <input {...props} className="form-control" style={{ width: '100%', fontSize: '0.88rem', ...props.style }} />
);

const Select = ({ children, ...props }) => (
  <select {...props} className="form-control" style={{ width: '100%', fontSize: '0.88rem', ...props.style }}>
    {children}
  </select>
);

const SectionHeading = ({ children }) => (
  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--sky-dark)', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 14, paddingBottom: 6, borderBottom: '2px solid var(--sky-tint-2)' }}>
    {children}
  </div>
);

export const RegisterFieldOfficer = () => {
  const [form, setForm]       = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [submitted, setSubmitted] = useState(null); // holds the saved person object
  const [editMode, setEditMode]   = useState(false);
  const [records, setRecords]     = useState([]);   // mock store
  const fileRef = useRef(null);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: null }));
  };

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
      toast.success('Field officer registered.');
    }
    setSubmitted(person);
    setEditMode(false);
  };

  const handleEdit = (person) => {
    setForm(person);
    setSubmitted(null);
    setEditMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteConfirm = () => {
    setRecords(r => r.map(p =>
      p.id === submitted.id ? { ...p, accountStatus: 'Pending Deletion' } : p
    ));
    setSubmitted(s => ({ ...s, accountStatus: 'Pending Deletion' }));
  };

  // ── Render submitted card ──
  if (submitted && !editMode) {
    return (
      <div>
        <PageHeader title="Register Field Officer" description="Government personnel registration — admin only." />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, marginBottom: 16,
            background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 8, padding: '10px 16px' }}>
            ✓ Registration complete. Digital ID card generated below.
          </div>
          <DigitalIdCard
            person={submitted}
            role="officer"
            onEdit={() => handleEdit(submitted)}
            onDeleteConfirm={handleDeleteConfirm}
          />
        </div>
        <button className="btn btn-secondary" onClick={() => { setForm(INITIAL); setSubmitted(null); setErrors({}); }}>
          + Register Another
        </button>

        {records.length > 1 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>All Registered Officers ({records.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {records.map(p => (
                <DigitalIdCard key={p.id} person={p} role="officer"
                  onEdit={() => handleEdit(p)}
                  onDeleteConfirm={() => {
                    setRecords(r => r.map(x => x.id === p.id ? { ...x, accountStatus: 'Pending Deletion' } : x));
                  }} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div>
      <PageHeader
        title={editMode ? 'Edit Field Officer' : 'Register Field Officer'}
        description="Create a government-issued account for a field officer. Fields marked * are required."
      />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Personal Details ── */}
        <div className="card">
          <SectionHeading>Personal Details</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            <div>
              <Label required>First Name</Label>
              <Input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                placeholder="First name" style={{ borderColor: errors.firstName ? 'var(--danger)' : undefined }} />
            </div>
            <div>
              <Label required>Last Name</Label>
              <Input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                placeholder="Last name" style={{ borderColor: errors.lastName ? 'var(--danger)' : undefined }} />
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </Select>
            </div>
          </div>

          {/* Photo upload */}
          <div style={{ marginTop: 16 }}>
            <Label>Profile Photo</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Preview"
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--sky-tint-2)' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sky-tint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--sky-tint-2)' }}>
                  <User size={24} color="var(--slate)" />
                </div>
              )}
              <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Camera size={14} /> {form.photoUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
          </div>
        </div>

        {/* ── Government / Employment Details ── */}
        <div className="card">
          <SectionHeading>Government / Employment Details</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            {[
              { key: 'employeeId',      label: 'Employee / Government ID', req: true },
              { key: 'department',      label: 'Department',              req: true },
              { key: 'designation',     label: 'Designation',             req: true },
              { key: 'office',          label: 'Office / Organization',   req: true },
              { key: 'state',           label: 'State',                   req: true },
              { key: 'district',        label: 'District',                req: true },
              { key: 'postingLocation', label: 'Posting Location',        req: true },
            ].map(({ key, label, req }) => (
              <div key={key}>
                <Label required={req}>{label}</Label>
                <Input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={label}
                  style={{ borderColor: errors[key] ? 'var(--danger)' : undefined }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Contact Details ── */}
        <div className="card">
          <SectionHeading>Contact Details</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            <div>
              <Label required>Official Email</Label>
              <Input type="email" value={form.officialEmail} onChange={e => set('officialEmail', e.target.value)}
                placeholder="officer@gov.in" style={{ borderColor: errors.officialEmail ? 'var(--danger)' : undefined }} />
            </div>
            <div>
              <Label required>Official Mobile Number</Label>
              <Input type="tel" value={form.mobileNumber} onChange={e => set('mobileNumber', e.target.value)}
                placeholder="+91 XXXXX XXXXX" style={{ borderColor: errors.mobileNumber ? 'var(--danger)' : undefined }} />
            </div>
            <div>
              <Label>Emergency Contact (optional)</Label>
              <Input type="tel" value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)}
                placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>
        </div>

        {/* ── Account Details ── */}
        <div className="card">
          <SectionHeading>Account Details</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16 }}>
            <div>
              <Label required>System User ID</Label>
              <Input value={form.userId} onChange={e => set('userId', e.target.value)}
                placeholder="e.g. OFC-1042" style={{ borderColor: errors.userId ? 'var(--danger)' : undefined }} />
            </div>
            <div>
              <Label required>Temporary Password</Label>
              <Input type="password" value={form.tempPassword} onChange={e => set('tempPassword', e.target.value)}
                placeholder="Temporary password" style={{ borderColor: errors.tempPassword ? 'var(--danger)' : undefined }} />
            </div>
            <div>
              <Label required>Role</Label>
              <Select value={form.role} onChange={e => set('role', e.target.value)}>
                <option>Field Officer</option>
                <option>Admin</option>
                <option>Supervisor</option>
              </Select>
            </div>
            <div>
              <Label required>Account Status</Label>
              <Select value={form.accountStatus} onChange={e => set('accountStatus', e.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
                <option>Pending</option>
              </Select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px' }}>
            {editMode ? 'Save Changes' : 'Register Officer'} <ChevronRight size={15} />
          </button>
          {editMode && (
            <button type="button" className="btn btn-secondary" onClick={() => { setEditMode(false); setSubmitted(records.at(-1) ?? null); }}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

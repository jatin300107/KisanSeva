import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

type Role = 'farmer' | 'vet' | 'agrologist';

const roleOptions: { value: Role; label: string }[] = [
  { value: 'farmer',     label: 'Farmer' },
  { value: 'vet',        label: 'Veterinary Expert' },
  { value: 'agrologist', label: 'Agrologist' },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: Role;
}

export default function SignupForm() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'farmer',
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, phone, password, confirmPassword, role } = form;
    if (!name || !email || !phone || !password) { setError('All fields are required'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      await signup({ name, email, phone, password, role });
      navigate('/login', { state: { message: 'Account created! Please sign in.' } });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e?.response?.data?.detail || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <Input
        label="Full Name"
        id="signup-name"
        type="text"
        placeholder="Ramesh Kumar"
        value={form.name}
        onChange={set('name')}
        icon={<User size={16} />}
      />
      <Input
        label="Email"
        id="signup-email"
        type="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={set('email')}
        icon={<Mail size={16} />}
      />
      <Input
        label="Phone"
        id="signup-phone"
        type="tel"
        placeholder="+91 98765 43210"
        value={form.phone}
        onChange={set('phone')}
        icon={<Phone size={16} />}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signup-role" className="text-sm font-medium text-slate-700">Role</label>
        <select
          id="signup-role"
          value={form.role}
          onChange={set('role')}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        >
          {roleOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Password with show/hide */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Password</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Lock size={16} />
          </span>
          <input
            id="signup-password"
            type={showPass ? 'text' : 'password'}
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={set('password')}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pl-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <Input
        label="Confirm Password"
        id="signup-confirm"
        type="password"
        placeholder="Re-enter password"
        value={form.confirmPassword}
        onChange={set('confirmPassword')}
        icon={<Lock size={16} />}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        icon={<UserPlus size={18} />}
        className="w-full mt-1"
      >
        Create Account
      </Button>
    </form>
  );
}

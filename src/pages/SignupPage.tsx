import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Scale, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', firmName: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs: Partial<typeof form> = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email required';
    if (!form.phone.trim() || form.phone.length < 10) errs.phone = 'Valid 10-digit phone required';
    if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary flex-col justify-between p-10">
        <Link to="/" className="block">
          <img src="/logo-dark.svg" alt="CaseFlow logo" className="h-8" />
        </Link>

        <div className="space-y-6">
          <h2 className="font-serif text-4xl font-semibold text-primary-foreground leading-tight">
            Your practice,<br />organised from day one.
          </h2>
          <ul className="space-y-3">
            {[
              'Cases, clients, and hearings in one place',
              'WhatsApp + Email client notifications — automated',
              'Cause list that updates as you update your cases',
              'Free for solo advocates up to 50 active cases',
            ].map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-3 text-sm font-sans text-primary-foreground/90"
              >
                <span className="h-5 w-5 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-primary-foreground">
                  ✓
                </span>
                {item}
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="text-xs font-sans text-primary-foreground/60">
          DPDP Act compliant · AES-256 encrypted · TLS 1.3 in transit
        </p>
      </div>

      {/* Right — Signup form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="relative z-10">
            <Link to="/" className="block mb-10">
              <img src="/logo-dark.svg" alt="CaseFlow logo" className="h-8" />
            </Link>
            <h1 className="font-serif text-3xl font-semibold text-foreground">Create your account</h1>
            <p className="text-sm font-sans text-muted-foreground mt-1">
              Get started in under 2 minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input
                id="signup-name"
                placeholder="Adv. Nikhil Joshi"
                value={form.name}
                onChange={update('name')}
                autoComplete="name"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-firm">Firm Name <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="signup-firm"
                placeholder="Joshi & Associates"
                value={form.firmName}
                onChange={update('firmName')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="nikhil@lawfirm.in"
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-phone">Phone</Label>
              <Input
                id="signup-phone"
                type="tel"
                placeholder="9820001122"
                value={form.phone}
                onChange={update('phone')}
                autoComplete="tel"
                maxLength={10}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={update('password')}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                <>
                  Create account
                  <ArrowRight size={14} />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm font-sans text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Scale, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    // Mock auth delay
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    navigate('/dashboard');
  };

  const MOCK_CAUSE_ROWS = [
    { no: 'CIV/2024/1123', party: 'Sharma v. Municipal Corp.', ct: '15' },
    { no: 'ARB/2024/0789', party: 'Mehta v. Sunrise Developers', ct: '22' },
    { no: 'CRM/2023/0456', party: 'State v. Anil Deshmukh', ct: '2' },
    { no: 'TAX/2024/0099', party: 'Kavita Iyer v. DCIT', ct: 'SMC' },
    { no: 'NCLT/2024/0234', party: 'Mehta v. BlueSky Infra', ct: 'NCLT-1' },
    { no: 'CRM/2024/0320', party: 'Choudhary v. State', ct: '11' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left — decorative cause list motif */}
      <div className="hidden lg:flex lg:w-[45%] bg-sidebar flex-col justify-between p-10 overflow-hidden">
        <Link to="/" className="relative z-10 block p-12 h-full">
          <img src="/logo-dark.svg" alt="CaseFlow logo" className="h-8" />
        </Link>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-xs font-mono text-primary font-semibold uppercase tracking-wider">Live — Today's Board</span>
          </div>
          {MOCK_CAUSE_ROWS.map((row, i) => (
            <motion.div
              key={row.no}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
              className="flex items-start gap-3 py-2.5 px-3 rounded-[var(--radius-sm)] bg-sidebar-accent border border-sidebar-border"
            >
              <span className="font-mono text-xs text-primary font-medium w-24 shrink-0">{row.no}</span>
              <div>
                <p className="text-xs font-sans text-sidebar-foreground">{row.party}</p>
                <p className="text-[10px] font-mono text-muted-foreground">Court {row.ct}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-xs font-sans text-muted-foreground">
          "The only tool that understands how court practice actually works."
        </p>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex justify-center mb-10">
            <img src="/logo.svg" alt="CaseFlow logo" className="h-7" />
          </Link>

          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">Welcome back</h1>
            <p className="text-sm font-sans text-muted-foreground mt-1">
              Sign in to your practice dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="nikhil@lawfirm.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="text-xs cursor-pointer">Remember me</Label>
              </div>
              <a href="#" className="text-xs font-sans text-primary hover:underline">Forgot password?</a>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-sans text-destructive"
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={14} />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm font-sans text-muted-foreground">
            No account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

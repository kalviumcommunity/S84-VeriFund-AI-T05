import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import api from '../../lib/api';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        localStorage.setItem('token', response.data.access_token);
        navigate('/copilot');
      } else {
        // Signup
        await api.post('/auth/register', {
          email,
          password,
          full_name: fullName,
          role: 'ADVISOR'
        });
        
        // After successful signup, auto-login
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);
        const loginResponse = await api.post('/auth/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        localStorage.setItem('token', loginResponse.data.access_token);
        navigate('/copilot');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[120px]"></div>
        </div>

        <div className="relative z-10 flex items-center font-bold text-2xl tracking-tight text-background">
          <Building2 className="h-8 w-8 mr-2 text-primary" />
          VeriFund AI
        </div>

        <div className="relative z-10 mb-10">
          <h1 className="text-4xl font-bold leading-tight mb-4 text-background">
            Financial Intelligence,<br />
            Powered by AI
          </h1>
          <p className="text-secondary text-lg max-w-md leading-relaxed">
            Automate compliance, extract insights, and analyze prospectuses in seconds with our enterprise-grade AI Copilot.
          </p>
        </div>

        <div className="relative z-10 text-sm text-secondary/80">
          © {new Date().getFullYear()} VeriFund AI Inc. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center text-foreground font-bold text-2xl">
              <Building2 className="h-8 w-8 mr-2 text-primary" />
              VeriFund AI
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isLogin ? 'Please enter your details to sign in.' : 'Enter your information to get started.'}
          </p>
          
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl mb-6 text-sm font-medium flex items-start border border-destructive/20">
              <svg className="w-5 h-5 mr-2 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-foreground">Password</label>
                {isLogin && <a href="#" className="text-sm font-medium text-primary hover:text-primary/80">Forgot password?</a>}
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground tracking-wide"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all flex justify-center items-center mt-4"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : null}
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
          
          <div className="mt-8 text-center text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-primary hover:text-primary/80 font-semibold focus:outline-none ml-1 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

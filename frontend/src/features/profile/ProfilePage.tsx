import { useState, useEffect } from 'react';
import { User, Mail, Shield, Clock, Building2 } from 'lucide-react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 text-primary border-4 border-current border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 border-b border-border flex items-center px-6 shrink-0 bg-card">
        <h1 className="text-foreground font-semibold text-lg">User Profile</h1>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="h-32 bg-primary/10 flex items-end px-8 pb-4 relative">
              <div className="absolute -bottom-12 left-8 h-24 w-24 bg-card rounded-full flex items-center justify-center border-4 border-card shadow-sm">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>
            
            <div className="px-8 pt-16 pb-8">
              <h2 className="text-2xl font-bold text-foreground">
                {user?.full_name || 'System User'}
              </h2>
              <div className="flex items-center text-muted-foreground mt-1">
                <Building2 className="h-4 w-4 mr-2" />
                <span>VeriFund AI Institutional</span>
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center mb-1">
                      <Mail className="h-4 w-4 mr-2" /> Email Address
                    </h3>
                    <p className="text-foreground font-medium">{user?.email || 'Not available'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center mb-1">
                      <Shield className="h-4 w-4 mr-2" /> Account Role
                    </h3>
                    <p className="text-foreground font-medium capitalize">{user?.role?.toLowerCase() || 'Advisor'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center mb-1">
                      <Clock className="h-4 w-4 mr-2" /> Member Since
                    </h3>
                    <p className="text-foreground font-medium">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'long', day: 'numeric'
                      }) : 'Recently'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center mb-1">
                      <Shield className="h-4 w-4 mr-2" /> Authentication
                    </h3>
                    <p className="text-foreground font-medium">OAuth2 Bearer Token (Active)</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-border flex gap-4">
                <button 
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem('token');
                    navigate('/login');
                  }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

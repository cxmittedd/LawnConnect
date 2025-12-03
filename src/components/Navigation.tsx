import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Scissors,
  Briefcase,
  Plus,
  Info,
  Mail,
  LogOut,
  Menu,
  X,
  User,
  MessageSquare,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Badge } from '@/components/ui/badge';

export function Navigation() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('customer');
  const unreadCount = useUnreadMessages();

  useEffect(() => {
    if (user) {
      loadUserRole();
    }
  }, [user]);

  const loadUserRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', user.id)
      .single();
    if (data) setUserRole(data.user_role);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isCustomer = userRole === 'customer' || userRole === 'both';
  const isProvider = userRole === 'provider' || userRole === 'both';

  const navItems = user
    ? [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
        ...(isCustomer ? [{ path: '/post-job', label: 'Post Job', icon: Plus, badge: 0 }] : []),
        ...(isProvider ? [{ path: '/browse-jobs', label: 'Browse Jobs', icon: Scissors, badge: 0 }] : []),
        { path: '/my-jobs', label: 'My Jobs', icon: Briefcase, badge: unreadCount },
        { path: '/profile', label: 'Profile', icon: User, badge: 0 },
        { path: '/about', label: 'About', icon: Info, badge: 0 },
        { path: '/contact', label: 'Contact', icon: Mail, badge: 0 },
      ]
    : [
        { path: '/about', label: 'About', icon: Info, badge: 0 },
        { path: '/contact', label: 'Contact', icon: Mail, badge: 0 },
      ];

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">LawnConnect</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary relative ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
            {user ? (
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth')} size="sm">
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.badge > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs ml-auto">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
            {user ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted w-full"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            ) : (
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/auth');
                }}
                className="w-full"
                size="sm"
              >
                Sign In
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

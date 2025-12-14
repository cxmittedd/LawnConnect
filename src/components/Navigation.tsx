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
  Shield,
  Sun,
  Moon,
  ChevronDown,
  AlertTriangle,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import lawnConnectLogo from '@/assets/lawnconnect-logo.png';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useTheme } from '@/hooks/useTheme';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navigation() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const unreadCount = useUnreadMessages();

  useEffect(() => {
    if (user) {
      setRoleLoading(true);
      Promise.all([loadUserRole(), checkAdminRole()]).finally(() => {
        setRoleLoading(false);
      });
    } else {
      setUserRole(null);
      setRoleLoading(false);
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

  const checkAdminRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isCustomer = !roleLoading && (userRole === 'customer' || userRole === 'both');
  const isProvider = !roleLoading && (userRole === 'provider' || userRole === 'both');

  const adminItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
    { path: '/admin/verifications', label: 'Verifications', icon: UserCheck },
  ];

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

  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
            <img src={lawnConnectLogo} alt="LawnConnect" className="h-14 w-14 object-contain" />
            <span className="text-lg font-bold text-foreground hidden sm:block">LawnConnect</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center flex-1 justify-end gap-4 xl:gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary relative whitespace-nowrap ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden xl:inline">{item.label}</span>
                  {item.badge > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap ${isAdminPage ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Shield className="h-4 w-4 shrink-0" />
                  <span className="hidden xl:inline">Admin</span>
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.path} asChild>
                        <Link to={item.path} className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted transition-colors shrink-0"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            {user ? (
              <Button onClick={handleSignOut} variant="outline" size="sm" className="shrink-0">
                <LogOut className="h-4 w-4 lg:mr-2" />
                <span className="hidden xl:inline">Sign Out</span>
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth')} size="sm" className="shrink-0">
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden shrink-0"
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
          <div className="lg:hidden py-4 space-y-2 border-t border-border">
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
            {isAdmin && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </div>
                {adminItems.map((item) => {
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
                    </Link>
                  );
                })}
              </>
            )}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted w-full"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="h-4 w-4" />
                  Dark Mode
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4" />
                  Light Mode
                </>
              )}
            </button>
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

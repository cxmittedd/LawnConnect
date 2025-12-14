import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

/**
 * Security: This component handles all unrecognized routes.
 * It does NOT log the attempted path to prevent information leakage about
 * what routes might exist or be guessed by attackers.
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Security: Don't log the attempted path to prevent enumeration attacks
    // Just silently handle the 404
    
    // If the path contains suspicious characters often used in attacks,
    // redirect to home immediately
    const suspiciousPatterns = [
      /\.\./,      // Path traversal
      /<script/i,  // XSS attempts
      /%3C/i,      // Encoded < 
      /%3E/i,      // Encoded >
      /javascript:/i, // JavaScript protocol
      /data:/i,    // Data protocol
      /vbscript:/i, // VBScript protocol
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(location.pathname) || pattern.test(location.search)
    );
    
    if (isSuspicious) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
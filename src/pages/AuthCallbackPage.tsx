import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthCallbackPage() {
  const { setAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // This page is reached after successful authentication from backend.
    // The backend handles token exchange and session management.
    // We assume successful redirect means authenticated for now.
    setAuthenticated(true);
    navigate('/'); // Redirect to home page after successful authentication
  }, [setAuthenticated, navigate]);

  return (
    <div>
      <h1>Authenticating...</h1>
      <p>Please wait while we log you in.</p>
    </div>
  );
}

export default AuthCallbackPage;
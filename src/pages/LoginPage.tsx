import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const { login } = useAuth();

  const handleLogin = () => {
    // Request basic scopes for initial login
    login(['userinfo.email', 'userinfo.profile']);
  };

  return (
    <div>
      <h1>Login Page</h1>
      <button onClick={handleLogin}>Login with Google</button>
    </div>
  );
}

export default LoginPage;
// @version react ^18.2.0
// @version @mui/material ^5.0.0
// @version @fingerprintjs/fingerprintjs ^3.0.0

import React, { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Alert, 
  CircularProgress 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import authConfig from '../../config/auth.config';

// Styled components with accessibility and responsive design
const LoginContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.default,
}));

const LoginCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: 400,
  width: '100%',
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(3),
    maxWidth: '100%',
  },
}));

const Login: React.FC = () => {
  const { login, loading, error, refreshToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle OAuth callback and CSRF validation
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      
      if (code && state) {
        try {
          // Validate stored CSRF state
          const storedState = sessionStorage.getItem('oauth_state');
          if (!storedState || storedState !== state) {
            throw new Error('Invalid OAuth state - possible CSRF attack');
          }

          // Get browser fingerprint for additional security
          const fp = await FingerprintJS.load();
          const result = await fp.get();
          const storedFingerprint = sessionStorage.getItem('browser_fingerprint');
          
          if (storedFingerprint !== result.visitorId) {
            throw new Error('Invalid browser fingerprint');
          }

          await login(code);
          navigate('/admin/dashboard');
        } catch (error) {
          console.error('Authentication error:', error);
        }
      }
    };

    handleCallback();
  }, [location, login, navigate]);

  // Set up automatic token refresh
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      refreshToken();
    }, (authConfig.token.accessTokenExpiry - 300) * 1000); // Refresh 5 minutes before expiry

    return () => clearInterval(refreshInterval);
  }, [refreshToken]);

  // Handle Google OAuth login initiation
  const handleGoogleLogin = useCallback(async () => {
    try {
      // Generate and store CSRF token
      const csrfToken = crypto.randomUUID();
      sessionStorage.setItem('oauth_state', csrfToken);

      // Get and store browser fingerprint
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      sessionStorage.setItem('browser_fingerprint', result.visitorId);

      // Construct OAuth URL with security parameters
      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.append('client_id', authConfig.google.clientId);
      oauthUrl.searchParams.append('redirect_uri', authConfig.google.redirectUri);
      oauthUrl.searchParams.append('response_type', 'code');
      oauthUrl.searchParams.append('scope', authConfig.google.scope);
      oauthUrl.searchParams.append('access_type', 'offline');
      oauthUrl.searchParams.append('state', csrfToken);
      oauthUrl.searchParams.append('prompt', 'consent');

      // Redirect to Google OAuth
      window.location.href = oauthUrl.toString();
    } catch (error) {
      console.error('Login initialization error:', error);
    }
  }, []);

  // Loading overlay
  if (loading) {
    return (
      <LoginContainer>
        <LoadingSpinner 
          size={48}
          fullPage
          loadingText="Authenticating..."
          testId="login-loading"
        />
      </LoginContainer>
    );
  }

  return (
    <LoginContainer>
      <LoginCard
        role="main"
        aria-label="Login form"
      >
        <Typography
          variant="h1"
          component="h1"
          gutterBottom
          align="center"
          sx={{ fontSize: '2rem', mb: 3 }}
        >
          SaaS Metrics Platform
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, width: '100%' }}
            role="alert"
          >
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleGoogleLogin}
          fullWidth
          size="large"
          startIcon={
            <img 
              src="/google-icon.svg" 
              alt="" 
              style={{ width: 20, height: 20 }}
            />
          }
          ariaLabel="Sign in with Google"
          testId="google-login-button"
        >
          Sign in with Google
        </Button>

        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ mt: 3 }}
        >
          Admin access only. Please use your organization email to sign in.
        </Typography>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
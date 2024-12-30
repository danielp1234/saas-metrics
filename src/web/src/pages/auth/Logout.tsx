import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // @version ^6.0.0
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/**
 * Logout component that handles secure user logout with proper session cleanup
 * and provides visual feedback during the logout process.
 * 
 * Features:
 * - Automatic logout execution on mount
 * - Comprehensive session cleanup
 * - Loading state feedback
 * - Automatic redirection after logout
 * - Error handling
 * - Accessibility support
 * 
 * @component
 */
const Logout: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    /**
     * Handles the logout process with proper cleanup and error handling
     */
    const handleLogout = async () => {
      try {
        // Execute logout and clear auth state
        await logout();

        // Clear any remaining sensitive data from storage
        localStorage.clear();
        sessionStorage.clear();

        // Clear any secure cookies
        document.cookie.split(';').forEach(cookie => {
          document.cookie = cookie
            .replace(/^ +/, '')
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/;secure;samesite=strict`);
        });

        // Redirect to home page after successful logout
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Logout error:', error);
        // Even if logout fails, redirect to home page for security
        navigate('/', { replace: true });
      }
    };

    // Execute logout immediately on component mount
    handleLogout();

    // Cleanup function for handling component unmount
    return () => {
      // Additional cleanup if needed
    };
  }, [logout, navigate]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default'
      }}
    >
      <LoadingSpinner
        size={40}
        color="primary"
        fullPage
        loadingText="Logging out..."
        testId="logout-spinner"
      />
    </div>
  );
};

export default Logout;
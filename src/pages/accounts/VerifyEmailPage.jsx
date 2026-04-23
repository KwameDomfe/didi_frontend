import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../../App';
import { FaEnvelopeOpenText, FaCheckCircle, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [verificationCode, setVerificationCode] = useState(searchParams.get('code') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  
  const { API_BASE_URL, showToast, user } = useApp();
  const navigate = useNavigate();
  
  const handleVerify = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    if (!verificationCode || !email) {
      setError('Please enter both verification code and email');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/accounts/auth/verify-email/`, {
        code: verificationCode,
        email: email
      });
      
      setMessage(response.data.message);
      setVerified(true);
      showToast('Email verified successfully!', 'success');
      
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Verification failed. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, email, navigate, showToast, verificationCode]);
  
  // Auto-verify if code and email are in URL
  useEffect(() => {
    if (searchParams.get('code') && searchParams.get('email')) {
      handleVerify();
    }
  }, [handleVerify, searchParams]);
  
  // Use logged-in user's email if available
  useEffect(() => {
    if (user && !email) {
      setEmail(user.email);
    }
  }, [user, email]);
  
  const handleResendCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setResendLoading(true);
    setError('');
    setMessage('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/accounts/auth/resend-verification/`, {
        email: email
      });
      
      setMessage(response.data.message);
      showToast('Verification code sent to your email', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to resend code. Please try again.';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setResendLoading(false);
    }
  };
  
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow-sm">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <FaEnvelopeOpenText className="text-primary" style={{ fontSize: '3rem' }} aria-hidden="true" />
                  <h2 className="mt-3">Verify Your Email</h2>
                  <p className="text-muted">
                    Enter the verification code sent to your email address
                  </p>
                </div>
                
                {verified ? (
                  <div className="alert alert-success text-center">
                    <FaCheckCircle className="mr0-25" aria-hidden="true" />
                    {message || 'Email verified successfully! Redirecting...'}
                  </div>
                ) : (
                  <form onSubmit={handleVerify}>
                    {/* Email */}
                    <div className="mb-3">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        disabled={user?.email}
                      />
                    </div>
                    
                    {/* Verification Code */}
                    <div className="mb-3">
                      <label className="form-label">Verification Code</label>
                      <input
                        type="text"
                        className="form-control text-center"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength="6"
                        style={{ fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                        required
                      />
                      <small className="form-text text-muted">
                        Enter the 6-digit code from your email
                      </small>
                    </div>
                    
                    {/* Error Message */}
                    {error && (
                      <div className="alert alert-danger">
                        <FaExclamationTriangle className="mr0-25" aria-hidden="true" />
                        {error}
                      </div>
                    )}
                    
                    {/* Success Message */}
                    {message && !verified && (
                      <div className="alert alert-success">
                        <FaCheckCircle className="mr0-25" aria-hidden="true" />
                        {message}
                      </div>
                    )}
                    
                    {/* Verify Button */}
                    <button
                      type="submit"
                      className="btn btn-primary w-100 mb-3"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Verifying...
                        </>
                      ) : (
                        'Verify Email'
                      )}
                    </button>
                    
                    {/* Resend Code */}
                    <div className="text-center">
                      <p className="text-muted mb-2">Didn't receive the code?</p>
                      <button
                        type="button"
                        className="btn btn-link"
                        onClick={handleResendCode}
                        disabled={resendLoading}
                      >
                        {resendLoading ? 'Sending...' : 'Resend Verification Code'}
                      </button>
                    </div>
                  </form>
                )}
                
                {/* Back to Home */}
                <div className="text-center mt-4">
                  <Link to="/" className="text-decoration-none">
                    <FaArrowLeft className="mr0-25" aria-hidden="true" />
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

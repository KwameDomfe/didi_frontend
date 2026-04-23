import React, { useState } from 'react';
import axios from 'axios';
import { useApp } from '../../App';
import { Link } from 'react-router-dom';
import { FaLock, FaEnvelope, FaSpinner, FaArrowLeft } from 'react-icons/fa';
// Forgot Password page component
const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { API_BASE_URL, showToast } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/accounts/auth/request-password-reset/`, {
        email
      });
      setMessage(response.data.message || 'Password reset instructions have been sent to your email.');
      showToast('Password reset email sent!', 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to send reset email. Please try again.';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container container90">
      <div className="shadow-5 bg-gold0 mv2-00 pa2-00 flex flex-column items-center w-50-m bg-brown0 br0-25 pa2-00">
        <div className="white tc pv2-00">
          <h2 className="gold0 flex items-center justify-center"><FaLock className="mr0-50" /> Reset Password</h2>
          <p className="white-90">Enter your email address and we'll send you instructions to reset your password.</p>
        </div>
        {message && (
          <div className="alert alert-success w-100" role="alert">
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="pa1-00 w-100">
          <div className="mb2-00">
            <label className="dib pb1-00 gold0 flex items-center"><FaEnvelope className="mr0-50" /> Email</label>
            <input
              type="email"
              className="w-100 pa0-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
            />
          </div>
          <div className="mb2-00">
            <button
              type="submit"
              className="btn pa0-50 bg-gold0 ba bn br0-25 brown0 w-100 flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <><FaSpinner className="fa-spin mr0-50" /> Sending...</>
              ) : (
                <><FaEnvelope className="mr0-50" /> Send Reset Instructions</>
              )}
            </button>
          </div>
          <div className="text-center mt-3">
            <Link to="/login" className="pa0-50 ba br0-25 bg-gold0 brown0 flex items-center justify-center">
              <FaArrowLeft className="mr0-50" /> Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ForgotPasswordPage;
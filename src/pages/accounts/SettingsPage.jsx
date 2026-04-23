import React, { useState } from 'react';
import axios from 'axios';
import { useApp } from '../../App';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const { user, API_BASE_URL, showToast } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwords.new_password !== passwords.confirm_password) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (passwords.new_password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(
        `${API_BASE_URL}/accounts/users/change_password/`,
        {
          old_password: passwords.old_password,
          new_password: passwords.new_password
        },
        {
          headers: {
            'Authorization': `Token ${token}`
          }
        }
      );
      showToast('Password changed successfully', 'success');
      setPasswords({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-8 mx-auto">
          <h2 className="mb-4">Account Settings</h2>
          
          {/* Change Password Section */}
          <div className="card shadow mb-4">
            <div className="card-body p-4">
              <h4 className="card-title mb-4">Change Password</h4>
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    name="old_password"
                    className="form-control"
                    value={passwords.old_password}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    name="new_password"
                    className="form-control"
                    value={passwords.new_password}
                    onChange={handlePasswordChange}
                    required
                  />
                  <small className="text-muted">Must be at least 8 characters</small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirm_password"
                    className="form-control"
                    value={passwords.confirm_password}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>

          {/* Account Information */}
          <div className="card shadow">
            <div className="card-body p-4">
              <h4 className="card-title mb-4">Account Information</h4>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted">Email</label>
                  <p className="fw-bold">{user.email}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted">User Type</label>
                  <p className="fw-bold text-capitalize">{user.user_type}</p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted">Member Since</label>
                  <p className="fw-bold">
                    {new Date(user.date_joined).toLocaleDateString()}
                  </p>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-muted">Account Status</label>
                  <p className="fw-bold">
                    <span className="badge bg-success">Active</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
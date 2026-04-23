import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../App';
import { FaCamera } from 'react-icons/fa';

const ProfileModal = ({ show, onClose }) => {
  const { user, setUser, API_BASE_URL, showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatPhoneNumber = (value) => {
    let cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned.slice(0, 16);
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone_number: formatted }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getUserInitials = () => {
    if (!user) return '?';
    const name = user.username || user.email || '';
    return name.charAt(0).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      
      let requestData;
      let headers = {
        'Authorization': `Token ${token}`
      };

      if (imageFile) {
        requestData = new FormData();
        Object.keys(formData).forEach(key => {
          requestData.append(key, formData[key]);
        });
        requestData.append('profile_picture', imageFile);
      } else {
        requestData = formData;
        headers['Content-Type'] = 'application/json';
      }

      // const response = await axios.patch(
      //   `${API_BASE_URL}/accounts/users/me/`,
      //   requestData,
      //   { headers }
      // );
      
      // Refetch user data to ensure we have the latest profile picture URL
      const freshUserData = await axios.get(
        `${API_BASE_URL}/accounts/users/me/`,
        { headers: { 'Authorization': `Token ${token}` } }
      );
      
      setUser(freshUserData.data);
      setImageFile(null);
      setImagePreview(null);
      setFormData({
        username: freshUserData.data.username || '',
        email: freshUserData.data.email || '',
        first_name: freshUserData.data.first_name || '',
        last_name: freshUserData.data.last_name || '',
        phone_number: freshUserData.data.phone_number || '',
      });
      showToast('Profile updated successfully', 'success');
      setEditing(false);
      // Close modal after successful save
      onClose();
    } catch (error) {
      console.error('Profile update error:', error.response?.data);
      const errorMsg = error.response?.data?.error || 
                       error.response?.data?.detail ||
                       JSON.stringify(error.response?.data) ||
                       'Failed to update profile';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEditing(false);
    setImageFile(null);
    setImagePreview(null);
    onClose();
  };

  if (!show || !user) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className={`modal-backdrop fade ${show ? 'show' : ''}`}
        style={{ display: show ? 'block' : 'none' }}
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div 
        className={`modal fade ${show ? 'show' : ''}`}
        style={{ display: show ? 'block' : 'none' }}
        tabIndex="-1"
        role="dialog"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {user.username.charAt(0).toUpperCase() + user.username.slice(1)} Profile
              </h5>
            </div>
            <div className="modal-body">
              {/* Profile Picture Section */}
              <div className="text-center mb-4">
                <div className="position-relative d-inline-block">
                  {imagePreview || user.profile_picture ? (
                    <img 
                      src={imagePreview || user.profile_picture} 
                      alt="Profile"
                      className="rounded-circle"
                      style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div 
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto"
                      style={{ width: '100px', height: '100px', fontSize: '40px', fontWeight: 'bold' }}
                    >
                      {getUserInitials()}
                    </div>
                  )}
                  {editing && (
                    <label 
                      className="position-absolute bottom-0 end-0 btn btn-sm btn-light rounded-circle"
                      style={{ width: '32px', height: '32px', padding: '4px', cursor: 'pointer' }}
                    >
                      <FaCamera aria-hidden="true" />
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
                {editing && (
                  <div className="mt-2">
                    <small className="text-muted">Click the camera icon to change photo</small>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      name="username"
                      className="form-control"
                      value={formData.username}
                      onChange={handleInputChange}
                      disabled={!editing}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!editing}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      className="form-control"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      disabled={!editing}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      className="form-control"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      disabled={!editing}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    name="phone_number"
                    className="form-control"
                    value={formData.phone_number}
                    onChange={handlePhoneChange}
                    disabled={!editing}
                    placeholder="+1234567890"
                  />
                  <small className="text-muted">Format: +[country code][number] (e.g., +1234567890)</small>
                </div>

                <div className="mb-3">
                  <label className="form-label">User Type</label>
                  <input
                    type="text"
                    className="form-control"
                    value={user.user_type || 'N/A'}
                    disabled
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              {editing ? (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditing(false);
                      setImageFile(null);
                      setImagePreview(null);
                      setFormData({
                        username: user.username || '',
                        email: user.email || '',
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        phone_number: user.phone_number || '',
                      });
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleClose}
                  >
                    Close
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileModal;

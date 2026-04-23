import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useApp } from '../../App';
import { useNavigate } from 'react-router-dom';
import { FaCamera } from 'react-icons/fa';

const ProfilePage = () => {
  const { user, setUser, API_BASE_URL, showToast } = useApp();
  const navigate = useNavigate();
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
    if (!user) {
      navigate('/login');
      return;
    }
    setFormData({
      username: user.username || '',
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: user.phone_number || '',
    });
  }, [user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (cleaned && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    // Limit to 16 characters (+ plus up to 15 digits)
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
      
      // If there's an image, use FormData
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

      const response = await axios.patch(
        `${API_BASE_URL}/accounts/users/me/`,
        requestData,
        { headers }
      );
      setUser(response.data);
      setImageFile(null);
      setImagePreview(null);
      // Update form data with the saved values
      setFormData({
        username: response.data.username || '',
        email: response.data.email || '',
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        phone_number: response.data.phone_number || '',
      });
      showToast('Profile updated successfully', 'success');
      setEditing(false);
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

  if (!user) return null;

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-8 mx-auto">
          <div className="card shadow">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="card-title mb-0">My Profile</h2>
                {!editing && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Profile Picture Section */}
              <div className="text-center mb-4">
                <div className="position-relative d-inline-block">
                  {imagePreview || user.profile_picture ? (
                    <img 
                      src={imagePreview || user.profile_picture} 
                      alt="Profile"
                      className="rounded-circle"
                      style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div 
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto"
                      style={{ width: '120px', height: '120px', fontSize: '48px', fontWeight: 'bold' }}
                    >
                      {getUserInitials()}
                    </div>
                  )}
                  {editing && (
                    <label 
                      className="position-absolute bottom-0 end-0 btn btn-sm btn-light rounded-circle"
                      style={{ width: '36px', height: '36px', padding: '6px', cursor: 'pointer' }}
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

                {editing && (
                  <div className="d-flex gap-2">
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary"
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
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
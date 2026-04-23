import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../App';

const UserProfilePage = () => {
  const { user, API_BASE_URL, showToast } = useApp();
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = useMemo(() => localStorage.getItem('authToken'), []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/accounts/users/${userId}/`, {
          headers: { Authorization: `Token ${token}` },
        });
        setProfileUser(response.data);
      } catch {
        setError('Could not load this user profile.');
        showToast('Could not load user profile.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [API_BASE_URL, navigate, showToast, token, user, userId]);

  const displayName = useMemo(() => {
    if (!profileUser) {
      return '';
    }
    return (
      `${profileUser.first_name || ''} ${profileUser.last_name || ''}`.trim()
      || profileUser.username
      || 'User'
    );
  }, [profileUser]);

  if (!user) {
    return null;
  }

  return (
    <div className="container container90 mt-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h1 className="mb-1">User Profile</h1>
          <p className="text-muted mb-0">Public dining profile details.</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/connections" className="btn btn-outline-secondary">
            My Connections
          </Link>
          <Link to="/social-dining" className="btn btn-outline-primary">
            Social Dining
          </Link>
        </div>
      </div>

      {loading && (
        <div className="alert alert-info" role="status">
          Loading user profile&hellip;
        </div>
      )}

      {!loading && error && (
        <div className="alert alert-danger" role="alert">{error}</div>
      )}

      {!loading && !error && profileUser && (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="d-flex align-items-center gap-3 flex-wrap mb-4">
              {profileUser.profile_picture ? (
                <img
                  src={profileUser.profile_picture}
                  alt={displayName}
                  className="rounded-circle"
                  style={{ width: '96px', height: '96px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                  style={{ width: '96px', height: '96px', fontSize: '32px', fontWeight: 'bold' }}
                >
                  {(profileUser.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="h4 mb-1">{displayName}</h2>
                <div className="text-muted">@{profileUser.username}</div>
                <div className="small text-muted text-capitalize">{String(profileUser.user_type || 'user').replace(/_/g, ' ')}</div>
              </div>
            </div>

            {profileUser.profile?.bio && (
              <div className="mb-4">
                <h3 className="h6">Bio</h3>
                <p className="mb-0">{profileUser.profile.bio}</p>
              </div>
            )}

            <div className="row g-3">
              <div className="col-md-6">
                <div className="border rounded p-3 h-100 bg-white">
                  <div className="small text-muted mb-1">Location</div>
                  <div>{profileUser.profile?.location || 'Not shared'}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="border rounded p-3 h-100 bg-white">
                  <div className="small text-muted mb-1">Favorite Cuisines</div>
                  <div>
                    {Array.isArray(profileUser.profile?.favorite_cuisines) && profileUser.profile.favorite_cuisines.length > 0
                      ? profileUser.profile.favorite_cuisines.join(', ')
                      : 'Not shared'}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="border rounded p-3 h-100 bg-white">
                  <div className="small text-muted mb-1">Spice Tolerance</div>
                  <div>{profileUser.profile?.spice_tolerance || 'Not shared'}</div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="border rounded p-3 h-100 bg-white">
                  <div className="small text-muted mb-1">Allergens</div>
                  <div>
                    {Array.isArray(profileUser.profile?.allergens) && profileUser.profile.allergens.length > 0
                      ? profileUser.profile.allergens.join(', ')
                      : 'None listed'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;

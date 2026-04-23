import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

// Fix Leaflet default marker icon paths (CRA webpack issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/** Handles click-to-drop-pin on the map */
function LocationMarker({ position, onMove }) {
  useMapEvents({
    click(e) { onMove(e.latlng.lat, e.latlng.lng); },
  });
  return position ? <Marker position={position} /> : null;
}

/** Flies the map to a position when it changes (e.g. after geocoding) */
function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { animate: true, duration: 1 });
  }, [position, map]);
  return null;
}

export default function RestaurantFormModal({ show, onHide, restaurant, onSuccess }) {
  const { API_BASE_URL } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [cuisineOptions, setCuisineOptions] = useState([]);
  const [loadingCuisines, setLoadingCuisines] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine_id: '',
    address: '',
    phone_number: '',
    email: '',
    website: '',
    price_range: '$$',
    delivery_fee: '2.99',
    delivery_time: '30-45 min',
    min_order: '15.00',
    features: [],
    opening_hours: {},
    is_active: true,
    image: null
  });

  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        cuisine_id: restaurant.cuisine?.id ? String(restaurant.cuisine.id) : '',
        address: restaurant.address || '',
        phone_number: restaurant.phone_number || '',
        email: restaurant.email || '',
        website: restaurant.website || '',
        price_range: restaurant.price_range || '$$',
        delivery_fee: restaurant.delivery_fee || '2.99',
        delivery_time: restaurant.delivery_time || '30-45 min',
        min_order: restaurant.min_order || '15.00',
        features: restaurant.features || [],
        opening_hours: restaurant.opening_hours || {},
        is_active: restaurant.is_active !== undefined ? restaurant.is_active : true,
        image: null,
        latitude: restaurant.latitude != null ? restaurant.latitude : '',
        longitude: restaurant.longitude != null ? restaurant.longitude : '',
      });
      setImagePreview(restaurant.image);
    } else {
      setFormData({
        name: '',
        description: '',
        cuisine_id: '',
        address: '',
        phone_number: '',
        email: '',
        website: '',
        price_range: '$$',
        delivery_fee: '2.99',
        delivery_time: '30-45 min',
        min_order: '15.00',
        features: [],
        opening_hours: {},
        is_active: true,
        image: null,
        latitude: '',
        longitude: '',
      });
      setImagePreview(null);
    }
    setError('');
    setSuccess('');
  }, [restaurant, show]);

  useEffect(() => {
    if (!show) {
      return;
    }

    let cancelled = false;

    const loadCuisineOptions = async () => {
      setLoadingCuisines(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/cuisines/`);
        const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
        if (!cancelled) setCuisineOptions(data);
      } catch {
        if (!cancelled) setCuisineOptions([]);
      } finally {
        if (!cancelled) setLoadingCuisines(false);
      }
    };

    loadCuisineOptions();

    return () => {
      cancelled = true;
    };
  }, [API_BASE_URL, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(
        prev => (
          {
            ...prev,
            [name]: checked
          }
        )
      );
    } else {
      setFormData(
        prev => (
          {
            ...prev,
            [name]: value
          }
        )
      );
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        e.target.value = null;
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPEG, PNG, or WebP)');
        e.target.value = null;
        return;
      }

      setError('');
      setFormData(
        prev => (
          { 
            ...prev, 
            image: file 
          }
        )
      );
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFeatureToggle = (feature) => {
    setFormData(
      prev => (
        {
          ...prev,
          features: prev.features.includes(feature)
            ? prev.features.filter(f => f !== feature)
            : [...prev.features, feature]
        }
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate numeric fields
    if (parseFloat(formData.delivery_fee) < 0) {
      setError('Delivery fee cannot be negative');
      setLoading(false);
      return;
    }

    if (parseFloat(formData.min_order) < 0) {
      setError('Minimum order cannot be negative');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const submitData = new FormData();
      
      // Optional URL/string fields — skip if blank to avoid Django validation errors
      const skipIfEmpty = ['website', 'cuisine_id'];

      Object.keys(formData).forEach(key => {
        if (key === 'features' || key === 'opening_hours') {
          submitData.append(key, JSON.stringify(formData[key]));
        } else if (key === 'image') {
          if (formData[key]) submitData.append(key, formData[key]);
        } else if (key === 'is_active') {
          // FormData coerces booleans to strings; send '1'/'0' for Django BooleanField
          submitData.append(key, formData[key] ? '1' : '0');
        } else if (key === 'latitude' || key === 'longitude') {
          if (formData[key] !== '' && formData[key] != null)
            submitData.append(key, parseFloat(formData[key]).toFixed(6));
        } else if (skipIfEmpty.includes(key)) {
          if (formData[key] !== '' && formData[key] != null) submitData.append(key, formData[key]);
        } else {
          submitData.append(key, formData[key]);
        }
      });

      if (restaurant) {
        await axios.patch(
          `${API_BASE_URL}/restaurants/${restaurant.id}/`,
          submitData,
          {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/restaurants/`,
          submitData,
          {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }

      setSuccess(restaurant 
        ? 'Restaurant updated successfully!' 
        : 'Restaurant created successfully!'
      );
      setTimeout(() => {
        onSuccess();
        onHide();
      }, 1000);
    } catch (err) {
      // Enhanced error handling
      console.error('Restaurant save error:', err.response?.status, err.response?.data);
      if (err.response?.data) {
        const errors = err.response.data;
        if (typeof errors === 'object' && !errors.detail) {
          // Display field-specific errors
          const errorMessages = Object.entries(errors)
            .map(([field, messages]) => {
              const fieldName = field.replace(/_/g, ' ');
              const message = Array.isArray(messages) ? messages[0] : messages;
              return `${fieldName}: ${message}`;
            })
            .join('. ');
          setError(errorMessages);
        } else {
          setError(errors.detail || 'Failed to save restaurant');
        }
      } else {
        setError('Failed to save restaurant. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGeocodeAddress = async () => {
    if (!formData.address) return;
    setGeocoding(true);
    setError('');
    try {
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { format: 'json', q: formData.address, limit: 1 },
      });
      const results = res.data;
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        setFormData(prev => ({ ...prev, latitude: parseFloat(lat), longitude: parseFloat(lon) }));
      } else {
        setError('Address not found on map — try a more specific address or pin it manually.');
      }
    } catch {
      setError('Could not search for address. Please pin the location manually on the map.');
    } finally {
      setGeocoding(false);
    }
  };

  const availableFeatures = [
    'wifi', 'parking', 'delivery', 'takeout', 'outdoor_seating',
    'wheelchair_accessible', 'credit_cards', 'reservations'
  ];

  const labelClass = 'b db mb0-25 f0-90 brown0';
  const inputClass = 'w-100 ba br0-25 b--brown0 brown0 pa0-50 bg-white';
  const sectionCardClass = 'ba br0-25 b--black-10 pa0-75 mb1-00 bg-white';

  if (!show) return null;

  return (
    <div
      className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', zIndex: 3000, overflowY: 'auto', padding: '1rem 0' }}
      onClick={onHide}
      role="presentation"
    >
      <div
        className="bg-gold5 brown0 br0-50 shadow-5 w-100 ba b--brown0"
        style={{ maxWidth: '56rem', margin: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="restaurant-form-title"
      >
        <header className="flex justify-between items-center pa1-00 bg-brown0 gold0" style={{ borderRadius: '0.5rem 0.5rem 0 0' }}>
          <h5 id="restaurant-form-title" className="ma0 f1-25 b gold0">
            {restaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
          </h5>
          <button
            type="button"
            className="ba pa0-25 br0-25 bg-transparent gold0 pointer b--gold0"
            onClick={onHide}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="pa1-00" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {error && (
              <div className="flex justify-between items-start ba br0-25 pa0-50 mb1-00 bg-red0 white" role="alert">
                <span>{error}</span>
                <button type="button" className="bg-transparent ba0 white pointer ml0-50" onClick={() => setError('')}><FaTimes /></button>
              </div>
            )}
            {success && (
              <div className="flex justify-between items-start ba br0-25 pa0-50 mb1-00 bg-green0 white" role="alert">
                <span>{success}</span>
                <button type="button" className="bg-transparent ba0 white pointer ml0-50" onClick={() => setSuccess('')}><FaTimes /></button>
              </div>
            )}
              <div className={sectionCardClass}
              >
                <label className={labelClass}
                >
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  className={inputClass}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              
                <div className="mt0-75">
                  <label className={labelClass}
                  >
                    Description *
                  </label>
                  <textarea
                    className={inputClass}
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={`row ${sectionCardClass}`}
              >
                <div className="col-md-6 mb-3"
                >
                  <label className={labelClass}>Cuisine *</label>
                  <select
                    className={inputClass}
                    name="cuisine_id"
                    value={formData.cuisine_id}
                    onChange={handleChange}
                    required
                    disabled={loading || loadingCuisines}
                  >
                    <option value="">
                      {loadingCuisines ? 'Loading cuisines...' : 'Select cuisine...'}
                    </option>
                    {cuisineOptions.map(cuisine => (
                      <option key={cuisine.id} value={cuisine.id}>
                        {cuisine.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 mb-3"
                >
                  <label className={labelClass}
                  >
                    Price Range *
                  </label>
                  <select
                    className={inputClass}
                    name="price_range"
                    value={formData.price_range}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  >
                    <option value="$"
                    >
                      $ - Budget
                    </option>
                    <option value="$$"
                    >
                      $$ - Moderate
                    </option>
                    <option value="$$$"
                    >
                      $$$ - Expensive
                    </option>
                    <option value="$$$$"
                    >
                      $$$$ - Fine Dining
                    </option>
                  </select>
                </div>
              </div>

              <div className={sectionCardClass}
              >
                <label className={labelClass}
                >
                  Address *
                </label>
                <textarea
                  className={inputClass}
                  name="address"
                  rows="2"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              {/* Map Location Picker */}
              <div className={sectionCardClass}>
                <div className="flex justify-between items-center" style={{ marginBottom: '0.3rem' }}>
                  <label className={`${labelClass} mb0-00`}>
                    Pin Location on Map
                    <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#888', marginLeft: '0.3rem' }}>(optional)</span>
                  </label>
                  <button
                    type="button"
                    className="pa0-25 br0-25 ba b--brown0 bg-transparent brown0 pointer b"
                    style={{ fontSize: '0.78rem' }}
                    onClick={handleGeocodeAddress}
                    disabled={geocoding || !formData.address || loading}
                  >
                    {geocoding ? 'Searching…' : '📍 Find from Address'}
                  </button>
                </div>
                <p style={{ fontSize: '0.76rem', color: '#888', margin: '0 0 0.4rem' }}>
                  Click anywhere on the map to drop a pin at the exact restaurant location.
                </p>
                <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #dee2e6' }}>
                  <MapContainer
                    center={[
                      formData.latitude !== '' && formData.latitude != null ? Number(formData.latitude) : 5.6037,
                      formData.longitude !== '' && formData.longitude != null ? Number(formData.longitude) : -0.1870,
                    ]}
                    zoom={formData.latitude !== '' && formData.latitude != null ? 15 : 12}
                    style={{ height: 260, width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                      position={
                        formData.latitude !== '' && formData.latitude != null
                          ? [Number(formData.latitude), Number(formData.longitude)]
                          : null
                      }
                      onMove={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                    />
                    <FlyToLocation
                      position={
                        formData.latitude !== '' && formData.latitude != null
                          ? [Number(formData.latitude), Number(formData.longitude)]
                          : null
                      }
                    />
                  </MapContainer>
                </div>
                {formData.latitude !== '' && formData.latitude != null ? (
                  <div className="flex items-center" style={{ gap: '0.5rem', fontSize: '0.78rem', color: '#555', marginTop: '0.3rem' }}>
                    <span>📌 {Number(formData.latitude).toFixed(6)}, {Number(formData.longitude).toFixed(6)}</span>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: '0.76rem', padding: 0 }}
                      onClick={() => setFormData(prev => ({ ...prev, latitude: '', longitude: '' }))}
                    >
                      ✕ Clear pin
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.76rem', color: '#aaa', margin: '0.25rem 0 0' }}>No pin set yet.</p>
                )}
              </div>

              <div className={`row ${sectionCardClass}`}
              >
                <div className="col-md-6 mb-3"
                >
                  <label className={labelClass}
                  >
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    className={inputClass}
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="col-md-6 mb-3"
                >
                  <label className={labelClass}>
                    Email *
                  </label>
                  <input
                    type="email"
                    className={inputClass}
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={sectionCardClass}
              >
                <label className={labelClass}
                >
                  Website
                </label>
                <input
                  type="url"
                  className={inputClass}
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  disabled={loading}
                />

                <div className="mt0-75 flex flex-wrap" style={{ gap: '1rem' }}>
                  <div className="flex-grow-1 flex flex-column" style={{ minWidth: '8rem' }}>
                    <label className={labelClass}>Delivery Fee (GHC)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClass}
                      name="delivery_fee"
                      value={formData.delivery_fee}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-grow-1 flex flex-column" style={{ minWidth: '8rem' }}>
                    <label className={labelClass}>Delivery Time</label>
                    <input
                      type="text"
                      className={inputClass}
                      name="delivery_time"
                      value={formData.delivery_time}
                      onChange={handleChange}
                      placeholder="e.g., 30-45 min"
                      disabled={loading}
                    />
                  </div>
                  <div className="flex-grow-1 flex flex-column" style={{ minWidth: '8rem' }}>
                    <label className={labelClass}>Min Order (GHC)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className={inputClass}
                      name="min_order"
                      value={formData.min_order}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className={sectionCardClass}
              >
                <label className={labelClass}>Restaurant Image</label>
                <input
                  type="file"
                  className={inputClass}
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  disabled={loading}
                />
                <small className="f0-80 gray0">
                  Max size: 5MB. Accepted formats: JPEG, PNG, WebP
                </small>
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="br0-25 ba b--black-10"
                      style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                )}
              </div>

              {/* Opening Hours */}
              <div className={sectionCardClass}>
                <label className="db mb0-50 b brown0">Opening Hours</label>
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                  const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
                  const hours = formData.opening_hours[day] || {};
                  const isClosed = hours.closed || false;
                  const updateDay = (patch) =>
                    setFormData(prev => ({
                      ...prev,
                      opening_hours: { ...prev.opening_hours, [day]: { ...prev.opening_hours[day], ...patch } }
                    }));
                  return (
                    <div key={day} className="flex items-center mb0-50" style={{ gap: '0.75rem' }}>
                      <span className="dib" style={{ width: '6rem', fontSize: '0.875rem' }}>{dayNames[day]}</span>
                      <label className="flex items-center" style={{ gap: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isClosed}
                          onChange={e => updateDay({ closed: e.target.checked })}
                          disabled={loading}
                        />
                        Closed
                      </label>
                      <input
                        type="time"
                        value={hours.open || ''}
                        onChange={e => updateDay({ open: e.target.value })}
                        disabled={loading || isClosed}
                        className="ba b--brown0 br0-25 pa0-25 bg-white brown0"
                        style={{ opacity: isClosed ? 0.4 : 1 }}
                        aria-label={`${dayNames[day]} open`}
                      />
                      <span className="f0-75">–</span>
                      <input
                        type="time"
                        value={hours.close || ''}
                        onChange={e => updateDay({ close: e.target.value })}
                        disabled={loading || isClosed}
                        className="ba b--brown0 br0-25 pa0-25 bg-white brown0"
                        style={{ opacity: isClosed ? 0.4 : 1 }}
                        aria-label={`${dayNames[day]} close`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className={sectionCardClass}>
                <label className="db mb0-50 b brown0">Features</label>
                <div className="flex flex-wrap" style={{ gap: '0.5rem' }}
                >
                  {
                    availableFeatures.map(
                      feature => (
                        <button
                          key={feature}
                          type="button"
                          className={`pa0-25 br0-25 ba pointer ${
                            formData.features.includes(feature)
                              ? 'bg-brown0 gold0 b--brown0'
                              : 'bg-white brown0 b--brown0'
                          }`}
                          onClick={() => handleFeatureToggle(feature)}
                          disabled={loading}
                        >
                          {feature.replace(/_/g, ' ')}
                        </button>
                      )
                    )
                  }
                </div>
              </div>

              <div className="flex items-center mb1-00" style={{ gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  disabled={loading}
                />
                <label htmlFor="is_active" style={{ cursor: 'pointer' }}>
                  Active (visible to customers)
                </label>
              </div>
            </div>

            <footer className="flex justify-end pt1-00 bt b--black-10 pa1-00 bg-white" style={{ gap: '0.5rem', borderRadius: '0 0 0.5rem 0.5rem' }}>
              <button
                type="button"
                className="pa0-50 br0-25 ba b--brown0 bg-transparent brown0 pointer"
                onClick={onHide}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pa0-50 br0-25 ba b--brown0 bg-brown0 gold0 b pointer"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Restaurant'}
              </button>
            </footer>
          </form>
        </div>
      </div>
  );
}

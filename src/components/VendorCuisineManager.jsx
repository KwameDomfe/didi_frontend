import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useApp } from '../App';
import { FaUtensils, FaChevronUp, FaChevronDown, FaPlusCircle, FaEdit, FaTrash } from 'react-icons/fa';

const EMPTY_FORM = { name: '', description: '', image: null };

export default function VendorCuisineManager() {
  const { API_BASE_URL } = useApp();
  const [cuisines, setCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCuisine, setEditingCuisine] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const fetchCuisines = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/cuisines/`, { headers: getAuthHeaders() });
      setCuisines(response.data.results || response.data);
      setError(null);
    } catch {
      setError('Failed to load cuisines.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCuisines(); }, [API_BASE_URL]);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
      setImagePreview(URL.createObjectURL(files[0]));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const openAddForm = () => {
    setEditingCuisine(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (cuisine) => {
    setEditingCuisine(cuisine);
    setForm({ name: cuisine.name, description: cuisine.description || '', image: null });
    setImagePreview(cuisine.image || null);
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCuisine(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setFormError(null);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete cuisine "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/cuisines/${id}/`, { headers: getAuthHeaders() });
      fetchCuisines();
    } catch {
      setError('Failed to delete cuisine. Make sure you have permission.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('description', form.description);
    if (form.image) formData.append('image', form.image);
    const headers = { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' };
    try {
      if (editingCuisine) {
        await axios.patch(`${API_BASE_URL}/cuisines/${editingCuisine.id}/`, formData, { headers });
      } else {
        await axios.post(`${API_BASE_URL}/cuisines/`, formData, { headers });
      }
      closeForm();
      fetchCuisines();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to save cuisine.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb1-00">
      {/* ── Section toggle bar ── */}
      <button
        type="button"
        className="w-100 bg-brown0 br0-25 pa1-00 flex justify-between items-center pointer b--none"
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center" style={{ gap: '0.5rem' }}>
          <FaUtensils className="gold0 f1-00" />
          <span className="gold0 b f1-00">Manage Cuisines</span>
          {!loading && (
            <span
              className="pa0-25 br0-25 f0-75"
              style={{ background: 'rgba(250,223,150,0.15)', color: 'rgb(250,223,150)' }}
            >
              {cuisines.length}
            </span>
          )}
        </span>
        {open ? <FaChevronUp className="gold0" /> : <FaChevronDown className="gold0" />}
      </button>

      {/* ── Collapsible body ── */}
      {open && (
        <div className="bg-white shadow-4 br0-25 pa1-00 mt0-25">

          {/* Toolbar */}
          <div className="flex justify-between items-center mb1-00">
            <span className="f0-85 dark-gray b">
              {cuisines.length === 0 ? 'No cuisines yet' : `${cuisines.length} cuisine${cuisines.length !== 1 ? 's' : ''}`}
            </span>
            {!showForm && (
              <button
                type="button"
                className="ba pa0-50 br0-25 bg-brown0 gold0 b pointer"
                style={{ border: 'none', fontSize: '0.85rem' }}
                onClick={openAddForm}
              >
                <FaPlusCircle className="mr0-25" style={{ verticalAlign: 'middle' }} />Add Cuisine
              </button>
            )}
          </div>

          {/* Inline form */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="bg-brown0 br0-25 pa1-00 mb1-00"
            >
              <h4 className="gold0 f1-00 mb0-75">
                {editingCuisine ? `Edit — ${editingCuisine.name}` : 'New Cuisine'}
              </h4>

              {formError && (
                <div
                  className="br0-25 pa0-50 mb0-75 f0-75"
                  style={{ background: 'rgba(220,53,69,0.15)', color: '#ff6b6b' }}
                >
                  {formError}
                </div>
              )}

              <div className="grid ggap0-75 mb0-75" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="f0-75 gold0 db mb0-25">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                    required
                    className="w-100 pa0-50 br0-25"
                    style={{ border: '1px solid rgba(250,223,150,0.3)', background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }}
                    placeholder="e.g. Italian"
                  />
                </div>
                <div>
                  <label className="f0-75 gold0 db mb0-25">Image</label>
                  <div className="flex items-center" style={{ gap: '0.5rem' }}>
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="br0-25"
                        style={{ width: 40, height: 40, objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <button
                      type="button"
                      className="ba pa0-50 br0-25 bg-transparent gold0 pointer f0-75"
                      style={{ borderColor: 'rgba(250,223,150,0.3)' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? 'Change' : 'Upload'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      name="image"
                      accept="image/*"
                      onChange={handleInputChange}
                      className="dn"
                    />
                  </div>
                </div>
              </div>

              <div className="mb0-75">
                <label className="f0-75 gold0 db mb0-25">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-100 pa0-50 br0-25"
                  style={{ border: '1px solid rgba(250,223,150,0.3)', background: 'rgba(255,255,255,0.08)', color: '#fff', outline: 'none', resize: 'vertical' }}
                  placeholder="Short description (optional)"
                />
              </div>

              <div className="flex" style={{ gap: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ba pa0-50 br0-25 bg-gold0 brown0 b pointer"
                  style={{ border: 'none', fontSize: '0.85rem' }}
                >
                  {submitting ? 'Saving…' : editingCuisine ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  className="ba pa0-50 br0-25 bg-transparent gold0 pointer"
                  style={{ borderColor: 'rgba(250,223,150,0.3)', fontSize: '0.85rem' }}
                  onClick={closeForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Status messages */}
          {loading && (
            <div className="tc pv1-00">
              <div className="tc pv1-00">
              <div className="f0-75 silver" style={{ letterSpacing: '0.05em' }}>Loading…</div>
            </div>
            </div>
          )}
          {error && !loading && (
            <div
              className="br0-25 pa0-75 mb0-75 f0-85"
              style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}
            >
              {error}
            </div>
          )}

          {/* Cuisine cards */}
          {!loading && cuisines.length === 0 && !showForm && (
            <p className="silver f0-85 tc pv1-00 mb0-00">No cuisines yet. Add one above.</p>
          )}
          {!loading && cuisines.length > 0 && (
            <div className="grid ggap0-75" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {cuisines.map((cuisine) => (
                <div
                  key={cuisine.id}
                  className="br0-25 of-hidden shadow-4"
                  style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                >
                  {cuisine.image ? (
                    <img
                      src={cuisine.image}
                      alt={cuisine.name}
                      style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center bg-brown0"
                      style={{ height: 90 }}
                    >
                      <FaUtensils className="gold0" style={{ fontSize: '2rem', opacity: 0.5 }} />
                    </div>
                  )}
                  <div className="pa0-50">
                    <p className="b f0-85 dark-gray mb0-25" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{cuisine.name}</p>
                    {cuisine.description && (
                      <p className="f0-75 silver mb0-50" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {cuisine.description}
                      </p>
                    )}
                    <div className="flex" style={{ gap: '0.35rem' }}>
                      <button
                        type="button"
                        className="ba pa0-25 br0-25 bg-transparent pointer flex-grow-1 tc"
                        style={{ borderColor: 'rgba(117,18,1,0.3)', color: 'rgb(117,18,1)', fontSize: '0.75rem' }}
                        onClick={() => openEditForm(cuisine)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        className="ba pa0-25 br0-25 bg-transparent pointer flex-grow-1 tc"
                        style={{ borderColor: 'rgba(220,53,69,0.3)', color: '#dc3545', fontSize: '0.75rem' }}
                        onClick={() => handleDelete(cuisine.id, cuisine.name)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

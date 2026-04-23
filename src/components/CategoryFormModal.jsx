import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import axios from 'axios';

const MEAL_PERIOD_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'supper', label: 'Supper' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'all_day', label: 'All Day' }
];

export default function CategoryFormModal({ show, onHide, restaurantId, onSuccess, category = null }) {
  const { API_BASE_URL } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    meal_period: 'all_day',
    image: null
  });

  const normalizedRestaurantId = useMemo(
    () => (typeof restaurantId === 'object' ? restaurantId?.id || '' : restaurantId),
    [restaurantId]
  );

  useEffect(() => {
    if (!show) {
      return;
    }

    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        meal_period: category.meal_period || 'all_day',
        image: null
      });
      setImagePreview(category.image || null);
    } else {
      setFormData({
        name: '',
        description: '',
        meal_period: 'all_day',
        image: null
      });
      setImagePreview(null);
    }
    setError('');
  }, [show, category]);

  const formatApiError = (errorData) => {
    if (!errorData) {
      return 'Failed to save category';
    }

    if (typeof errorData === 'string') {
      return errorData;
    }

    if (typeof errorData.detail === 'string') {
      return errorData.detail;
    }

    const messages = Object.entries(errorData).flatMap(([field, value]) => {
      const fieldLabel = field.replace(/_/g, ' ');

      if (Array.isArray(value)) {
        return value.map((message) => `${fieldLabel}: ${message}`);
      }

      if (typeof value === 'string') {
        return `${fieldLabel}: ${value}`;
      }

      return [];
    });

    return messages.length > 0 ? messages.join(' ') : 'Failed to save category';
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setFormData((prev) => ({ ...prev, image: null }));
      setImagePreview(null);
      return;
    }

    setFormData((prev) => ({ ...prev, image: file }));
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const buildCategorySubmitData = (payload, imageFile = null) => {
    const submitData = new FormData();
    submitData.append('name', payload.name);
    submitData.append('description', payload.description);
    submitData.append('meal_period', payload.meal_period);
    if (imageFile) {
      submitData.append('image', imageFile);
    }
    return submitData;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const numericRestaurantId = Number(normalizedRestaurantId);
      if (!category && !numericRestaurantId) {
        setError('Restaurant is missing. Reload the page and try again.');
        setLoading(false);
        return;
      }

      const authHeaders = {
        'Authorization': `Token ${token}`
      };
      const multipartHeaders = {
        ...authHeaders,
        'Content-Type': 'multipart/form-data'
      };

      const payload = {
        name: formData.name,
        description: formData.description,
        meal_period: formData.meal_period
      };

      if (category) {
        const categoryIdentifier = category.slug || category.id;
        if (!categoryIdentifier) {
          setError('Category identifier is missing. Reload the page and try again.');
          setLoading(false);
          return;
        }

        if (formData.image) {
          const submitData = buildCategorySubmitData(payload, formData.image);
          const updateUrl = `${API_BASE_URL}/categories/${categoryIdentifier}/`;

          try {
            await axios.patch(updateUrl, submitData, { headers: multipartHeaders });
          } catch (patchError) {
            await axios.put(updateUrl, submitData, { headers: multipartHeaders });
          }
        } else {
          await axios.patch(
            `${API_BASE_URL}/categories/${categoryIdentifier}/`,
            payload,
            { headers: authHeaders }
          );
        }
      } else {
        let writableCreateFields = null;
        try {
          const optionsResponse = await axios.options(`${API_BASE_URL}/categories/`, {
            headers: authHeaders
          });
          const postActions = optionsResponse?.data?.actions?.POST;
          if (postActions && typeof postActions === 'object') {
            writableCreateFields = Object.keys(postActions);
          }
        } catch (optionsError) {
          console.warn('Could not read categories OPTIONS metadata:', optionsError?.message || optionsError);
        }

        const acceptsField = (fieldName) => {
          if (!Array.isArray(writableCreateFields)) {
            return true;
          }
          return writableCreateFields.includes(fieldName);
        };

        const restaurantAliases = ['restaurant', 'restaurant_id', 'restaurant_pk', 'restaurantId'];
        restaurantAliases.forEach((fieldName) => {
          if (acceptsField(fieldName)) {
            payload[fieldName] = numericRestaurantId;
          }
        });

        if (!Object.prototype.hasOwnProperty.call(payload, 'restaurant') &&
            !Object.prototype.hasOwnProperty.call(payload, 'restaurant_id') &&
            !Object.prototype.hasOwnProperty.call(payload, 'restaurant_pk') &&
            !Object.prototype.hasOwnProperty.call(payload, 'restaurantId')) {
          payload.restaurant = numericRestaurantId;
          payload.restaurant_id = numericRestaurantId;
        }

        const createResponse = await axios.post(`${API_BASE_URL}/categories/?restaurant=${numericRestaurantId}`, payload, {
          headers: authHeaders
        });

        if (formData.image) {
          const categoryIdentifier = createResponse?.data?.slug || createResponse?.data?.id;
          if (categoryIdentifier) {
            const imagePayload = buildCategorySubmitData(payload, formData.image);
            const updateUrl = `${API_BASE_URL}/categories/${categoryIdentifier}/`;
            try {
              await axios.patch(updateUrl, imagePayload, {
                headers: multipartHeaders
              });
            } catch (patchError) {
              await axios.put(updateUrl, imagePayload, {
                headers: multipartHeaders
              });
            }
          }
        }
      }

      if (onSuccess) {
        onSuccess();
      }

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const changedRestaurantId = category
          ? (typeof category.restaurant === 'object' ? category.restaurant?.id : category.restaurant)
          : numericRestaurantId;
        window.dispatchEvent(
          new CustomEvent('categories:updated', {
            detail: {
              restaurantId: changedRestaurantId,
              categoryId: category?.id || null,
              categorySlug: category?.slug || null
            }
          })
        );
      }

      onHide();
    } catch (err) {
      console.error('Failed to save category:', err.response?.data || err);
      setError(formatApiError(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return null;
  }

  const labelClass = 'b db mb0-25 f0-90 brown0';
  const inputClass = 'w-100 ba br0-25 b--brown0 brown0 pa0-50 bg-white';

  return (
    <div
      className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', zIndex: 3000, overflowY: 'auto', padding: '1rem 0' }}
      onClick={onHide}
      role="presentation"
    >
      <div
        className="bg-gold5 brown0 br0-50 shadow-5 w-100 ba b--brown0"
        style={{ maxWidth: '40rem', margin: 'auto' }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
      >
        <header className="flex justify-between items-center pa1-00 bg-brown0 gold0" style={{ borderRadius: '0.5rem 0.5rem 0 0' }}>
          <div>
            <h5 id="category-form-title" className="ma0 f1-25 b gold0">
              {category ? 'Edit Menu Category' : 'Create Menu Category'}
            </h5>
            {!category && normalizedRestaurantId && (
              <p className="ma0 mt0-25 f0-80 gold0" style={{ opacity: 0.85 }}>
                Restaurant ID: {normalizedRestaurantId}
              </p>
            )}
          </div>
          <button
            type="button"
            className="ba pa0-25 br0-25 bg-transparent gold0 pointer b--gold0"
            onClick={onHide}
            disabled={loading}
            aria-label="Close"
          >
            x
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="pa1-00" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {error && (
              <div className="ba br0-25 pa0-75 mb1-00 bg-red0 white b">{error}</div>
            )}

            {!category && !normalizedRestaurantId && (
              <div className="ba br0-25 pa0-75 mb1-00 bg-gold0 brown0 b">
                Select a restaurant context before creating categories.
              </div>
            )}

            <div className="ba br0-25 b--black-10 pa0-75 mb1-00 bg-white">
              <div className="mb0-75">
                <label className={labelClass}>Category Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb0-75">
                <label className={labelClass}>Description</label>
                <textarea
                  className={inputClass}
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="grid gtc2-m ggap0-75">
                <div>
                  <label className={labelClass}>Meal Period *</label>
                  <select
                    className={inputClass}
                    name="meal_period"
                    value={formData.meal_period}
                    onChange={handleChange}
                    required
                  >
                    {MEAL_PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Category Image</label>
                  <input
                    type="file"
                    className={inputClass}
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              {imagePreview && (
                <div className="mt0-75">
                  <img
                    src={imagePreview}
                    alt="Category preview"
                    className="br0-25 ba b--black-10"
                    style={{ maxWidth: '220px', maxHeight: '160px', objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>
          </div>

          <footer className="flex justify-end pa1-00 bt b--black-10 bg-white" style={{ borderRadius: '0 0 0.5rem 0.5rem', gap: '0.5rem' }}>
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
              className="pa0-50 br0-25 ba b--brown0 bg-brown0 gold0 pointer b"
              disabled={loading || (!category && !normalizedRestaurantId)}
            >
              {loading ? (category ? 'Saving...' : 'Creating...') : (category ? 'Save Changes' : 'Create Category')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
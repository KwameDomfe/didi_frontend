import { useState, useEffect, useCallback } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useApp } from '../App';
import axios from 'axios';
import OptionGroupsEditor from './OptionGroupsEditor';

export default function MenuItemFormModal({ show, onHide, menuItem, restaurantId, onSuccess, onRequestCreateCategory }) {
  const { API_BASE_URL } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  const normalizedRestaurantId = typeof restaurantId === 'object'
    ? restaurantId?.id || ''
    : restaurantId;

  const formatApiError = (errorData) => {
    if (!errorData) {
      return 'Failed to save menu item';
    }

    if (typeof errorData === 'string') {
      return errorData;
    }

    if (typeof errorData.detail === 'string') {
      return errorData.detail;
    }

    const messages = Object.entries(errorData)
      .flatMap(([field, value]) => {
        const fieldLabel = field.replace(/_/g, ' ');

        if (Array.isArray(value)) {
          return value.map((message) => `${fieldLabel}: ${message}`);
        }

        if (typeof value === 'string') {
          return `${fieldLabel}: ${value}`;
        }

        return [];
      });

    return messages.length > 0 ? messages.join(' ') : 'Failed to save menu item';
  };
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    ingredients: [],
    allergens: '',
    spice_level: 0,
    prep_time: '',
    is_available: true,
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    nutritional_info: { calories: '', protein: '', carbs: '', fat: '' },
    image: null
  });

  useEffect(() => {
    setActiveTab('details');
    if (menuItem) {
      const ni = menuItem.nutritional_info || {};
      setFormData({
        name: menuItem.name || '',
        description: menuItem.description || '',
        price: menuItem.price || '',
        category: String(menuItem.category?.id || menuItem.category || ''),
        ingredients: menuItem.ingredients || [],
        allergens: Array.isArray(menuItem.allergens) ? menuItem.allergens.join(', ') : (menuItem.allergens || ''),
        spice_level: menuItem.spice_level || 0,
        prep_time: menuItem.prep_time || '',
        is_available: menuItem.is_available !== undefined ? menuItem.is_available : true,
        is_vegetarian: menuItem.is_vegetarian || false,
        is_vegan: menuItem.is_vegan || false,
        is_gluten_free: menuItem.is_gluten_free || false,
        nutritional_info: { calories: ni.calories ?? '', protein: ni.protein ?? '', carbs: ni.carbs ?? '', fat: ni.fat ?? '' },
        image: null
      });
      setImagePreview(menuItem.image);
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        ingredients: [],
        allergens: '',
        spice_level: 0,
        prep_time: '',
        is_available: true,
        is_vegetarian: false,
        is_vegan: false,
        is_gluten_free: false,
        nutritional_info: { calories: '', protein: '', carbs: '', fat: '' },
        image: null
      });
      setImagePreview(null);
    }
    setError('');
  }, [menuItem, show]);

  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      // console.log('Fetching categories for restaurant:', restaurantId);
      const response = await axios.get(
        `${API_BASE_URL}/categories/?restaurant=${normalizedRestaurantId}`,
        {
          headers: token
            ? { 'Authorization': `Token ${token}` }
            : undefined
        }
      );
      // console.log('Categories response:', response.data);
      
      // Ensure we have an array
      const categoriesData = Array.isArray(response.data) 
        ? response.data 
        : (
            response.data.results 
            ? response.data.results 
            : []
          );
      
      setCategories(categoriesData);
      
      if (categoriesData.length === 0) {
        setError('No categories found for this restaurant. Please create categories first.');
      } else {
        setError((prev) => (
          prev === 'No categories found for this restaurant. Please create categories first.'
            ? ''
            : prev
        ));
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([]); // Set to empty array on error
      setError('Failed to load categories: ' + (err.response?.data?.detail || err.message));
    }
  }, [API_BASE_URL, normalizedRestaurantId]);

  useEffect(() => {
    if (show && normalizedRestaurantId) {
      fetchCategories();
    }
  }, [show, normalizedRestaurantId, fetchCategories]);

  useEffect(() => {
    if (!show || !normalizedRestaurantId || typeof window === 'undefined') {
      return;
    }

    const handleCategoriesUpdated = (event) => {
      const updatedRestaurantId = String(event?.detail?.restaurantId || '');
      if (!updatedRestaurantId || updatedRestaurantId === String(normalizedRestaurantId)) {
        fetchCategories();
      }
    };

    window.addEventListener('categories:updated', handleCategoriesUpdated);
    return () => {
      window.removeEventListener('categories:updated', handleCategoriesUpdated);
    };
  }, [show, normalizedRestaurantId, fetchCategories]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name.startsWith('nutritional_info.')) {
      const key = name.split('.')[1];
      setFormData(prev => ({ ...prev, nutritional_info: { ...prev.nutritional_info, [key]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClose = () => {
    setLoading(false);
    setError('');
    setActiveTab('details');
    onHide();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const authHeaders = {
        'Authorization': `Token ${token}`
      };

      let writableCreateFields = null;
      try {
        const optionsResponse = await axios.options(`${API_BASE_URL}/menu-items/`, {
          headers: authHeaders
        });
        const postActions = optionsResponse?.data?.actions?.POST;
        if (postActions && typeof postActions === 'object') {
          writableCreateFields = Object.keys(postActions);
        }
      } catch (optionsError) {
        // If OPTIONS metadata is unavailable, keep compatibility behavior.
        console.warn('Could not read menu-items OPTIONS metadata:', optionsError?.message || optionsError);
      }

      const acceptsField = (fieldName) => {
        if (!Array.isArray(writableCreateFields)) {
          return true;
        }
        return writableCreateFields.includes(fieldName);
      };

      const numericCategory = Number(formData.category);
      const numericRestaurant = Number(normalizedRestaurantId);

      if (!numericCategory) {
        setError('Please select a category before saving.');
        setLoading(false);
        return;
      }

      if (!numericRestaurant) {
        setError('Restaurant is missing. Reload the page and try again.');
        setLoading(false);
        return;
      }

      const relationFields = {};
      if (Array.isArray(writableCreateFields)) {
        if (acceptsField('category')) {
          relationFields.category = numericCategory;
        } else if (acceptsField('category_id')) {
          relationFields.category_id = numericCategory;
        } else {
          relationFields.category = numericCategory;
        }

        if (acceptsField('restaurant')) {
          relationFields.restaurant = numericRestaurant;
        } else if (acceptsField('restaurant_id')) {
          relationFields.restaurant_id = numericRestaurant;
        } else {
          relationFields.restaurant = numericRestaurant;
        }
      } else {
        // Safe fallback when OPTIONS metadata is unavailable.
        relationFields.category = numericCategory;
        relationFields.restaurant = numericRestaurant;
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        price: String(formData.price),
        ingredients: Array.isArray(formData.ingredients) ? formData.ingredients : [],
        allergens: typeof formData.allergens === 'string'
          ? formData.allergens.split(',').map(s => s.trim()).filter(Boolean)
          : (Array.isArray(formData.allergens) ? formData.allergens : []),
        nutritional_info: {
          ...(formData.nutritional_info.calories !== '' && { calories: Number(formData.nutritional_info.calories) }),
          ...(formData.nutritional_info.protein !== '' && { protein: Number(formData.nutritional_info.protein) }),
          ...(formData.nutritional_info.carbs !== '' && { carbs: Number(formData.nutritional_info.carbs) }),
          ...(formData.nutritional_info.fat !== '' && { fat: Number(formData.nutritional_info.fat) }),
        },
        spice_level: Number(formData.spice_level || 0),
        prep_time: Number(formData.prep_time || 0),
        is_available: Boolean(formData.is_available),
        is_vegetarian: Boolean(formData.is_vegetarian),
        is_vegan: Boolean(formData.is_vegan),
        is_gluten_free: Boolean(formData.is_gluten_free),
        ...relationFields
      };

      const hasCategoryField = Object.prototype.hasOwnProperty.call(payload, 'category') ||
        Object.prototype.hasOwnProperty.call(payload, 'category_id');
      const hasRestaurantField = Object.prototype.hasOwnProperty.call(payload, 'restaurant') ||
        Object.prototype.hasOwnProperty.call(payload, 'restaurant_id');

      if (!hasCategoryField || !hasRestaurantField) {
        console.warn('OPTIONS metadata did not advertise all relation fields; submitting compatibility payload anyway.');
      }

      // console.log('Menu item JSON payload:', payload);

      if (menuItem) {
        const menuItemIdentifier = menuItem?.slug || menuItem?.id;
        if (!menuItemIdentifier) {
          setError('Menu item identifier is missing. Reload and try again.');
          setLoading(false);
          return;
        }

        const submitData = new FormData();
        submitData.append('name', payload.name);
        submitData.append('description', payload.description);
        submitData.append('price', payload.price);
        if (Object.prototype.hasOwnProperty.call(payload, 'category')) {
          submitData.append('category', String(payload.category));
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'category_id')) {
          submitData.append('category_id', String(payload.category_id));
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'restaurant')) {
          submitData.append('restaurant', String(payload.restaurant));
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'restaurant_id')) {
          submitData.append('restaurant_id', String(payload.restaurant_id));
        }
        submitData.append('ingredients', JSON.stringify(payload.ingredients));
        submitData.append('allergens', JSON.stringify(payload.allergens));
        submitData.append('nutritional_info', JSON.stringify(payload.nutritional_info));
        submitData.append('spice_level', String(payload.spice_level));
        submitData.append('prep_time', String(payload.prep_time));
        submitData.append('is_available', String(payload.is_available));
        submitData.append('is_vegetarian', String(payload.is_vegetarian));
        submitData.append('is_vegan', String(payload.is_vegan));
        submitData.append('is_gluten_free', String(payload.is_gluten_free));

        if (formData.image) {
          submitData.append('image', formData.image);
        }

        // console.log('Menu item update payload:', Array.from(submitData.entries()));
        const updateUrl = `${API_BASE_URL}/menu-items/${menuItemIdentifier}/`;
        try {
          await axios.patch(updateUrl, submitData, {
            headers: authHeaders
          });
        } catch (patchError) {
          // Compatibility fallback for endpoints configured for full update only.
          await axios.put(updateUrl, submitData, {
            headers: authHeaders
          });
        }
      } else {
        const createResponse = await axios.post(
          `${API_BASE_URL}/menu-items/`,
          payload,
          {
            headers: authHeaders
          }
        );

        if (formData.image && createResponse?.data?.slug) {
          const imageData = new FormData();
          imageData.append('image', formData.image);

          await axios.patch(
            `${API_BASE_URL}/menu-items/${createResponse.data.slug}/`,
            imageData,
            {
              headers: authHeaders
            }
          );
        }
      }

      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (err) {
      console.error('Error:', err.response?.data);
      setError(formatApiError(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="bg-white br0-25 shadow-4"
        style={{ width: '100%', maxWidth: '640px', margin: '1rem', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <header className="flex justify-between items-center pa1-00 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0', flexShrink: 0 }}>
          <h5 className="mb0-00 gold0 f1-25">
            {menuItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h5>
          <button type="button" className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 pointer" onClick={handleClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        {/* Tabs — only shown when editing */}
        {menuItem && (
          <div className="flex bb" style={{ flexShrink: 0 }}>
            <button
              type="button"
              className={`pa0-75 pointer b f0-90 ${activeTab === 'details' ? 'bg-gold5 brown0 bb b--brown0' : 'bg-transparent brown0 b--transparent'}`}
              style={{ border: 'none', borderBottom: activeTab === 'details' ? '2px solid' : '2px solid transparent' }}
              onClick={() => setActiveTab('details')}
            >
              Item Details
            </button>
            <button
              type="button"
              className={`pa0-75 pointer b f0-90 flex items-center ggap0-25 ${activeTab === 'options' ? 'bg-gold5 brown0' : 'bg-transparent brown0'}`}
              style={{ border: 'none', borderBottom: activeTab === 'options' ? '2px solid' : '2px solid transparent' }}
              onClick={() => setActiveTab('options')}
            >
              Options &amp; Choices
              {(menuItem?.option_groups?.length ?? 0) > 0 && (
                <span className="ba pa0-25 br0-25 bg-brown0 gold0 b--brown0 f0-75">{menuItem.option_groups.length}</span>
              )}
            </button>
          </div>
        )}

        {/* Options tab */}
        {activeTab === 'options' && menuItem && (
          <>
            <div className="pa1-00" style={{ overflowY: 'auto', flexGrow: 1 }}>
              <OptionGroupsEditor menuItemId={menuItem.id} />
            </div>
            <footer className="flex justify-end pa1-00 bt" style={{ flexShrink: 0 }}>
              <button type="button" className="ba pa0-50 br0-25 bg-gold5 brown0 b--brown0 pointer b" onClick={handleClose}>
                Close
              </button>
            </footer>
          </>
        )}

        {/* Details tab */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
            <div className="pa1-00 brown0" style={{ overflowY: 'auto', flexGrow: 1 }}>

              {error && (
                <div className="ba br0-25 pa0-75 mb1-00 bg-gold5 brown0 b f0-85">{error}</div>
              )}

              {categories.length === 0 && (
                <div className="ba br0-25 pa0-75 mb1-00 bg-gold5 brown0 f0-85">
                  <span className="b">No categories found!</span> You need to create menu categories first.
                  {onRequestCreateCategory ? (
                    <button
                      type="button"
                      className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer ml0-50 f0-85"
                      onClick={onRequestCreateCategory}
                    >
                      Create Category
                    </button>
                  ) : (
                    <span className="ml0-25">Please create categories before saving.</span>
                  )}
                </div>
              )}

              <div className="mb1-00">
                <label className="b db mb0-25 f0-90">Item Name *</label>
                <input
                  type="text"
                  className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb1-00">
                <label className="b db mb0-25 f0-90">Description *</label>
                <textarea
                  className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="grid gtc2-m ggap1-00 mb1-00">
                <div>
                  <label className="b db mb0-25 f0-90">Price (GHC) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="b db mb0-25 f0-90">
                    Category *{categories.length > 0 && <span className="normal f0-75 ml0-25">({categories.length} available)</span>}
                  </label>
                  <select
                    className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    disabled={categories.length === 0}
                  >
                    <option value="">
                      {categories.length === 0 ? 'Loading categories...' : 'Select a category'}
                    </option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.meal_period ? `(${cat.meal_period})` : ''}
                      </option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <div className="flex items-center ggap0-50 mt0-25">
                      <span className="f0-75 brown0">No categories found.</span>
                      {onRequestCreateCategory && (
                        <button
                          type="button"
                          className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer f0-75"
                          onClick={onRequestCreateCategory}
                        >
                          Add Category
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gtc2-m ggap1-00 mb1-00">
                <div>
                  <label className="b db mb0-25 f0-90">Spice Level (0–5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                    name="spice_level"
                    value={formData.spice_level}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="b db mb0-25 f0-90">Prep Time (minutes)</label>
                  <input
                    type="number"
                    className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                    name="prep_time"
                    value={formData.prep_time}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="mb1-00">
                <label className="b db mb0-25 f0-90">Item Image</label>
                <input
                  type="file"
                  className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="br0-25 mt0-50"
                    style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover' }}
                  />
                )}
              </div>

              <div className="mb1-00">
                <label className="b db mb0-25 f0-90">Allergens</label>
                <input
                  type="text"
                  className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                  name="allergens"
                  value={formData.allergens}
                  onChange={handleChange}
                  placeholder="e.g. nuts, dairy, gluten (comma-separated)"
                />
                <span className="f0-75 brown0 o-70">Separate each allergen with a comma</span>
              </div>

              <div className="mb1-00">
                <label className="b db mb0-25 f0-90">Nutritional Info <span className="normal f0-75">(per serving)</span></label>
                <div className="grid gtc2-m ggap0-75">
                  {[['calories', 'Calories (kcal)'], ['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fat', 'Fat (g)']].map(([key, label]) => (
                    <div key={key}>
                      <label className="f0-85 db mb0-25">{label}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="w-100 ba br0-25 b--brown0 brown0 pa0-50"
                        name={`nutritional_info.${key}`}
                        value={formData.nutritional_info[key]}
                        onChange={handleChange}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb1-00">
                <label className="b db mb0-25 f0-90">Dietary Options</label>
                <div className="flex flex-column ggap0-25">
                  {[['is_vegetarian', 'Vegetarian'], ['is_vegan', 'Vegan'], ['is_gluten_free', 'Gluten Free']].map(([name, label]) => (
                    <label key={name} className="flex items-center ggap0-50 pointer">
                      <input
                        type="checkbox"
                        name={name}
                        checked={formData[name]}
                        onChange={handleChange}
                      />
                      <span className="f0-90">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center ggap0-50 pointer mb1-00">
                <input
                  type="checkbox"
                  name="is_available"
                  checked={formData.is_available}
                  onChange={handleChange}
                />
                <span className="f0-90">Available for ordering</span>
              </label>

            </div>

            <footer className="flex justify-between items-center pa1-00 bt" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="ba pa0-50 br0-25 bg-gold5 brown0 b--brown0 pointer b"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ba pa0-50 br0-25 bg-brown0 gold0 b--brown0 pointer b"
                disabled={loading || categories.length === 0}
                style={(loading || categories.length === 0) ? { opacity: 0.5 } : undefined}
              >
                {loading ? 'Saving...' : categories.length === 0 ? 'No Categories Available' : 'Save Menu Item'}
              </button>
            </footer>
          </form>
        )}

      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../App';
import { FaTags } from 'react-icons/fa';
import CategoryFormModal from '../../components/CategoryFormModal';

export default function VendorCategoriesPage() {
  const { API_BASE_URL, user } = useApp();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const normalizeArray = (data) => {
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.results)) {
      return data.results;
    }
    return [];
  };

  const restaurantNameById = useMemo(() => {
    const map = new Map();
    restaurants.forEach((restaurant) => {
      map.set(restaurant.id, restaurant.name);
    });
    return map;
  }, [restaurants]);

  const sortedCategories = useMemo(() => {
    const list = [...categories];

    const getComparableValue = (category) => {
      if (sortBy === 'meal_period') {
        return String(category.meal_period || '').toLowerCase();
      }

      if (sortBy === 'restaurant') {
        const categoryRestaurantId = typeof category.restaurant === 'object'
          ? category.restaurant?.id
          : category.restaurant;
        return String(
          restaurantNameById.get(categoryRestaurantId) ||
          category.restaurant_name ||
          ''
        ).toLowerCase();
      }

      return String(category.name || '').toLowerCase();
    };

    list.sort((a, b) => {
      const aValue = getComparableValue(a);
      const bValue = getComparableValue(b);

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return list;
  }, [categories, restaurantNameById, sortBy, sortDirection]);

  const fetchCategoriesData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const authHeaders = {
        headers: {
          'Authorization': `Token ${token}`
        }
      };

      const restaurantsResponse = await axios.get(`${API_BASE_URL}/restaurants/my-restaurants/`, authHeaders);
      const myRestaurants = normalizeArray(restaurantsResponse.data);
      setRestaurants(myRestaurants);

      if (myRestaurants.length === 0) {
        setCategories([]);
        return;
      }

      setSelectedRestaurantId((prev) => {
        if (prev && myRestaurants.some((restaurant) => String(restaurant.id) === String(prev))) {
          return prev;
        }
        return String(myRestaurants[0].id);
      });

      const fetchAllPages = async (initialUrl) => {
        const rows = [];
        let nextUrl = initialUrl;

        while (nextUrl) {
          const response = await axios.get(nextUrl, authHeaders);
          const payload = response.data;

          if (Array.isArray(payload)) {
            rows.push(...payload);
            nextUrl = null;
          } else {
            rows.push(...normalizeArray(payload));
            nextUrl = payload?.next || null;
          }
        }

        return rows;
      };

      const categoryResponses = await Promise.all(
        myRestaurants.map(async (restaurant) => {
          const rows = await fetchAllPages(`${API_BASE_URL}/categories/?restaurant=${restaurant.id}`);
          return rows.map((category) => ({
            ...category,
            restaurant: category?.restaurant || restaurant.id,
            restaurant_name: category?.restaurant_name || restaurant.name,
            restaurant_id: category?.restaurant_id || restaurant.id,
          }));
        })
      );

      const categoryMap = new Map();
      categoryResponses.forEach((categoriesList) => {
        categoriesList.forEach((category) => {
          if (!categoryMap.has(category.id)) {
            categoryMap.set(category.id, category);
          }
        });
      });

      setCategories(Array.from(categoryMap.values()));
    } catch (error) {
      console.error('Failed to load vendor categories:', error);
      setRestaurants([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchCategoriesData();
  }, [fetchCategoriesData]);

  const handleDeleteCategory = async (category) => {
    const categoryIdentifier = category?.slug || category?.id;
    if (!categoryIdentifier) {
      setActionError('Category identifier is missing. Reload and try again.');
      return;
    }

    const confirmed = window.confirm(
      `Delete category \"${category.name || 'this category'}\"? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setActionError('');
      setDeleteLoadingId(category.id);
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/categories/${categoryIdentifier}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      await fetchCategoriesData();
    } catch (error) {
      console.error('Failed to delete category:', error);
      const apiError = error?.response?.data;
      if (typeof apiError?.detail === 'string') {
        setActionError(apiError.detail);
      } else if (typeof apiError === 'string') {
        setActionError(apiError);
      } else {
        setActionError('Failed to delete category. Please try again.');
      }
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const resolveCategoryRestaurantId = (category) => {
    const restaurantValue = category?.restaurant;

    if (restaurantValue && typeof restaurantValue === 'object') {
      return restaurantValue.id || category?.restaurant_id || null;
    }

    if (typeof restaurantValue === 'number') {
      return restaurantValue;
    }

    if (typeof restaurantValue === 'string') {
      const parsedNumeric = Number(restaurantValue);
      if (!Number.isNaN(parsedNumeric)) {
        return parsedNumeric;
      }

      const pathMatch = restaurantValue.match(/\/restaurants\/(\d+)\/?$/i);
      if (pathMatch?.[1]) {
        return Number(pathMatch[1]);
      }
    }

    const fallbackId = Number(category?.restaurant_id);
    return Number.isNaN(fallbackId) ? null : fallbackId;
  };

  if (!user) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">Please log in to access your categories.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const selectedRestaurantName = restaurantNameById.get(Number(selectedRestaurantId)) || 'restaurant';

  return (
    <div className="container container90 mt-4 mb-5">
      <div className="flex justify-between align-center 
        mv2-00 pa1-00 
        bg-brown0 
        br0-25"
      >
        <Link to="/vendor/dashboard" 
            className="ba pa0-50 br0-25 flex items-center brown0 bg-gold0">
          ← Dashboard
        </Link>
        <button
          type="button"
          className="ba pa0-50 br0-25 gold0 bg-transparent b--gold0 pointer"
          onClick={() => setShowAddCategoryModal(true)}
          disabled={restaurants.length === 0}
        >
          + Add Category
        </button>
      </div>

      <div className="grid gtc12 relative ggap1-00 brown0 bg-white">
        <aside className="gc1s12 gc1s3-m">
          <div className="sticky top-2" style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}>
            <div className="mb1-00 bg-brown0 br0-25 pa1-00">
              <h2 className="f1-25 gold0 mb1-00 bb pb0-50">My Categories</h2>
              <div className="grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f2-00 fw7 gold0">{categories.length}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Categories</div>
                </div>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f2-00 fw7 gold0">{restaurants.length}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Restaurants</div>
                </div>
              </div>
            </div>

            {actionError && (
              <div className="alert alert-danger">{actionError}</div>
            )}

            <div className="mb1-00">
              <p className="bg-brown0 pa0-50 br0-25 mb1-00 f1-25 gold0 flex items-center justify-center">Controls</p>

              {restaurants.length > 1 && (
                <div className="mb1-00">
                  <label className="form-label mb-1">Default restaurant for new categories</label>
                  <select
                    className="form-select"
                    value={selectedRestaurantId}
                    onChange={(event) => setSelectedRestaurantId(event.target.value)}
                  >
                    {restaurants.map((restaurant) => (
                      <option key={restaurant.id} value={String(restaurant.id)}>
                        {restaurant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb1-00">
                <label className="form-label mb-1">Sort categories by</label>
                <select
                  className="form-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="name">Name</option>
                  <option value="meal_period">Meal period</option>
                  <option value="restaurant">Restaurant</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              >
                {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>

            {restaurants.length > 0 && (
              <div className="small text-muted mt-2">
                New categories will be created under <strong>{selectedRestaurantName}</strong>.
              </div>
            )}
          </div>
        </aside>

        <div className="gc1s12 gc4s9-m min-w-0">
          <div className="shadow-4 mb2-00">
            <header>
              <h5 className="flex items-center mb0-00 f1-50 bt bb bw2 bg-gold0 pa0-50">
                Vendor Categories
                {categories.length > 0 && (
                  <span className="badge ms-2" style={{ background: '#5c3d2e', color: '#f5a623', fontSize: '0.75rem' }}>
                    {categories.length} total
                  </span>
                )}
              </h5>
            </header>
          </div>

          {categories.length === 0 ? (
            <div className="alert alert-info text-center">
              <h4>No categories yet</h4>
              <p>Create your first category to organize menu items.</p>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddCategoryModal(true)}
                disabled={restaurants.length === 0}
              >
                <FaTags className="mr0-25" aria-hidden="true" /> Create Category
              </button>
            </div>
          ) : (
            <div className="row">
              {sortedCategories.map((category) => {
                const categoryRestaurantId = resolveCategoryRestaurantId(category);

                return (
                    <div key={category.id} 
                        className="grid gtc1 gtc2-m gtc3-l gc6s12-m mb1-00">
                    <div className="">
                      {category.image && (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="card-img-top"
                          style={{ height: '180px', objectFit: 'cover' }}
                        />
                      )}
                      <div className="card-body">
                        <h5 className="card-title mb-1">{category.name}</h5>
                        {category.meal_period && (
                          <span className="badge bg-light text-dark mb-2 text-uppercase">
                            {String(category.meal_period).replace(/_/g, ' ')}
                          </span>
                        )}
                        <p className="text-muted small mb-2">
                          {category.description || 'No description yet.'}
                        </p>
                        <div className="mb1-00">
                          Restaurant: {restaurantNameById.get(categoryRestaurantId) || category.restaurant_name || 'Unknown'}
                        </div>
                        <div className="mb1-00 d-flex gap-2 flex-wrap">
                          <Link
                            to={`/categories/${category.slug || category.id}`}
                            className="ba pa0-25 br0-25 b--g0ld0 bg-gold1 pointer"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            className="pa0-25 ba br0-25 mh0-50 b--g0ld0 bg-gold1 pointer"
                            onClick={() => setEditingCategory(category)}
                          >
                            Edit Category
                          </button>
                          <button
                            type="button"
                            className="pa0-25 br0-25 b--none  bg-brown0 gold0"
                            onClick={() => handleDeleteCategory(category)}
                            disabled={deleteLoadingId === category.id}
                          >
                            {deleteLoadingId === category.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CategoryFormModal
        show={showAddCategoryModal}
        onHide={() => setShowAddCategoryModal(false)}
        restaurantId={selectedRestaurantId}
        onSuccess={() => {
          setShowAddCategoryModal(false);
          fetchCategoriesData();
        }}
      />
      <CategoryFormModal
        show={Boolean(editingCategory)}
        onHide={() => setEditingCategory(null)}
        category={editingCategory}
        restaurantId={
          editingCategory
            ? resolveCategoryRestaurantId(editingCategory)
            : selectedRestaurantId
        }
        onSuccess={() => {
          setEditingCategory(null);
          fetchCategoriesData();
        }}
      />

    </div>
  );
}
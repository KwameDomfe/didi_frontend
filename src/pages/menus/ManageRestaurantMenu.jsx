import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../App';
import axios from 'axios';
import MenuItemCard from './MenuItemCard';
import MenuItemFormModal from '../../components/MenuItemFormModal';
import CategoryFormModal from '../../components/CategoryFormModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { FaTags, FaPlusCircle, FaUtensils, FaFolderOpen, FaEdit, FaTrash } from 'react-icons/fa';
import { canManageRestaurants } from '../../utils/userRoles';

export default function ManageRestaurantMenu() {
  const { slug } = useParams();
  const { API_BASE_URL, user } = useApp();
  const [restaurant, setRestaurant] = useState(null);
  const [ownedRestaurants, setOwnedRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesById, setCategoriesById] = useState({});
  const [categoriesBySlug, setCategoriesBySlug] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const isAggregateView = !slug;

  const normalizeMenuItems = (data) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.results)) {
      return data.results;
    }

    return [];
  };

  const normalizeCategories = (data) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.results)) {
      return data.results;
    }

    return [];
  };

  const buildCategoryMaps = (categories) => {
    const byId = {};
    const bySlug = {};

    categories.forEach((category) => {
      const categoryName = category?.name || 'Uncategorized';

      if (category?.id !== undefined && category?.id !== null) {
        byId[String(category.id)] = categoryName;
      }

      if (category?.slug) {
        bySlug[String(category.slug).toLowerCase()] = categoryName;
      }
    });

    return { byId, bySlug };
  };

  const fetchAllPages = useCallback(async (initialUrl, headers) => {
    const results = [];
    let nextUrl = initialUrl;

    while (nextUrl) {
      const response = await axios.get(nextUrl, { headers });
      const payload = response.data;

      if (Array.isArray(payload)) {
        results.push(...payload);
        nextUrl = null;
      } else {
        results.push(...normalizeCategories(payload));
        nextUrl = payload?.next || null;
      }
    }

    return results;
  }, []);

  const fetchRestaurantAndMenu = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const authHeaders = {
        'Authorization': `Token ${token}`
      };

      if (isAggregateView) {
        const restaurantsResponse = await axios.get(
          `${API_BASE_URL}/restaurants/my-restaurants/`,
          {
            headers: authHeaders
          }
        );

        const restaurantsData = Array.isArray(restaurantsResponse.data)
          ? restaurantsResponse.data
          : restaurantsResponse.data?.results || [];

        setOwnedRestaurants(restaurantsData);
        setRestaurant(restaurantsData.length === 1 ? restaurantsData[0] : null);

        const menuResponses = await Promise.all(
          restaurantsData.map((ownedRestaurant) => axios.get(
            `${API_BASE_URL}/menu-items/?restaurant=${ownedRestaurant.id}`,
            {
              headers: authHeaders
            }
          ))
        );

        const allMenuItems = menuResponses.flatMap((response) => normalizeMenuItems(response.data));
        setMenuItems(allMenuItems);

        const categoryResponses = await Promise.all(
          restaurantsData.map(async (ownedRestaurant) => {
            const rows = await fetchAllPages(
              `${API_BASE_URL}/categories/?restaurant=${ownedRestaurant.id}`,
              authHeaders
            );

            return rows.map((category) => ({
              ...category,
              restaurant: ownedRestaurant.id,
              restaurant_name: ownedRestaurant.name
            }));
          })
        );

        const allCategories = categoryResponses.flat();
        setCategories(allCategories);
        const categoryMaps = buildCategoryMaps(allCategories);
        setCategoriesById(categoryMaps.byId);
        setCategoriesBySlug(categoryMaps.bySlug);
      } else {
        const restaurantResponse = await axios.get(`${API_BASE_URL}/restaurants/${slug}/`);
        setRestaurant(restaurantResponse.data);
        setOwnedRestaurants([restaurantResponse.data]);

        const menuResponse = await axios.get(
          `${API_BASE_URL}/menu-items/?restaurant=${restaurantResponse.data.id}`,
          {
            headers: authHeaders
          }
        );
        setMenuItems(normalizeMenuItems(menuResponse.data));

        const restaurantCategories = await fetchAllPages(
          `${API_BASE_URL}/categories/?restaurant=${restaurantResponse.data.id}`,
          authHeaders
        );
        const enrichedCategories = restaurantCategories.map((category) => ({
          ...category,
          restaurant: restaurantResponse.data.id,
          restaurant_name: restaurantResponse.data.name
        }));
        setCategories(enrichedCategories);
        const categoryMaps = buildCategoryMaps(enrichedCategories);
        setCategoriesById(categoryMaps.byId);
        setCategoriesBySlug(categoryMaps.bySlug);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setRestaurant(null);
      setOwnedRestaurants([]);
      setMenuItems([]);
      setCategories([]);
      setCategoriesById({});
      setCategoriesBySlug({});
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, fetchAllPages, isAggregateView, slug]);

  useEffect(() => {
    fetchRestaurantAndMenu();
  }, [fetchRestaurantAndMenu]);

  const groupedMenuItems = useMemo(() => {
    const resolveCategoryName = (item) => {
      const categoryObject = item?.category && typeof item.category === 'object' ? item.category : null;

      if (item?.category_name) {
        return item.category_name;
      }

      if (categoryObject?.name) {
        return categoryObject.name;
      }

      const directId = item?.category_id ?? categoryObject?.id;
      if (directId !== undefined && directId !== null && categoriesById[String(directId)]) {
        return categoriesById[String(directId)];
      }

      if (categoryObject?.slug && categoriesBySlug[String(categoryObject.slug).toLowerCase()]) {
        return categoriesBySlug[String(categoryObject.slug).toLowerCase()];
      }

      if (typeof item?.category === 'string') {
        const categoryValue = item.category.trim();
        const categoryPathMatch = categoryValue.match(/\/categories\/([^/]+)\/?$/i);
        const extracted = categoryPathMatch?.[1] || categoryValue;

        if (categoriesById[String(extracted)]) {
          return categoriesById[String(extracted)];
        }

        if (categoriesBySlug[String(extracted).toLowerCase()]) {
          return categoriesBySlug[String(extracted).toLowerCase()];
        }

        if (isNaN(Number(extracted)) && !/\//.test(categoryValue) && !/^https?:/i.test(categoryValue)) {
          return extracted;
        }
      }

      if (typeof item?.category === 'number' && categoriesById[String(item.category)]) {
        return categoriesById[String(item.category)];
      }

      return 'Uncategorized';
    };

    const resolveCategoryKey = (item, restaurantName) => {
      const categoryObject = item?.category && typeof item.category === 'object' ? item.category : null;
      const directId = item?.category_id ?? categoryObject?.id;

      if (directId !== undefined && directId !== null) {
        return `id:${directId}`;
      }

      if (categoryObject?.slug) {
        return `slug:${String(categoryObject.slug).toLowerCase()}`;
      }

      if (typeof item?.category === 'string') {
        const categoryValue = item.category.trim();
        const categoryPathMatch = categoryValue.match(/\/categories\/([^/]+)\/?$/i);
        const extracted = categoryPathMatch?.[1] || categoryValue;
        const numericValue = Number(extracted);

        if (!isNaN(numericValue)) {
          return `id:${numericValue}`;
        }

        if (!/\//.test(categoryValue) && !/^https?:/i.test(categoryValue)) {
          return `name:${extracted.toLowerCase()}`;
        }
      }

      if (typeof item?.category === 'number') {
        return `id:${item.category}`;
      }

      return `uncategorized:${restaurantName}`;
    };

    const grouped = menuItems.reduce((acc, item) => {
      const restaurantName = item.restaurant_name || item.restaurant?.name || restaurant?.name || 'Unknown Restaurant';
      const categoryName = resolveCategoryName(item);
      const categoryKey = resolveCategoryKey(item, restaurantName);
      const groupKey = isAggregateView ? `${restaurantName}::${categoryKey}` : categoryKey;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          key: groupKey,
          title: isAggregateView ? `${restaurantName} - ${categoryName}` : categoryName,
          items: []
        };
      }

      acc[groupKey].items.push(item);
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.title.localeCompare(b.title));
  }, [categoriesById, categoriesBySlug, isAggregateView, menuItems, restaurant]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const restaurantA = String(a?.restaurant_name || '').toLowerCase();
      const restaurantB = String(b?.restaurant_name || '').toLowerCase();
      const nameA = String(a?.name || '').toLowerCase();
      const nameB = String(b?.name || '').toLowerCase();

      if (restaurantA !== restaurantB) {
        return restaurantA.localeCompare(restaurantB);
      }

      return nameA.localeCompare(nameB);
    });
  }, [categories]);

  const handleDeleteCategory = useCallback(async () => {
    const categoryIdentifier = deletingCategory?.slug || deletingCategory?.id;
    if (!categoryIdentifier) {
      setActionError('Category identifier is missing. Reload the page and try again.');
      setDeletingCategory(null);
      return;
    }

    try {
      setDeleteLoading(true);
      setActionError('');
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/categories/${categoryIdentifier}/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      });
      setDeletingCategory(null);
      await fetchRestaurantAndMenu();
    } catch (err) {
      console.error('Failed to delete category:', err);
      const errorData = err?.response?.data;
      if (typeof errorData?.detail === 'string') {
        setActionError(errorData.detail);
      } else if (typeof errorData === 'string') {
        setActionError(errorData);
      } else {
        setActionError('Failed to delete category. Please try again.');
      }
    } finally {
      setDeleteLoading(false);
    }
  }, [API_BASE_URL, deletingCategory, fetchRestaurantAndMenu]);

  if (loading) {
    return (
      <div className="container90 mt3-00 tc">
        <div className="f0-85 silver" style={{ letterSpacing: '0.05em' }}>Loading menu manager...</div>
      </div>
    );
  }

  if (!isAggregateView && !restaurant) {
    return (
      <div className="container90 mt3-00">
        <div className="pa1-00 br0-25" style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}>
          Restaurant not found.
        </div>
      </div>
    );
  }

  const hasManagementRole = canManageRestaurants(user);
  const canManageAggregate = Boolean(user && (hasManagementRole || ownedRestaurants.length > 0));
  const canManageSingle = Boolean(user && restaurant && (
    restaurant.owner === user.id ||
    restaurant.owner?.id === user.id ||
    hasManagementRole
  ));
  const canManage = isAggregateView ? canManageAggregate : canManageSingle;

  const pageTitle = isAggregateView
    ? 'My Menu Items'
    : `${restaurant.name} - Menu Management`;
  const pageDescription = isAggregateView
    ? 'Review and manage menu items across your restaurants'
    : 'Add, edit, or remove menu items';
  const canAddMenuItem = !isAggregateView || ownedRestaurants.length === 1;
  const canAddCategory = !isAggregateView || ownedRestaurants.length === 1;
  const addRestaurantId = restaurant?.id || (ownedRestaurants.length === 1 ? ownedRestaurants[0].id : null);

  if (!canManage) {
    return (
      <div className="container90 mt3-00">
        <div className="pa1-00 br0-25" style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}>
          You don't have permission to manage this restaurant.
        </div>
      </div>
    );
  }

  return (
    <div className="container90 mt1-00 mb4-00">
      <nav aria-label="breadcrumb" className="mb1-00">
        <ol className="flex items-center flex-wrap pa0-50 br0-25 bg-white ba" style={{ gap: '0.5rem', borderColor: 'rgba(117,18,1,0.15)' }}>
          <li>
            <Link to="/vendor/dashboard" className="brown0">Dashboard</Link>
          </li>
          {!isAggregateView && (
            <>
              <li className="silver">/</li>
              <li>
                <Link to={`/restaurants/${restaurant.slug}`} className="brown0">{restaurant.name}</Link>
              </li>
            </>
          )}
          <li className="silver">/</li>
          <li className="b brown0">Manage Menu</li>
        </ol>
      </nav>

      <div className="flex justify-between items-start flex-wrap mb1-50 bg-brown0 pa1-00 br0-25" style={{ gap: '0.75rem' }}>
        <div>
          <h1 className="f1-50 gold0 mb0-25">{pageTitle}</h1>
          <p className="mb0-00 white f0-75" style={{ opacity: 0.75 }}>{pageDescription}</p>
        </div>
        {canAddMenuItem ? (
          <div className="flex flex-wrap items-center" style={{ gap: '0.5rem' }}>
            <button
              className="ba pa0-50 br0-25 bg-transparent gold0 pointer"
              style={{ borderColor: 'rgba(250,223,150,0.35)' }}
              onClick={() => setShowAddCategoryModal(true)}
              disabled={!canAddCategory}
            >
              <FaTags className="mr0-25" aria-hidden="true" />Add Category
            </button>
            <button
              className="ba pa0-50 br0-25 bg-gold0 brown0 b pointer"
              style={{ borderColor: 'transparent' }}
              onClick={() => setShowAddModal(true)}
            >
              <FaPlusCircle className="mr0-25" aria-hidden="true" />Add Menu Item
            </button>
          </div>
        ) : (
          <div className="silver f0-75 tr" style={{ maxWidth: '240px' }}>
            Open a restaurant-specific menu page from your dashboard to add new items or categories.
          </div>
        )}
      </div>

      {actionError && (
        <div className="pa0-75 br0-25 mb1-00" style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}>{actionError}</div>
      )}

      <div className="grid gtc12 ggap1-00 mb1-50">
        <div className="gc1s12 gc1s4-m">
          <div className="bg-white shadow-4 br0-25 pa1-00 tc">
            <h3 className="blue0 f2-00 mb0-25">{menuItems.length}</h3>
            <p className="silver mb0-00 f0-75">Total Items</p>
          </div>
        </div>
        <div className="gc1s12 gc5s4-m">
          <div className="bg-white shadow-4 br0-25 pa1-00 tc">
            <h3 className="mb0-25 f2-00" style={{ color: '#198754' }}>
              {menuItems.filter(item => item.is_available).length}
            </h3>
            <p className="silver mb0-00 f0-75">Available</p>
          </div>
        </div>
        <div className="gc1s12 gc9s4-m">
          <div className="bg-white shadow-4 br0-25 pa1-00 tc">
            <h3 className="mb0-25 f2-00" style={{ color: '#f0ad4e' }}>
              {menuItems.filter(item => !item.is_available).length}
            </h3>
            <p className="silver mb0-00 f0-75">Unavailable</p>
          </div>
        </div>
      </div>

      {sortedCategories.length > 0 && (
        <section className="mb3-00">
          <div className="flex justify-between items-center mb1-00">
            <div>
              <h3 className="mb0-25 brown0">Categories</h3>
              <p className="silver mb0-00 f0-75">Manage category structure alongside your menu items</p>
            </div>
          </div>
          <div className="grid gtc12 ggap1-00">
            {sortedCategories.map((category) => {
              const categoryRouteSlug = category.slug || String(category.name || '').toLowerCase().replace(/\s+/g, '-');

              return (
                <div key={category.id} className="gc1s12 gc1s6-m gc1s4-l">
                  <div className="bg-white h-100 shadow-4 br0-25 of-hidden">
                    {category.image && (
                      <img
                        src={category.image}
                        alt={category.name}
                        style={{ height: '160px', objectFit: 'cover' }}
                      />
                    )}
                    <div className="pa0-75 flex flex-column" style={{ minHeight: '220px' }}>
                      <h5 className="mb0-25 brown0">{category.name}</h5>
                      {category.meal_period && (
                        <span className="pa0-25 br0-25 f0-75 mb0-50 self-start brown0" style={{ background: 'rgba(117,18,1,0.1)', textTransform: 'uppercase' }}>
                          {String(category.meal_period).replace(/_/g, ' ')}
                        </span>
                      )}
                      <p className="silver f0-75 mb0-50 flex-grow-1">
                        {category.description || 'No description yet.'}
                      </p>
                      {isAggregateView && category.restaurant_name && (
                        <div className="f0-75 silver mb0-75">
                          Restaurant: {category.restaurant_name}
                        </div>
                      )}
                      <div className="flex flex-wrap mt-auto" style={{ gap: '0.5rem' }}>
                        <Link
                          to={`/categories/${categoryRouteSlug}`}
                          className="ba pa0-25 br0-25 bg-transparent brown0"
                          style={{ borderColor: 'rgba(117,18,1,0.35)' }}
                        >
                          <FaFolderOpen className="mr0-25" aria-hidden="true" />View
                        </Link>
                        <button
                          type="button"
                          className="ba pa0-25 br0-25 bg-transparent brown0 pointer"
                          style={{ borderColor: 'rgba(117,18,1,0.35)' }}
                          onClick={() => {
                            setActionError('');
                            setEditingCategory(category);
                          }}
                        >
                          <FaEdit className="mr0-25" aria-hidden="true" />Edit
                        </button>
                        <button
                          type="button"
                          className="ba pa0-25 br0-25 bg-transparent pointer"
                          style={{ borderColor: 'rgba(220,53,69,0.35)', color: '#dc3545' }}
                          onClick={() => {
                            setActionError('');
                            setDeletingCategory(category);
                          }}
                        >
                          <FaTrash className="mr0-25" aria-hidden="true" />Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {menuItems.length === 0 ? (
        <div className="bg-white shadow-4 br0-25 pa2-00 tc">
          <h4 className="brown0 mb0-50">No menu items yet</h4>
          <p className="silver mb1-00">Start building your menu by adding your first item.</p>
          <button
            className="ba pa0-50 br0-25 bg-brown0 gold0 b pointer"
            style={{ borderColor: 'transparent' }}
            onClick={() => setShowAddModal(true)}
          >
            <FaPlusCircle className="mr0-25" aria-hidden="true" />Add First Menu Item
          </button>
          {canAddCategory && (
            <button
              className="ba pa0-50 br0-25 bg-transparent brown0 pointer ml0-50"
              style={{ borderColor: 'rgba(117,18,1,0.35)' }}
              onClick={() => setShowAddCategoryModal(true)}
            >
              <FaTags className="mr0-25" aria-hidden="true" />Create Category First
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-column" style={{ gap: '1.5rem' }}>
          {groupedMenuItems.map((group) => (
            <section key={group.key}>
              <h4 className="mb1-00 brown0">
                {group.title} ({group.items.length} items)
              </h4>
              <div className="grid gtc12 ggap1-00">
                {group.items.map(item => (
                  <div key={item.id} className="gc1s12 gc1s6-m gc1s4-l">
                    <MenuItemCard
                      item={item}
                      onUpdate={fetchRestaurantAndMenu}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <MenuItemFormModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        restaurantId={addRestaurantId}
        onRequestCreateCategory={() => setShowAddCategoryModal(true)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchRestaurantAndMenu();
        }}
      />
      <CategoryFormModal
        show={showAddCategoryModal}
        onHide={() => setShowAddCategoryModal(false)}
        restaurantId={addRestaurantId}
        onSuccess={() => {
          setShowAddCategoryModal(false);
          fetchRestaurantAndMenu();
        }}
      />
      <CategoryFormModal
        show={Boolean(editingCategory)}
        onHide={() => setEditingCategory(null)}
        category={editingCategory}
        restaurantId={
          editingCategory
            ? (typeof editingCategory.restaurant === 'object' ? editingCategory.restaurant?.id : editingCategory.restaurant)
            : addRestaurantId
        }
        onSuccess={() => {
          setEditingCategory(null);
          fetchRestaurantAndMenu();
        }}
      />
      <DeleteConfirmModal
        isOpen={Boolean(deletingCategory)}
        itemName={deletingCategory?.name || 'this category'}
        onCancel={() => {
          if (!deleteLoading) {
            setDeletingCategory(null);
          }
        }}
        onConfirm={handleDeleteCategory}
      />
    </div>
  );
}

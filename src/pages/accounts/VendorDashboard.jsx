import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../App';
import axios from 'axios';
import RestaurantCard from '../../components/RestaurantCard';
import RestaurantFormModal from '../../components/RestaurantFormModal';
import CategoryFormModal from '../../components/CategoryFormModal';
import { FaTh, FaTags, FaPlusCircle, FaStore, FaListUl } from 'react-icons/fa';
import VendorCuisineManager from '../../components/VendorCuisineManager';
import { Link } from 'react-router-dom';
import { canManageRestaurants } from '../../utils/userRoles';

export default function VendorDashboard() {
  const { API_BASE_URL, user } = useApp();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [categoryRestaurantId, setCategoryRestaurantId] = useState('');
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalMenuItems: 0,
    activeRestaurants: 0
  });

  const fetchMyRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${API_BASE_URL}/restaurants/my-restaurants/`,
        {
          headers: {
            'Authorization': `Token ${token}`
          }
        }
      );
      setRestaurants(response.data);

      if (response.data.length > 0) {
        setCategoryRestaurantId((prev) => {
          if (prev && response.data.some((restaurant) => String(restaurant.id) === String(prev))) {
            return prev;
          }
          return String(response.data[0].id);
        });
      }
      
      // Calculate stats
      const totalMenuItems = response.data.reduce((sum, r) => sum + (r.menu_items_count || 0), 0);
      const activeRestaurants = response.data.filter(r => r.is_active).length;
      
      setStats({
        totalRestaurants: response.data.length,
        totalMenuItems,
        activeRestaurants,
      });
    } catch (err) {
      console.error('Failed to fetch restaurants:', err);
    } finally {
      setLoading(false);
    }

  }, [API_BASE_URL]);

  useEffect(() => {
    if (user) {
      fetchMyRestaurants();
    }
  }, [user, fetchMyRestaurants]);

  if (!user) {
    return (
      <div className="container90 mt3-00">
        <div className="bg-gold0 brown0 pa1-00 br0-25">
          Please log in to access your dashboard.
        </div>
      </div>
    );
  }

  if (!canManageRestaurants(user)) {
    return (
      <div className="container90 mt3-00">
        <div className="pa1-00 br0-25" style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}>
          You don't have permission to access this page. Only vendors and admins can manage restaurants.
        </div>
      </div>
    );
  }

  const inactiveRestaurants = Math.max(0, stats.totalRestaurants - stats.activeRestaurants);
  const avgItemsPerRestaurant = stats.totalRestaurants > 0
    ? (stats.totalMenuItems / stats.totalRestaurants).toFixed(1)
    : '0.0';
  const topRestaurant = restaurants
    .slice()
    .sort((a, b) => (b.menu_items_count || 0) - (a.menu_items_count || 0))[0];

  return (
    <div className="container90 mt1-00 mb4-00">
      <VendorCuisineManager />

      {/* ── Top bar ── */}
      <div className="flex justify-between items-center mv1-00 bg-brown0 pa1-00 br0-25">
        <div>
          <h1 className="f1-25 gold0 mb0-00 b">Restaurant Dashboard</h1>
          <p className="f0-75 mb0-00 white" style={{ opacity: 0.7 }}>
            {user?.first_name ? `Welcome back, ${user.first_name}.` : 'Manage your restaurants, menus, and categories.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center" style={{ gap: '0.5rem' }}>
          <Link
            to="/vendor/categories"
            className="ba pa0-50 br0-25 flex items-center gold0"
            style={{ borderColor: 'rgba(250,223,150,0.4)', fontSize: '0.85rem' }}
          >
            <FaTh style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />Categories
          </Link>
          <button
            className="ba pa0-50 br0-25 bg-transparent gold0 pointer"
            style={{ borderColor: 'rgba(250,223,150,0.4)', fontSize: '0.85rem' }}
            onClick={() => {
              if (restaurants.length > 0) setCategoryRestaurantId(String(restaurants[0].id));
              setShowAddCategoryModal(true);
            }}
            disabled={restaurants.length === 0}
          >
            <FaTags style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />Add Category
          </button>
          <button
            className="ba pa0-50 br0-25 bg-gold0 brown0 pointer b"
            style={{ borderColor: 'transparent', fontSize: '0.85rem' }}
            onClick={() => setShowAddModal(true)}
          >
            <FaPlusCircle style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />New Restaurant
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid gtc12 ggap1-00" style={{ overflow: 'visible' }}>

        {/* ── Aside: stats + focus ── */}
        <aside className="gc1s12 gc1s3-m">
          <div className="sticky top-2" style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}>

            {/* Stats panel */}
            <div className="bg-brown0 br0-25 pa1-00 mb1-00">
              <h2 className="f1-00 gold0 mb1-00 bb pb0-50" style={{ borderColor: 'rgba(250,223,150,0.3)' }}>
                Overview
              </h2>
              <div className="grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-75 b gold0">{stats.totalRestaurants}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Restaurants</div>
                  <div className="f0-75" style={{ color: '#a3c96e', opacity: 0.9 }}>{stats.activeRestaurants} active</div>
                </div>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-75 b gold0">{stats.totalMenuItems}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Menu Items</div>
                  <div className="f0-75" style={{ color: 'rgba(255,255,255,0.5)' }}>{avgItemsPerRestaurant} avg</div>
                </div>
                {inactiveRestaurants > 0 && (
                  <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,193,7,0.12)', gridColumn: '1 / -1' }}>
                    <div className="f1-50 b" style={{ color: '#ffc107' }}>{inactiveRestaurants}</div>
                    <div className="f0-75 white" style={{ opacity: 0.8 }}>inactive — needs review</div>
                  </div>
                )}
              </div>
            </div>

            {/* Focus card */}
            <div className="bg-brown0 br0-25 pa1-00">
              <h2 className="f1-00 gold0 mb0-75 bb pb0-50" style={{ borderColor: 'rgba(250,223,150,0.3)' }}>
                Focus
              </h2>
              {topRestaurant ? (
                <>
                  <p className="f0-75 white mb0-25" style={{ opacity: 0.8 }}>Largest menu</p>
                  <p className="f0-85 gold0 b mb0-50">{topRestaurant.name}</p>
                  <p className="f0-75 white mb0-00" style={{ opacity: 0.6 }}>
                    {topRestaurant.menu_items_count || 0} items
                  </p>
                </>
              ) : (
                <p className="f0-75 white mb0-00" style={{ opacity: 0.6 }}>
                  Add your first restaurant to start tracking.
                </p>
              )}
            </div>

          </div>
        </aside>

        {/* ── Main: restaurant cards ── */}
        <div className="gc1s12 gc4s9-m min-w-0">

          {/* Section header */}
          <div className="shadow-4 mb1-00">
            <header className="bg-gold0 bt bb bw2 pa0-75 flex justify-between items-center">
              <h2 className="f1-25 brown0 b mb0-00">
                My Restaurants
                {!loading && restaurants.length > 0 && (
                  <span
                    className="ml0-50 pa0-25 br0-25 f0-75"
                    style={{ background: 'rgba(117,18,1,0.12)', color: 'rgb(117,18,1)' }}
                  >
                    {restaurants.length}
                  </span>
                )}
              </h2>
              <span className="f0-75 brown0" style={{ opacity: 0.7 }}>
                Manage menus and categories per restaurant
              </span>
            </header>
          </div>

          {/* Content */}
          {loading ? (
            <div className="tc pv4-00">
              <div className="f0-75 silver" style={{ letterSpacing: '0.05em' }}>Loading…</div>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="bg-white shadow-4 br0-25 pa2-00 tc">
              <FaStore aria-hidden="true" style={{ display: 'block', fontSize: '3rem', color: '#999', margin: '0 auto 1rem' }} />
              <h4 className="mb0-50 dark-gray">No restaurants yet</h4>
              <p className="silver mb1-25 f0-85">
                Add your first restaurant, then create categories and menu items.
              </p>
              <button
                className="ba pa0-75 br0-25 bg-brown0 gold0 b pointer"
                style={{ border: 'none' }}
                onClick={() => setShowAddModal(true)}
              >
                <FaPlusCircle style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />Add Restaurant
              </button>
            </div>
          ) : (
            <div className="grid gtc12 ggap1-00">
              {restaurants.map(restaurant => (
                <div key={restaurant.id} className="gc1s12 gc1s6-m gc1s4-l">
                  <RestaurantCard
                    restaurant={restaurant}
                    onUpdate={fetchMyRestaurants}
                  />
                  <div className="flex mt0-50" style={{ gap: '0.5rem' }}>
                    <Link
                      to={`/vendor/restaurants/${restaurant.slug}/menu`}
                      className="ba pa0-50 br0-25 flex-grow-1 tc brown0 bg-gold0 b"
                      style={{ fontSize: '0.82rem', borderColor: 'transparent' }}
                    >
                      <FaListUl style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />Manage Menu
                    </Link>
                    <button
                      type="button"
                      className="ba pa0-50 br0-25 flex-grow-1 bg-brown0 gold0 pointer"
                      style={{ fontSize: '0.82rem', borderColor: 'transparent' }}
                      onClick={() => {
                        setCategoryRestaurantId(String(restaurant.id));
                        setShowAddCategoryModal(true);
                      }}
                    >
                      <FaTags style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />Add Category
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RestaurantFormModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchMyRestaurants();
        }}
      />

      <CategoryFormModal
        show={showAddCategoryModal}
        onHide={() => setShowAddCategoryModal(false)}
        restaurantId={categoryRestaurantId}
        onSuccess={() => {
          setShowAddCategoryModal(false);
          fetchMyRestaurants();
        }}
      />
    </div>
  );
}

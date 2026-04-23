import React from 'react';
import axios from 'axios';
import { useApp } from '../../App';
import RestaurantCard from '../../components/RestaurantCard';
import '../../components/SkeletonLoader.css';
import { Link, useParams } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';

// Restaurants page component
const RestaurantsPage = () => {
    const { slug: cuisineSlug } = useParams();
    const { restaurants, setRestaurants, setError, API_BASE_URL, menuItems, setMenuItems, error } = useApp();
    const location = window.location;
    const params = new URLSearchParams(location.search);
    const cuisineFilter = params.get('cuisine');
    const categoryFilter = params.get('category');
    const mealPeriodFilter = params.get('meal_period');
    const [restaurantsLoading, setRestaurantsLoading] = React.useState(false);
    const [menuLoading, setMenuLoading] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortBy, setSortBy] = React.useState('name');
    const [priceRangeFilter, setPriceRangeFilter] = React.useState([]);
    const [freeDeliveryOnly, setFreeDeliveryOnly] = React.useState(false);
    const [deliveryTimeFilter, setDeliveryTimeFilter] = React.useState('');
    const [cuisineTypeFilter, setCuisineTypeFilter] = React.useState('');
    const [minRatingFilter, setMinRatingFilter] = React.useState(0);
    const [featuresFilter, setFeaturesFilter] = React.useState([]);
    const [activeOnlyFilter, setActiveOnlyFilter] = React.useState(false);
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const sidebarRef = React.useRef(null);

    const normalizeText = (value) => String(value || '').trim().toLowerCase();
    const normalizedCuisineSlug = String(cuisineSlug || '').trim().toLowerCase();
    const hasCuisineSlugFilter = normalizedCuisineSlug.length > 0;
    const cuisineLabelFromSlug = hasCuisineSlugFilter
        ? decodeURIComponent(cuisineSlug).replace(/-/g, ' ')
        : '';
    const selectedCuisineLabel = cuisineFilter || cuisineLabelFromSlug;

    // Load restaurants if they haven't been loaded yet
    const loadRestaurants = async () => {
        setRestaurantsLoading(true);
        try {
            const allRestaurants = [];
            let nextUrl = `${API_BASE_URL}/restaurants/`;
            const token = localStorage.getItem('authToken');
            const authHeaders = token ? { Authorization: `Token ${token}` } : {};

            while (nextUrl) {
                const restaurantsResponse = await axios.get(nextUrl, { headers: authHeaders });
                const payload = restaurantsResponse.data;

                if (Array.isArray(payload)) {
                allRestaurants.push(...payload);
                nextUrl = null;
                } else {
                allRestaurants.push(...(payload?.results || []));
                nextUrl = payload?.next || null;
                }
            }

            setRestaurants(allRestaurants);
            setError(null);
        } catch (err) {
            setError('Failed to load restaurants. Please try again.');
            setRestaurants([]);
        } finally {
            setRestaurantsLoading(false);
        }
    };

  // Load menu items if they haven't been loaded yet
  const loadMenuItems = async () => {
    setMenuLoading(true);
    try {
      const allMenuItems = [];
      let nextUrl = `${API_BASE_URL}/menu-items/`;

      while (nextUrl) {
        const menuResponse = await axios.get(nextUrl);
        const payload = menuResponse.data;

        if (Array.isArray(payload)) {
          allMenuItems.push(...payload);
          nextUrl = null;
        } else {
          allMenuItems.push(...(payload?.results || []));
          nextUrl = payload?.next || null;
        }
      }

      setMenuItems(allMenuItems);
    } catch (menuError) {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };

  // DRY refresh logic
  const handleRefresh = () => {
    loadRestaurants();
    loadMenuItems();
  };

  // Load both restaurants and menu items on mount
  React.useEffect(() => {
    loadRestaurants();
    loadMenuItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableFeatures = React.useMemo(() => {
    const set = new Set();
    (restaurants || []).forEach(r => (r.features || []).forEach(f => set.add(f)));
    return [...set].sort();
  }, [restaurants]);

    const availableCuisineTypes = React.useMemo(() => {
        const set = new Set();
        (restaurants || []).forEach((r) => {
            const cuisineName = String(r?.cuisine?.name || '').trim();
            if (cuisineName) {
                set.add(cuisineName);
            }
        });
        return [...set].sort((a, b) => a.localeCompare(b));
    }, [restaurants]);

  const filteredRestaurants = React.useMemo(() => {
    const filtered = (restaurants || []).filter((r) => {
      const cuisineName = r.cuisine?.name || '';
      if (cuisineFilter && normalizeText(cuisineName) !== normalizeText(cuisineFilter)) return false;

      if (hasCuisineSlugFilter) {
        const restaurantCuisineSlug = normalizeText(cuisineName).replace(/\s+/g, '-');
        if (restaurantCuisineSlug !== normalizedCuisineSlug) return false;
      }

      if (categoryFilter) {
        const restaurantMenus = (menuItems || []).filter((item) => item.restaurant === r.id);
        const hasCategory = restaurantMenus.some(
          (item) => item.category && String(item.category).toLowerCase().includes(categoryFilter.toLowerCase())
        );
        if (!hasCategory) return false;
      }

      if (mealPeriodFilter) {
        const restaurantMenus = (menuItems || []).filter((item) => item.restaurant === r.id);
        const hasMealPeriod = restaurantMenus.some((item) => item.meal_period === mealPeriodFilter);
        if (!hasMealPeriod) return false;
      }

      if (searchTerm.trim()) {
        const haystack = `${r.name || ''} ${r.description || ''} ${r.cuisine?.name || ''}`.toLowerCase();
        if (!haystack.includes(searchTerm.toLowerCase().trim())) return false;
      }

      if (priceRangeFilter.length > 0 && !priceRangeFilter.includes(r.price_range)) return false;

      if (activeOnlyFilter && !r.is_active) return false;

      if (freeDeliveryOnly && Number(r.delivery_fee ?? 1) !== 0) return false;

      if (deliveryTimeFilter && Number(r.delivery_time || 0) > Number(deliveryTimeFilter)) return false;

    if (cuisineTypeFilter && normalizeText(cuisineName) !== normalizeText(cuisineTypeFilter)) return false;

      if (minRatingFilter > 0 && Number(r.rating || 0) < minRatingFilter) return false;

      if (featuresFilter.length > 0) {
        const rFeatures = r.features || [];
        if (!featuresFilter.every(f => rFeatures.includes(f))) return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return Number(b.rating || 0) - Number(a.rating || 0);
        case 'priceRange': {
          const order = ['$', '$$', '$$$', '$$$$'];
          const ai = order.indexOf(a.price_range || '');
          const bi = order.indexOf(b.price_range || '');
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        }
        case 'totalReviews':
          return Number(b.total_reviews || 0) - Number(a.total_reviews || 0);
        case 'mostLiked':
          return Number(b.likes_count || 0) - Number(a.likes_count || 0);
        case 'deliveryTime':
          return Number(a.delivery_time || 999) - Number(b.delivery_time || 999);
        case 'deliveryFee':
          return Number(a.delivery_fee ?? 999) - Number(b.delivery_fee ?? 999);
                case 'cuisine':
                    return String(a.cuisine?.name || '').localeCompare(String(b.cuisine?.name || ''));
        case 'name':
        default:
          return String(a.name || '').localeCompare(String(b.name || ''));
      }
    });

    return filtered;
    }, [restaurants, menuItems, cuisineFilter, hasCuisineSlugFilter, normalizedCuisineSlug, categoryFilter, mealPeriodFilter, searchTerm, sortBy, priceRangeFilter, freeDeliveryOnly, deliveryTimeFilter, cuisineTypeFilter, minRatingFilter, featuresFilter, activeOnlyFilter]);

    if (restaurantsLoading || menuLoading) {
        return (
        <div className="container90">
            {/* Header skeleton */}
            <header className="flex flex-column items-center justify-center bg-brown0 br0-50 pv2-00 ph1-00 mb3-00">
            <div className="mb2-00 mh-auto h2-00 w-20 bg-gold0 br0-25 "
            >
            </div>
            <div className="mh-auto mb1-00 h1-00 w-30 bg-gold0 br0-25">

            </div>
            </header>

            <div className="grid gtc12 relative bg-white mt3-00 ggap1-00 pa1-00">
                {/* Sidebar skeleton */}
                <aside className="gc1s12 gc1s3-m ba br0-50 bg-brown0 pa1-00"
                >
                    {/* Search */}
                    <div className="skeleton-input mb1-00 w-100" style={{ height: '2.2rem', borderRadius: '0.25rem' }}></div>
                    {/* Count block */}
                    <div className="tc mv1-00">
                    <div className="skeleton-title mh-auto mb0-50" style={{ width: '30%', height: '1.5rem' }}></div>
                    <div className="skeleton-text mh-auto" style={{ width: '70%' }}></div>
                    </div>
                    {/* Refresh button */}
                    <div className="skeleton-button w-100 mb1-00" style={{ height: '2rem' }}></div>
                    {/* Sort select */}
                    <div className="skeleton-input w-100 mb1-00" style={{ height: '2rem' }}></div>
                    {/* Price range section */}
                    <div className="ba br0-50 pa0-50 mb1-00">
                    <div className="skeleton-text-short mb0-50" style={{ width: '50%' }}></div>
                    {[1,2,3,4].map(i => (
                        <div key={i} className="flex items-center mb0-25" style={{ gap: '0.5rem' }}>
                        <div className="skeleton-text-short" style={{ width: '1rem', height: '1rem', borderRadius: '2px', flexShrink: 0 }}></div>
                        <div className="skeleton-text-short" style={{ width: '60%' }}></div>
                        </div>
                    ))}
                    </div>
                    {/* Rating section */}
                    <div className="pa0-50">
                    <div className="skeleton-text-short mb0-50" style={{ width: '40%' }}></div>
                    <div className="skeleton-input w-100" style={{ height: '2rem' }}></div>
                    </div>
                </aside>

                {/* Cards skeleton */}
                <div className="gc1s12 gc4s8-m">
                    <div className="grid gtc1 gtc2-m ggap1-00">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="card h-100 border-0 shadow restaurant-card">
                        {/* Image */}
                        <div className="skeleton-image-container" 
                            style={{ height: '180px' }}>

                            </div>
                        <div className="card-body d-flex flex-column pa0-25" 
                        >
                            {/* Name */}
                            <div className="skeleton-titl mb0-50 bg-brown0 w-60 h2-00"></div>
                            {/* Cuisine badge */}
                            <div className="skeleton-badg mb0-50 bg-brown0" 
                                style={{ width: '35%' }}
                            >
                            </div>
                            {/* Rating row */}
                            <div className="flex items-center mb0-50 ggap0-50">
                                <div className="skeleton-text-shor bg-brown0 w-30 h1-00" ></div>
                                <div className="skeleton-text-shor bg-brown0 w-20 h1-00" ></div>
                            </div>
                            {/* Delivery info row */}
                            <div className="flex items-center mb0-50" style={{ gap: '0.5rem' }}>
                            <div className="skeleton-text-short" style={{ width: '25%' }}></div>
                            <div className="skeleton-text-short" style={{ width: '25%' }}></div>
                            <div className="skeleton-text-short" style={{ width: '25%' }}></div>
                            </div>
                            {/* Description */}
                            <div className="skeleton-text mb0-25" style={{ width: '100%' }}></div>
                            <div className="skeleton-text mb1-00" style={{ width: '80%' }}></div>
                            {/* Button */}
                            <div className="mt-auto skeleton-button" style={{ width: '100%', height: '2.2rem' }}></div>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>
            </div>
        </div>
        );
    }

    return (
        
        <div className="container90">
            {/* Mobile sidebar toggle button */}
            <button
                className="dn-m fixed z-999 
                    w2-50 h2-50 
                    shadow-4 
                    top-5 left-1 
                    br0-25 b--none 
                    pointer bg-white"
                aria-label="Open sidebar"
                onClick={() => setSidebarOpen(true)}
            >
                <span aria-hidden="true" className="f1-50">☰</span>
            </button>

            {/* Mobile sidebar overlay */}
            {
                sidebarOpen && (
                    <div className="" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.4)',
                        zIndex: 1300,
                        display: 'flex',
                    }}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <aside
                            ref={sidebarRef}
                            className="gc1s1"
                            style={{
                                background: '#fff',
                                width: '85vw',
                                maxWidth: '340px',
                                height: '100vh',
                                overflowY: 'auto',
                                boxShadow: '2px 0 16px rgba(0,0,0,0.18)',
                                position: 'relative',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                aria-label="Close sidebar"
                                onClick={() => setSidebarOpen(false)}
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '2rem',
                                    cursor: 'pointer',
                                }}
                            >
                                ×
                            </button>
                            <div className="pv2-00 ph1-00">
                                <div className="flex w-100">
                                <span className="f2-00">🔍</span>
                                <input
                                    type="text"
                                    className="w-100 br0-25 pl1-00 "
                                    placeholder="Search restaurants..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                </div>
                            </div>
                            <div className="f2-00 mv1-00 ph1-00">
                                <div className="f3-00 b ">... {filteredRestaurants.length} ...</div>
                                <span>restaurants loaded and counting.....</span>
                            </div>
                            <div className="mb-3 d-grid gap-2 ph1-00">
                                <button type="button" className="btn btn-outline-primary" onClick={handleRefresh}>
                                🔄 Refresh
                                </button>
                                {(searchTerm || priceRangeFilter.length > 0 || freeDeliveryOnly || deliveryTimeFilter || cuisineTypeFilter || minRatingFilter > 0 || featuresFilter.length > 0 || activeOnlyFilter) && (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSortBy('name');
                                        setPriceRangeFilter([]);
                                        setFreeDeliveryOnly(false);
                                        setDeliveryTimeFilter('');
                                        setCuisineTypeFilter('');
                                        setMinRatingFilter(0);
                                        setFeaturesFilter([]);
                                        setActiveOnlyFilter(false);
                                    }}
                                >
                                    ✕ Clear Filters
                                </button>
                                )}
                                {(categoryFilter || cuisineFilter || hasCuisineSlugFilter || mealPeriodFilter) && (
                                <Link to="/restaurants" className="btn btn-outline-secondary">
                                    Clear URL Filters
                                </Link>
                                )}
                            </div>
                            <div className="mb2-00 pa0-50 ph1-00">
                                <select
                                className="pa0-50"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                >
                                <option value="name">Sort by Name</option>
                                <option value="rating">Sort by Rating</option>
                                <option value="totalReviews">Most Reviewed</option>
                                <option value="mostLiked">Most Liked</option>
                                <option value="priceRange">Sort by Price</option>
                                <option value="deliveryTime">Fastest Delivery</option>
                                <option value="deliveryFee">Lowest Delivery Fee</option>
                                <option value="cuisine">Cuisine A-Z</option>
                                </select>
                            </div>
                            <div className="mb2-00 pa0-50 ma0-50 tl ba br0-50 bg-black-40 ph1-00">
                                <div className="f1-50 b mb0-50">Price Range</div>
                                {[['$', 'Budget'], ['$$', 'Moderate'], ['$$$', 'Expensive'], ['$$$$', 'Fine Dining']].map(([value, label]) => (
                                <label key={value} className="db mb0-25 pointer">
                                    <input
                                    type="checkbox"
                                    className="mr0-50"
                                    checked={priceRangeFilter.includes(value)}
                                    onChange={(e) => {
                                        setPriceRangeFilter(prev =>
                                        e.target.checked ? [...prev, value] : prev.filter(v => v !== value)
                                        );
                                    }}
                                    />
                                    {label}
                                </label>
                                ))}
                            </div>
                            <div className="mb2-00 pa0-50 tl ph1-00">
                                <div className="f1-50 b mb0-50">Min. Rating</div>
                                <select
                                    className="pa0-50 w-100"
                                    value={minRatingFilter}
                                    onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                                >
                                    <option value={0}>Any Rating</option>
                                    <option value={3}>3★ &amp; up</option>
                                    <option value={4}>4★ &amp; up</option>
                                    <option value={4.5}>4.5★ &amp; up</option>
                                </select>
                            </div>
                            <div className="mb2-00 pa0-50 tl ph1-00">
                                <div className="f1-50 b mb0-50">Delivery Time</div>
                                <select
                                    className="pa0-50 w-100"
                                    value={deliveryTimeFilter}
                                    onChange={(e) => setDeliveryTimeFilter(e.target.value)}
                                >
                                    <option value="">Any</option>
                                    <option value="30">&le; 30 mins</option>
                                    <option value="45">&le; 45 mins</option>
                                    <option value="60">&le; 60 mins</option>
                                </select>
                            </div>
                            <div className="mb2-00 pa0-50 tl ph1-00">
                                <div className="f1-50 b mb0-50">Cuisine Type</div>
                                <select
                                    className="pa0-50 w-100"
                                    value={cuisineTypeFilter}
                                    onChange={(e) => setCuisineTypeFilter(e.target.value)}
                                >
                                    <option value="">Any</option>
                                    {availableCuisineTypes.map((cuisineName) => (
                                    <option key={cuisineName} value={cuisineName}>{cuisineName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb2-00 pa0-50 tl ph1-00">
                                <label className="db pointer">
                                    <input
                                        type="checkbox"
                                        className="mr0-50"
                                        checked={freeDeliveryOnly}
                                        onChange={(e) => setFreeDeliveryOnly(e.target.checked)}
                                    />
                                    Free Delivery Only
                                </label>
                                <label className="db pointer mt0-25">
                                    <input
                                        type="checkbox"
                                        className="mr0-50"
                                        checked={activeOnlyFilter}
                                        onChange={(e) => setActiveOnlyFilter(e.target.checked)}
                                    />
                                    Open / Active Only
                                </label>
                            </div>
                            {availableFeatures.length > 0 && (
                            <div className="mb2-00 pa0-50 tl ma0-50 ba br0-50 bg-black-40 ph1-00">
                                <div className="f1-50 b mb0-50">Features</div>
                                {availableFeatures.map(f => (
                                <label key={f} className="db mb0-25 pointer">
                                    <input
                                        type="checkbox"
                                        className="mr0-50"
                                        checked={featuresFilter.includes(f)}
                                        onChange={(e) => {
                                            setFeaturesFilter(prev =>
                                                e.target.checked ? [...prev, f] : prev.filter(v => v !== f)
                                            );
                                        }}
                                    />
                                    {f}
                                </label>
                                ))}
                            </div>
                            )}
                        </aside>
                    </div>
                )
            }
            
            <div className="">
                {
                    error && (
                        <div className="alert" role="alert"
                        >
                            <div className="d-flex align-items-center">
                                <FaExclamationTriangle className="mr0-25" aria-hidden="true" />
                            <div>
                                <strong>Oops! Something went wrong</strong>
                                <div>{error}</div>
                            </div>
                            </div>
                            <button 
                            type="button" 
                            className="btn-close" 
                            onClick={() => setError(null)}
                            aria-label="Close"
                            ></button>
                            <button 
                            type="button" 
                            className="btn btn-outline-danger mt-2"
                            onClick={handleRefresh}
                            >🔄 Retry</button>
                        </div>
                    )
                }
                <header className="mt2-00 tc bg-brown0 br0-50 gold0">
                    <div>
                        <h1 className="pv1-00">🏪 {categoryFilter 
                        ? `${categoryFilter} Restaurants` 
                        : selectedCuisineLabel
                        ? `${selectedCuisineLabel} Restaurants` 
                        : 'All Restaurants'}</h1>
                        <p className="pb1-00">
                        {
                            categoryFilter
                            ? `Restaurants serving ${categoryFilter}${mealPeriodFilter ? ` for ${mealPeriodFilter}` : ''}`
                            : selectedCuisineLabel
                            ? `Discover our ${selectedCuisineLabel} partner restaurants and their specialties`
                            : 'Discover our partner restaurants and their specialties'
                        }
                        </p>
                        {(categoryFilter || cuisineFilter || hasCuisineSlugFilter || mealPeriodFilter) && (
                        <Link to="/restaurants" className="btn btn-sm btn-outline-secondary">
                            Clear Filters
                        </Link>
                        )}
                    </div>
                </header>
                
                {/* Active filter chips */}
                {(() => {
                    const chips = [];
                    if (searchTerm) chips.push({ label: `Search: "${searchTerm}"`, onRemove: () => setSearchTerm('') });
                    if (minRatingFilter > 0) chips.push({ label: `${minRatingFilter}★+`, onRemove: () => setMinRatingFilter(0) });
                    priceRangeFilter.forEach(v => chips.push({ label: v, onRemove: () => setPriceRangeFilter(prev => prev.filter(x => x !== v)) }));
                    if (deliveryTimeFilter) chips.push({ label: `≤${deliveryTimeFilter} mins`, onRemove: () => setDeliveryTimeFilter('') });
                    if (cuisineTypeFilter) chips.push({ label: `Cuisine: ${cuisineTypeFilter}`, onRemove: () => setCuisineTypeFilter('') });
                    if (freeDeliveryOnly) chips.push({ label: 'Free Delivery', onRemove: () => setFreeDeliveryOnly(false) });
                    if (activeOnlyFilter) chips.push({ label: 'Active Only', onRemove: () => setActiveOnlyFilter(false) });
                    featuresFilter.forEach(f => chips.push({ label: f, onRemove: () => setFeaturesFilter(prev => prev.filter(x => x !== f)) }));
                    if (chips.length === 0) return null;
                    return (
                        <div className="flex flex-wrap ggap0-50 pv0-50 ph0-50">
                        {chips.map((chip, i) => (
                            <span key={i} className="badge bg-brown0 gold0 ba br0-25 ph0-50 pv0-25 flex items-center" style={{ gap: '0.35rem' }}>
                            {chip.label}
                            <button
                                type="button"
                                onClick={chip.onRemove}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                                aria-label={`Remove ${chip.label} filter`}
                            >✕</button>
                            </span>
                        ))}
                        </div>
                    );
                })()}

                <div className="grid gtc12 
                    relative bg-white mt3-00 ggap1-00">
                            <aside
                            className="dn db-m gc1s12 gc1s3-m bg-brown0 gold0 ba br0-50 tc"
                            style={
                                {   position: window.innerWidth >= 960 ? 'sticky' : 'relative', 
                                    top: window.innerWidth >= 960 ? '1rem' : 'auto', 
                                    alignSelf: 'start', 
                                    maxHeight: window.innerWidth >= 960 ? 'calc(100vh - 2rem)' : 'auto', 
                                    overflowY: window.innerWidth >= 960 ? 'auto' : 'visible' }}
                        >
                                <div className="pv2-00 ph1-00">
                                    <div className="flex w-100">
                                    <span className="f2-00">🔍</span>
                                    <input
                                        type="text"
                                        className="w-100 br0-25 pl1-00 "
                                        placeholder="Search restaurants..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    </div>
                                </div>
                                <div className="f2-00 mv1-00">
                                    <div className="f3-00 b ">... {filteredRestaurants.length} ...</div>
                                    <span>restaurants loaded and counting.....</span>
                                </div>
                                <div className="mb-3 d-grid gap-2">
                                    {/* <button type="button" className="btn btn-outline-primary" onClick={handleRefresh}>
                                    🔄 Refresh
                                    </button> */}
                                    {(searchTerm || priceRangeFilter.length > 0 || freeDeliveryOnly || deliveryTimeFilter || cuisineTypeFilter || minRatingFilter > 0 || featuresFilter.length > 0 || activeOnlyFilter) && (
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSortBy('name');
                                            setPriceRangeFilter([]);
                                            setFreeDeliveryOnly(false);
                                            setDeliveryTimeFilter('');
                                            setCuisineTypeFilter('');
                                            setMinRatingFilter(0);
                                            setFeaturesFilter([]);
                                            setActiveOnlyFilter(false);
                                        }}
                                    >
                                        ✕ Clear Filters
                                    </button>
                                    )}
                                    {(categoryFilter || cuisineFilter || hasCuisineSlugFilter || mealPeriodFilter) && (
                                    <Link to="/restaurants" className="btn btn-outline-secondary">
                                        Clear URL Filters
                                    </Link>
                                    )}
                                </div>
                                <div className="mb2-00 pa0-50 gold0">
                                    <select
                                    className="pa0-50"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    >
                                    <option value="name">Sort by Name</option>
                                    <option value="rating">Sort by Rating</option>
                                    <option value="totalReviews">Most Reviewed</option>
                                    <option value="mostLiked">Most Liked</option>
                                    <option value="priceRange">Sort by Price</option>
                                    <option value="deliveryTime">Fastest Delivery</option>
                                    <option value="deliveryFee">Lowest Delivery Fee</option>
                                    <option value="cuisine">Cuisine A-Z</option>
                                    </select>
                                </div>
                                <div className="mb2-00 pa0-50 ma0-50 tl ba br0-50  bg-black-40">
                                    <div className="f1-50 b mb0-50">Price Range</div>
                                    {[['$', 'Budget'], ['$$', 'Moderate'], ['$$$', 'Expensive'], ['$$$$', 'Fine Dining']].map(([value, label]) => (
                                    <label key={value} className="db mb0-25 gold0 pointer">
                                        <input
                                        type="checkbox"
                                        className="mr0-50 "
                                        checked={priceRangeFilter.includes(value)}
                                        onChange={(e) => {
                                            setPriceRangeFilter(prev =>
                                            e.target.checked ? [...prev, value] : prev.filter(v => v !== value)
                                            );
                                        }}
                                        />
                                        {label}
                                    </label>
                                    ))}
                                </div>
                                <div className="mb2-00 pa0-50 tl">
                                    <div className="f1-50 b mb0-50">Min. Rating</div>
                                    <select
                                        className="pa0-50 w-100"
                                        value={minRatingFilter}
                                        onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                                    >
                                        <option value={0}>Any Rating</option>
                                        <option value={3}>3★ &amp; up</option>
                                        <option value={4}>4★ &amp; up</option>
                                        <option value={4.5}>4.5★ &amp; up</option>
                                    </select>
                                </div>
                                <div className="mb2-00 pa0-50 tl">
                                    <div className="f1-50 b mb0-50">Delivery Time</div>
                                    <select
                                        className="pa0-50 w-100"
                                        value={deliveryTimeFilter}
                                        onChange={(e) => setDeliveryTimeFilter(e.target.value)}
                                    >
                                        <option value="">Any</option>
                                        <option value="30">&le; 30 mins</option>
                                        <option value="45">&le; 45 mins</option>
                                        <option value="60">&le; 60 mins</option>
                                    </select>
                                </div>
                                <div className="mb2-00 pa0-50 tl">
                                    <div className="f1-50 b mb0-50">Cuisine Type</div>
                                    <select
                                        className="pa0-50 w-100"
                                        value={cuisineTypeFilter}
                                        onChange={(e) => setCuisineTypeFilter(e.target.value)}
                                    >
                                        <option value="">Any</option>
                                        {availableCuisineTypes.map((cuisineName) => (
                                        <option key={cuisineName} value={cuisineName}>{cuisineName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb2-00 pa0-50 tl">
                                    <label className="db pointer gold0">
                                        <input
                                            type="checkbox"
                                            className="mr0-50"
                                            checked={freeDeliveryOnly}
                                            onChange={(e) => setFreeDeliveryOnly(e.target.checked)}
                                        />
                                        Free Delivery Only
                                    </label>
                                    <label className="db pointer mt0-25 gold0">
                                        <input
                                            type="checkbox"
                                            className="mr0-50"
                                            checked={activeOnlyFilter}
                                            onChange={(e) => setActiveOnlyFilter(e.target.checked)}
                                        />
                                        Open / Active Only
                                    </label>
                                </div>
                                {availableFeatures.length > 0 && (
                                <div className="mb2-00 pa0-50 tl ma0-50 ba br0-50 bg-black-40">
                                    <div className="f1-50 b mb0-50">Features</div>
                                    {availableFeatures.map(f => (
                                    <label key={f} className="db mb0-25 pointer gold0">
                                        <input
                                            type="checkbox"
                                            className="mr0-50"
                                            checked={featuresFilter.includes(f)}
                                            onChange={(e) => {
                                                setFeaturesFilter(prev =>
                                                    e.target.checked ? [...prev, f] : prev.filter(v => v !== f)
                                                );
                                            }}
                                        />
                                        {f}
                                    </label>
                                    ))}
                                </div>
                                )}
                                
                            
                        </aside>

                        <div className="gc1s12 gc4s8-m "
                        >
                            {
                                filteredRestaurants.length > 0 
                                ? (
                                    <div className="grid gtc1 gtc2-m ggap1-00">
                                        {
                                            filteredRestaurants.map(
                                                (restaurant) => (
                                                <RestaurantCard key={restaurant.id} 
                                                    restaurant={restaurant} 
                                                    showMenu={true} 
                                                />
                                                )
                                            )
                                        }
                                    </div>
                                ) : (
                                    <div className="empty-state" 
                                        role="status" 
                                        aria-live="polite"
                                    >
                                        <span className="empty-icon" aria-hidden="true">🔎</span>
                                        <h3 className="text-muted">No restaurants found</h3>
                                        <p className="mb-3">Please try adjusting filters or search.</p>
                                        <div className="empty-actions">
                                        <button className="btn btn-primary" onClick={handleRefresh}>🔄 Try Again</button>
                                        <button
                                            className="btn btn-outline-secondary"
                                            onClick={() => {
                                            setSearchTerm('');
                                            setSortBy('name');
                                            setPriceRangeFilter([]);
                                            setFreeDeliveryOnly(false);
                                            setDeliveryTimeFilter('');
                                            setCuisineTypeFilter('');
                                            setMinRatingFilter(0);
                                            setFeaturesFilter([]);
                                            setActiveOnlyFilter(false);
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                </div>
            </div>
        </div> 
         
    );
};

export default RestaurantsPage;
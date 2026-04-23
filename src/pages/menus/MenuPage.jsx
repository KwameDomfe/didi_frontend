import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useApp } from '../../App.js';
import MenuItemCard from './MenuItemCard.jsx';
import MenuItemFormModal from '../../components/MenuItemFormModal.jsx';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaUtensils, FaExclamationTriangle, FaTh, FaListUl, FaSearch, FaUndoAlt, FaBookOpen, FaEraser, FaChevronLeft, FaChevronRight, FaBars, FaTimes, FaPlusCircle } from 'react-icons/fa';
// Enhanced Menu Page with Search and Filters

const MenuPage = () => {
    // Separate loading states
    const [menuLoading, setMenuLoading] = useState(false);
    const [restaurantsLoading, setRestaurantsLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesById, setCategoriesById] = useState({});
    const [categoriesBySlug, setCategoriesBySlug] = useState({});
  const [itemCategoryNames, setItemCategoryNames] = useState({});
  const [itemMealPeriods, setItemMealPeriods] = useState({});
    const { menuItems, restaurants, setMenuItems, setError, API_BASE_URL, error, setRestaurants, user, showToast } = useApp();
    const { slug } = useParams();
    const navigate = useNavigate();

    const mergeCategoryMaps = (incomingCategories) => {
      const nextById = {};
      const nextBySlug = {};

      incomingCategories.forEach((category) => {
        if (category?.id !== undefined && category?.id !== null) {
          nextById[String(category.id)] = category.name || 'Uncategorized';
        }

        if (category?.slug) {
          nextBySlug[String(category.slug).toLowerCase()] = category.name || 'Uncategorized';
        }
      });

      setCategoriesById((prev) => ({ ...prev, ...nextById }));
      setCategoriesBySlug((prev) => ({ ...prev, ...nextBySlug }));
    };

    const fetchAllPages = async (initialUrl, headers = {}) => {
      const results = [];
      let nextUrl = initialUrl;

      while (nextUrl) {
        const response = await axios.get(nextUrl, { headers });
        const payload = response.data;

        if (Array.isArray(payload)) {
          results.push(...payload);
          nextUrl = null;
        } else {
          results.push(...(payload?.results || []));
          nextUrl = payload?.next || null;
        }
      }

      return results;
    };

    // Load restaurants if they haven't been loaded yet
    const loadRestaurants = async () => {
        setRestaurantsLoading(true);
        try {
      const data = await fetchAllPages(`${API_BASE_URL}/restaurants/`);
        setRestaurants(data);
        setError(null);
        } catch (err) {
        setError('Failed to load restaurants. Please try again.');
        setRestaurants([]);
        } finally {
        setRestaurantsLoading(false);
        }
    };


    const [filteredItems, setFilteredItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dietaryFilter, setDietaryFilter] = useState('');
    const [restaurantFilter, setRestaurantFilter] = useState('');
    const [mealPeriodFilter, setMealPeriodFilter] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('category'); // 'grid' or 'category'
    const [activeCategoryId, setActiveCategoryId] = useState('');
    // Removed unused mobileCategoriesOpen state
    const [rowFadeState, setRowFadeState] = useState({});
    const [ownedRestaurants, setOwnedRestaurants] = useState([]);
    const [addMenuRestaurantId, setAddMenuRestaurantId] = useState('');
    const [showAddMenuModal, setShowAddMenuModal] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const desktopCategoriesListRef = useRef(null);
    const categoryNavRef = useRef(null);
    const sidebarRef = useRef(null);
    const prevViewModeRef = useRef(viewMode);

    // If on /restaurants/:slug/menu, set restaurantFilter to the restaurant name matching slug
    const [restaurantName, setRestaurantName] = useState('');
    // Ensure restaurant filter is set after both restaurants and menuItems are loaded
    // Set restaurant filter only when both restaurants and menuItems are loaded
    useEffect(
      () => {
        if (slug && restaurants && restaurants.length > 0 &&
          menuItems && menuItems.length > 0) {
            const found = restaurants.find(r => r.slug === slug);
            if (found) {
              setRestaurantFilter(found.name);
              setRestaurantName(found.name);
            } else {
              setRestaurantFilter('');
              setRestaurantName('');
            }
          } 
        else if (!slug) {
          setRestaurantFilter('');
          setRestaurantName('');
        }
      }, [slug, restaurants, menuItems]
    );

    // Check for URL parameters on component mount (for legacy support)
    useEffect(
        () => {
            if (!slug) {
                const urlParams = new URLSearchParams(window.location.search);
                const restaurantParam = urlParams.get('restaurant');
                const mealPeriodParam = urlParams.get('meal_period');
                if (restaurantParam) {
                    setRestaurantFilter(decodeURIComponent(restaurantParam));
                }
                if (mealPeriodParam) {
                  setMealPeriodFilter(normalizeMealPeriod(decodeURIComponent(mealPeriodParam)));
                }
            }
        }, [slug]
    );

    // Load all categories first, then fetch items per category so each item
    // is correctly grouped. The /menu-items/ list endpoint does not return
    // category info, so category-keyed fetches are the only reliable approach.
    const loadMenuItems = async () => {
        setMenuLoading(true);
        setCategoriesLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const headers = token ? { Authorization: `Token ${token}` } : {};

            // 1. Load all categories
        const allCategories = await fetchAllPages(`${API_BASE_URL}/categories/`, headers);
            mergeCategoryMaps(allCategories);
            setCategoriesLoading(false);

        // 2. Load the complete menu list (matches HomePage analytics source)
        const allMenuItems = await fetchAllPages(`${API_BASE_URL}/menu-items/`, headers);

        // 3. Fetch items for every category in parallel for reliable item->category mapping
            const categoryResults = await Promise.all(
                allCategories.map(async (cat) => ({
                    categoryName: cat.name,
          categoryMealPeriod: normalizeMealPeriod(cat.meal_period),
            items: await fetchAllPages(`${API_BASE_URL}/menu-items/?category=${cat.id}`, headers),
                }))
            );

        // 4. Build itemId→categoryName and itemId→mealPeriod maps
            const catNameMap = {};
          const itemMealMap = {};

          categoryResults.forEach(({ categoryName, categoryMealPeriod, items }) => {
                items.forEach(item => {
                    catNameMap[item.id] = categoryName;
          const explicitItemMealPeriod = normalizeMealPeriod(item.meal_period || item.category?.meal_period);
          itemMealMap[item.id] = explicitItemMealPeriod || categoryMealPeriod || '';
                });
            });

        // 5. Deduplicate complete menu list by id, fallback to slug/name to preserve non-id entries
        const seenKeys = new Set();
        const allItems = [];
        allMenuItems.forEach((item) => {
          const key = item?.id ?? item?.slug ?? `${item?.name || 'menu-item'}-${item?.restaurant_name || ''}`;
          if (seenKeys.has(key)) {
          return;
          }
          seenKeys.add(key);
          allItems.push(item);
        });

            setItemCategoryNames(catNameMap);
            setItemMealPeriods(itemMealMap);
            setMenuItems(allItems);
            setError(null);
        } catch (menuError) {
            setError('Failed to load menu items. Please try again.');
            setMenuItems([]);
            setItemMealPeriods({});
        } finally {
            setMenuLoading(false);
            setCategoriesLoading(false);
        }
    };

    // Load menu items and restaurants on mount
    useEffect(
        () => {
            loadMenuItems();
            loadRestaurants();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []
    );

    useEffect(() => {
      const loadOwnedRestaurants = async () => {
        if (!user || (user.user_type !== 'vendor' && user.user_type !== 'platform_admin')) {
          setOwnedRestaurants([]);
          setAddMenuRestaurantId('');
          return;
        }

        try {
          const token = localStorage.getItem('authToken');
          const response = await axios.get(`${API_BASE_URL}/restaurants/my-restaurants/`, {
            headers: token ? { Authorization: `Token ${token}` } : undefined
          });
          const data = Array.isArray(response.data) ? response.data : (response.data?.results || []);
          setOwnedRestaurants(data);
          setAddMenuRestaurantId((prev) => {
            if (prev && data.some((restaurant) => String(restaurant.id) === String(prev))) {
              return prev;
            }
            return data[0]?.id ? String(data[0].id) : '';
          });
        } catch {
          setOwnedRestaurants([]);
          setAddMenuRestaurantId('');
        }
      };

      loadOwnedRestaurants();
    }, [API_BASE_URL, user]);

    const handleOpenAddMenu = () => {
      if (!user || (user.user_type !== 'vendor' && user.user_type !== 'platform_admin')) {
        showToast('Please log in as a vendor to add menu items.', 'info');
        return;
      }

      if (slug) {
        const currentRestaurant = restaurants.find((restaurant) => restaurant.slug === slug);
        if (!currentRestaurant?.id) {
          showToast('Restaurant context is missing. Refresh and try again.', 'error');
          return;
        }
        setAddMenuRestaurantId(String(currentRestaurant.id));
        setShowAddMenuModal(true);
        return;
      }

      if (!addMenuRestaurantId) {
        showToast('Select a restaurant first before adding a menu item.', 'info');
        return;
      }

      setShowAddMenuModal(true);
    };

    const normalizeMealPeriod = (value) => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized === 'dinner') {
        return 'supper';
      }
      if (normalized === 'all-day' || normalized === 'allday' || normalized === 'all day') {
        return 'all day';
      }
      return normalized;
    };

    const resolveItemMealPeriod = useCallback((item) => {
      const fromItem = normalizeMealPeriod(item.meal_period || item.category?.meal_period);
      if (fromItem) {
        return fromItem;
      }
      if (item?.id != null) {
        return normalizeMealPeriod(itemMealPeriods[item.id]);
      }
      return '';
    }, [itemMealPeriods]);

    useEffect(() => {
        if (!menuItems || menuItems.length === 0) {
        setFilteredItems([]);
        return;
        }
        
        let filtered = [...menuItems];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.restaurant_name && item.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Restaurant filter
    if (restaurantFilter) {
      filtered = filtered.filter(item => 
        item.restaurant_name === restaurantFilter
      );
    }

    // Meal period filter
    if (mealPeriodFilter) {
      const targetMealPeriod = normalizeMealPeriod(mealPeriodFilter);
      filtered = filtered.filter(item => {
        const itemMealPeriod = resolveItemMealPeriod(item);
        return itemMealPeriod === targetMealPeriod;
      });
    }

    // Dietary filter
    if (dietaryFilter) {
      filtered = filtered.filter(item => {
        switch (dietaryFilter) {
          case 'vegetarian': return item.is_vegetarian;
          case 'vegan': return item.is_vegan;
          case 'gluten_free': return item.is_gluten_free;
          default: return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_low': return parseFloat(a.price) - parseFloat(b.price);
        case 'price_high': return parseFloat(b.price) - parseFloat(a.price);
        case 'prep_time': return a.prep_time - b.prep_time;
        case 'restaurant': return (a.restaurant_name || '').localeCompare(b.restaurant_name || '');
        case 'meal_period': {
          const mealRank = { breakfast: 1, lunch: 2, supper: 3, dinner: 3, 'all day': 4 };
          const aMeal = resolveItemMealPeriod(a);
          const bMeal = resolveItemMealPeriod(b);
          const rankDiff = (mealRank[aMeal] || 99) - (mealRank[bMeal] || 99);
          return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
        }
        case 'name': 
        default: return a.name.localeCompare(b.name);
      }
    });

        setFilteredItems(filtered);
    }, [menuItems, searchTerm, dietaryFilter, restaurantFilter, mealPeriodFilter, sortBy, itemMealPeriods, resolveItemMealPeriod]
);

  const getCategoryName = (item) => {
    // Primary: pre-built map populated by category-keyed item fetches
    if (item?.id && itemCategoryNames[item.id]) {
      return itemCategoryNames[item.id];
    }

    const categoryObject = item?.category && typeof item.category === 'object'
      ? item.category
      : null;

    if (item?.category_name) {
      return item.category_name;
    }

    if (item?.category_display) {
      return item.category_display;
    }

    if (item?.category_title) {
      return item.category_title;
    }

    if (item?.category_slug && categoriesBySlug[String(item.category_slug).toLowerCase()]) {
      return categoriesBySlug[String(item.category_slug).toLowerCase()];
    }

    if (categoryObject?.slug && categoriesBySlug[String(categoryObject.slug).toLowerCase()]) {
      return categoriesBySlug[String(categoryObject.slug).toLowerCase()];
    }

    if (categoryObject?.name) {
      return categoryObject.name;
    }

    const rawCategoryId = item?.category_id ?? categoryObject?.id;
    if (rawCategoryId !== undefined && rawCategoryId !== null && categoriesById[String(rawCategoryId)]) {
      return categoriesById[String(rawCategoryId)];
    }

    if (typeof item?.category === 'string') {
      const categoryValue = item.category.trim();
      const categoryPathMatch = categoryValue.match(/\/categories\/([^/]+)\/?$/i);
      if (categoryPathMatch?.[1]) {
        const extracted = categoryPathMatch[1];

        if (categoriesById[String(extracted)]) {
          return categoriesById[String(extracted)];
        }

        if (categoriesBySlug[String(extracted).toLowerCase()]) {
          return categoriesBySlug[String(extracted).toLowerCase()];
        }
      }

      const isNumericCategory = !isNaN(Number(categoryValue));
      if (isNumericCategory && categoriesById[String(Number(categoryValue))]) {
        return categoriesById[String(Number(categoryValue))];
      }

      const looksLikePath = /\//.test(categoryValue) || /^https?:/i.test(categoryValue);
      if (!looksLikePath && !isNumericCategory) {
        return categoryValue;
      }
    }

    if ((typeof item?.category === 'number' || (typeof item?.category === 'string' && !isNaN(Number(item.category)))) && categoriesById[String(item.category)]) {
      return categoriesById[String(item.category)];
    }

    return 'Uncategorized';
  };

  const normalizeCategoryKey = (value) => String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const categoryAnchorId = (name) => `cat-${normalizeCategoryKey(name).replace(/\s+/g, '-')}`;
  const categoryNavItemId = (name) => `cat-nav-${normalizeCategoryKey(name).replace(/\s+/g, '-')}`;
  const categoryScrollerId = (name) => `cat-scroll-${normalizeCategoryKey(name).replace(/\s+/g, '-')}`;

  const scrollToCategorySection = (categoryId) => {
    const section = document.getElementById(categoryId);
    if (!section) {
      return;
    }

    // Keep section headers visible below the sticky main header.
    const yOffset = -64;
    const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const handleCategoryLinkClick = (categoryId) => (event) => {
    event.preventDefault();
    setActiveCategoryId(categoryId);
    // setMobileCategoriesOpen(false); // removed, state not defined
    window.history.replaceState(null, '', `#${categoryId}`);
    scrollToCategorySection(categoryId);
  };

  const scrollCategoryRow = (groupName, direction) => {
    const scroller = document.getElementById(categoryScrollerId(groupName));
    if (!scroller) return;

    const amount = Math.max(280, Math.floor(scroller.clientWidth * 0.85));
    scroller.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  const getRowFade = (groupName) => rowFadeState[normalizeCategoryKey(groupName)] || { left: false, right: false };

  const updateRowFade = (groupName) => {
    const scroller = document.getElementById(categoryScrollerId(groupName));
    if (!scroller) return;

    const leftVisible = scroller.scrollLeft > 4;
    const rightVisible = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4;
    const key = normalizeCategoryKey(groupName);

    setRowFadeState((prev) => {
      const current = prev[key] || { left: false, right: false };
      if (current.left === leftVisible && current.right === rightVisible) {
        return prev;
      }
      return {
        ...prev,
        [key]: { left: leftVisible, right: rightVisible }
      };
    });
  };

  // Group items by normalized category key so count math stays consistent.
  const groupedByCategory = filteredItems.reduce((acc, item) => {
    const resolvedName = getCategoryName(item);
    const displayName = String(resolvedName || 'Uncategorized').trim() || 'Uncategorized';
    const categoryKey = normalizeCategoryKey(displayName);

    if (!acc[categoryKey]) {
      acc[categoryKey] = {
        name: displayName,
        items: []
      };
    }

    acc[categoryKey].items.push(item);
    return acc;
  }, {});

  const sortedCategoryGroups = Object.values(groupedByCategory)
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalGroupedItems = sortedCategoryGroups.reduce((sum, group) => sum + group.items.length, 0);

  useEffect(() => {
    if (viewMode !== 'category' || sortedCategoryGroups.length === 0) {
      setActiveCategoryId('');
      return;
    }

    const sectionIds = sortedCategoryGroups.map((group) => categoryAnchorId(group.name));
    setActiveCategoryId((previousId) => (previousId && sectionIds.includes(previousId) ? previousId : sectionIds[0]));

    const observedElements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (observedElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio || a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibleEntries[0]?.target?.id) {
          setActiveCategoryId(visibleEntries[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -65% 0px',
        threshold: [0.05, 0.2, 0.4, 0.6]
      }
    );

    observedElements.forEach((element) => observer.observe(element));

    const handleHashChange = () => {
      const hashId = window.location.hash.replace('#', '');
      if (hashId) {
        setActiveCategoryId(hashId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', handleHashChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, sortedCategoryGroups]);

  useEffect(() => {
    if (viewMode !== 'category') {
      return;
    }

    const cleanupHandlers = [];

    sortedCategoryGroups.forEach((group) => {
      if (group.items.length < 2) {
        return;
      }

      const scroller = document.getElementById(categoryScrollerId(group.name));
      if (!scroller) {
        return;
      }

      const onScroll = () => updateRowFade(group.name);
      scroller.addEventListener('scroll', onScroll, { passive: true });
      cleanupHandlers.push(() => scroller.removeEventListener('scroll', onScroll));
      updateRowFade(group.name);
    });

    const onResize = () => {
      sortedCategoryGroups.forEach((group) => {
        if (group.items.length >= 2) {
          updateRowFade(group.name);
        }
      });
    };

    window.addEventListener('resize', onResize);

    return () => {
      cleanupHandlers.forEach((fn) => fn());
      window.removeEventListener('resize', onResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, sortedCategoryGroups]);

  useEffect(() => {
    const justSwitchedToCategory = prevViewModeRef.current !== 'category' && viewMode === 'category';
    prevViewModeRef.current = viewMode;

    if (!activeCategoryId || viewMode !== 'category' || justSwitchedToCategory) {
      return;
    }

    const listNode = desktopCategoriesListRef.current;
    if (!listNode) {
      return;
    }

    const target = listNode.querySelector(`a[href="#${activeCategoryId}"]`);
    if (!target) return;

    // Scroll only within the <nav> scroll container, not the window or sidebar.
    const nav = listNode.parentElement;
    if (!nav) return;
    const itemTop = target.offsetTop;
    const itemBottom = itemTop + target.offsetHeight;
    const navTop = nav.scrollTop;
    const navBottom = navTop + nav.clientHeight;
    if (itemTop < navTop) {
      nav.scrollTo({ top: itemTop, behavior: 'smooth' });
    } else if (itemBottom > navBottom) {
      nav.scrollTo({ top: itemBottom - nav.clientHeight, behavior: 'smooth' });
    }
  }, [activeCategoryId, viewMode]);

  // Proportional sync: nav list scrolls in lock-step with the page.
  useEffect(() => {
    if (viewMode !== 'category') return;
    const onScroll = () => {
      const nav = categoryNavRef.current;
      if (!nav) return;
      const pageScrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (pageScrollable <= 0) return;
      const ratio = window.scrollY / pageScrollable;
      nav.scrollTop = ratio * (nav.scrollHeight - nav.clientHeight);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [viewMode]);


    // Show skeleton loader while initial data is being requested
    const isDataLoading = menuLoading || restaurantsLoading || categoriesLoading;

    const controlBaseStyle = {
      width: '100%',
      borderRadius: '0.25rem',
      border: '1px solid rgba(117,18,1,0.2)',
      padding: '0.5rem',
      background: '#fff',
      color: '#751201'
    };

    const renderMenuCardSkeleton = (key, style = {}) => (
      <div key={key} style={style}>
        <div className="card menu-item-card h-100">
          <div className="skeleton-menu-image"></div>
          <div className="card-body">
            <div className="skeleton-title mb-2"></div>
            <div className="skeleton-text mb-2"></div>
            <div className="skeleton-text-short mb-3"></div>
            <div className="flex justify-between items-center">
              <div className="skeleton-price"></div>
              <div className="skeleton-button-small"></div>
            </div>
          </div>
        </div>
      </div>
    );

    // useEffect(() => {
    //   if (viewMode !== 'category') {
    //     setMobileCategoriesOpen(false);
    //   }
    // }, [viewMode]);
    if (isDataLoading) {
      return (
        <div className="container90 mt1-00">
          <div className="mb1-00">
            <div className="skeleton-page-title mb-2"></div>
            <div className="skeleton-text" style={{ width: '60%' }}></div>
          </div>

          <div className="grid gtc12 relative ggap1-00">
            <aside className="gc1s12 gc1s3-m">
              <div className="sticky top-4 pa1-00">
                <div className="skeleton-input mb-3"></div>
                <div className="skeleton-input mb-3"></div>
                <div className="skeleton-input mb-3"></div>
                <div className="skeleton-input mb-3"></div>
                <div className="skeleton-button mb-3"></div>
                <div className="skeleton-text-short"></div>
              </div>
            </aside>

            <div className="gc1s12 gc4s9-m">
              {viewMode === 'grid' ? (
                <div className="grid gtc1 gtc2-l ggap1-00">
                  {Array.from({ length: 6 }).map((_, i) => renderMenuCardSkeleton(i))}
                </div>
              ) : (
                <div className="flex flex-column gap-3">
                  {Array.from({ length: 3 }).map((_, groupIndex) => (
                    <div key={groupIndex} className="mv2-00 pa2-00 bg-black-10">
                      <div className="skeleton-title mb-3" style={{ width: '40%' }}></div>
                      <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', overflowY: 'clip' }}>
                        {Array.from({ length: 3 }).map((__, cardIndex) =>
                          renderMenuCardSkeleton(`${groupIndex}-${cardIndex}`, {
                            minWidth: '320px',
                            maxWidth: '360px',
                            flex: '0 0 auto'
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
    <div className="container90" style={{ overflow: 'visible' }}>
      {/* Mobile sidebar toggle button */}
      <button
          className="dn-m fixed z-999 
              w2-50 h2-50 
              shadow-4 
              top-5 left-1 
              br0-25 b--none 
            pointer bg-brown0 gold0"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
      >
          <FaBars aria-hidden="true" className="f1-50" />
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
                          className="ba pa0-25 br0-25 bg-transparent pointer brown0"
                          onClick={() => setSidebarOpen(false)}
                          style={{
                              position: 'absolute',
                              top: '1rem',
                              right: '1rem',
                            borderColor: 'rgba(117,18,1,0.3)',
                          }}
                      >
                          <FaTimes aria-hidden="true" />
                      </button>
                      <div className="pa1-00">
                        {/* Stats card */}
                        <div className="mb2-00 bg-brown0 br0-25 pa1-00">
                          <h2 className="f1-25 gold0 mb1-00 bb pb0-50" style={{ borderColor: 'rgba(250,223,150,0.3)' }}>
                            {restaurantName ? `${restaurantName}` : 'Menu'}
                          </h2>
                          <div className="grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div className="f1-50 fw7 gold0">{totalGroupedItems}</div>
                              <div className="f0-75 white" style={{ opacity: 0.8 }}>Items</div>
                            </div>
                            <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div className="f1-50 fw7 gold0">{sortedCategoryGroups.length}</div>
                              <div className="f0-75 white" style={{ opacity: 0.8 }}>Categories</div>
                            </div>
                          </div>
                        </div>

                        {/* View mode toggle */}
                        <div className="mb2-00 grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
                          <button
                            type="button"
                            className="pa0-50 br0-25 pointer ba"
                            style={{
                              background: viewMode === 'grid' ? '#c8860a' : 'transparent',
                              color: viewMode === 'grid' ? '#fff' : 'inherit',
                              fontWeight: viewMode === 'grid' ? 700 : 400,
                            }}
                            onClick={() => setViewMode('grid')}
                          >
                            <FaTh className="mr0-25" aria-hidden="true" />
                            Grid
                          </button>
                          <button
                            type="button"
                            className="pa0-50 br0-25 pointer ba"
                            style={{
                              background: viewMode === 'category' ? '#c8860a' : 'transparent',
                              color: viewMode === 'category' ? '#fff' : 'inherit',
                              fontWeight: viewMode === 'category' ? 700 : 400,
                            }}
                            onClick={() => setViewMode('category')}
                          >
                            <FaListUl className="mr0-25" aria-hidden="true" />
                            By Category
                          </button>
                        </div>

                        {/* Filters - from desktop sidebar */}
                        <div className="mb2-00">
                          <p className="bg-brown0 pa0-50 br0-25 mb1-00 f1-25 gold0 flex items-center justify-center">
                            Filters
                          </p>
                          {/* Search */}
                          <div className="mb1-00 flex items-center w-100" style={{ gap: '0.5rem' }}>
                            <span className="f1-25 brown0"><FaSearch aria-hidden="true" /></span>
                            <input
                              type="text"
                              placeholder="Search menu items..."
                              className="w-100 pa0-50 br0-25 brown0"
                              style={controlBaseStyle}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                          </div>

                          {/* Restaurant filter */}
                          <div className="mb1-00">
                            <select
                              className="pa0-50 w-100 br0-25 brown0"
                              style={controlBaseStyle}
                              value={restaurantFilter}
                              onChange={(e) => { if (!slug) setRestaurantFilter(e.target.value); }}
                              disabled={!!slug}
                            >
                              <option value="">All Restaurants</option>
                              {restaurants?.map((r) => (
                                <option key={r.id} value={r.name}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Dietary filter */}
                          <div className="mb1-00">
                            <select
                              className="pa0-50 w-100 br0-25 brown0"
                              style={controlBaseStyle}
                              value={dietaryFilter}
                              onChange={(e) => setDietaryFilter(e.target.value)}
                            >
                              <option value="">All Dietary</option>
                              <option value="vegan">Vegan</option>
                              <option value="vegetarian">Vegetarian</option>
                              <option value="gluten_free">Gluten-Free</option>
                            </select>
                          </div>

                          {/* Meal period filter */}
                          <div className="mb1-00">
                            <select
                              className="pa0-50 w-100 br0-25 brown0"
                              style={controlBaseStyle}
                              value={mealPeriodFilter}
                              onChange={(e) => setMealPeriodFilter(e.target.value)}
                            >
                              <option value="">All Meal Periods</option>
                              <option value="breakfast">Breakfast</option>
                              <option value="lunch">Lunch</option>
                              <option value="supper">Supper</option>
                              <option value="all day">All Day</option>
                            </select>
                          </div>

                          {/* Sort filter */}
                          <div className="mb1-00">
                            <select
                              className="pa0-50 w-100 br0-25 brown0"
                              style={controlBaseStyle}
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value)}
                            >
                              <option value="name">Sort by Name</option>
                              <option value="price_low">Price: Low to High</option>
                              <option value="price_high">Price: High to Low</option>
                              <option value="meal_period">Meal Time</option>
                              <option value="prep_time">Prep Time</option>
                              <option value="restaurant">Restaurant</option>
                            </select>
                          </div>
                        </div>
                      </div>
                  </aside>
              </div>
          )
      }

      {/* Mobile top bar */}
      <div className="flex justify-between align-center mv2-00 bg-brown0 pa1-00 br0-25">
        {slug ? (
          <div className="flex items-center" style={{ gap: '0.5rem' }}>
            <Link to={`/restaurants/${slug}`} className="ba b--gold1 pa0-50 br0-25 flex items-center gold1 bg-transparent">
              ← {restaurantName || 'Restaurant'}
            </Link>
            <Link to="/menu" className="ba b--gold1 pa0-50 br0-25 flex items-center gold1 bg-transparent">
              Menu
            </Link>
          </div>
        ) : (
          <span className="f1-25 gold0">
            <FaUtensils className="mr0-50" aria-hidden="true" />
            All Menus
          </span>
        )
        }
        <div className="flex items-center" style={{ gap: '0.5rem' }}>
          {!slug && user && (user.user_type === 'vendor' || user.user_type === 'platform_admin') && (
            <button
              type="button"
              className="ba b--gold1 pa0-50 br0-25 flex items-center gold1 bg-transparent pointer"
              onClick={handleOpenAddMenu}
            >
              <FaPlusCircle className="mr0-25" aria-hidden="true" />Add Menu
            </button>
          )}
          {!slug && user && (user.user_type === 'vendor' || user.user_type === 'platform_admin') && ownedRestaurants.length > 1 && (
            <select
              className="pa0-50 br0-25 brown0"
              style={{ minWidth: '180px', border: '1px solid rgba(117,18,1,0.25)', background: '#fff' }}
              value={addMenuRestaurantId}
              onChange={(event) => setAddMenuRestaurantId(event.target.value)}
            >
              {ownedRestaurants.map((restaurant) => (
                <option key={restaurant.id} value={String(restaurant.id)}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          )}
          {mealPeriodFilter && (
            <button
              type="button"
              className="ba pa0-25 br0-25 bg-transparent gold0 pointer"
              style={{ borderColor: 'rgba(250,223,150,0.35)' }}
              onClick={() => { setMealPeriodFilter(''); window.history.pushState({}, '', '/menu'); }}
            >
              <FaTimes className="mr0-25" aria-hidden="true" />Clear meal filter
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between pa0-75 br0-25 mb1-00 mv1-00"
          style={{ background: '#fdecea', border: '1px solid #f5c6cb', color: '#721c24' }}
          role="alert"
        >
          <div className="flex items-center" style={{ gap: '0.5rem' }}>
            <FaExclamationTriangle aria-hidden="true" />
            <div><strong>Failed to load menu</strong> — {error}</div>
          </div>
          <button type="button" className="ba pa0-25 br0-25 bg-transparent pointer" onClick={() => setError(null)} aria-label="Close">✕</button>
        </div>
      )}

      <div className="grid gtc12 relative ggap1-00 brown0 bg-white">
        {/* ── Sidebar ── */}
        <aside className="dn db-m gc1s12 gc1s3-m">
          <div className="sticky top-2" style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Stats card */}
            <div className="mb2-00 bg-brown0 br0-25 pa1-00">
              <h2 className="f1-25 gold0 mb1-00 bb pb0-50">
                {restaurantName ? `${restaurantName}` : 'Menu'}
              </h2>
              <div className="grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-50 fw7 gold0">{totalGroupedItems}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Items</div>
                </div>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-50 fw7 gold0">{sortedCategoryGroups.length}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Categories</div>
                </div>
              </div>
            </div>

            {/* View mode toggle */}
            <div className="mb2-00 grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button
                type="button"
                className="pa0-50 br0-25 pointer ba"
                style={{
                  background: viewMode === 'grid' ? '#c8860a' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : 'inherit',
                  fontWeight: viewMode === 'grid' ? 700 : 400,
                }}
                onClick={() => setViewMode('grid')}
              >
                <FaTh className="mr0-25" aria-hidden="true" />
                Grid
              </button>
              <button
                type="button"
                className="pa0-50 br0-25 pointer ba"
                style={{
                  background: viewMode === 'category' ? '#c8860a' : 'transparent',
                  color: viewMode === 'category' ? '#fff' : 'inherit',
                  fontWeight: viewMode === 'category' ? 700 : 400,
                }}
                onClick={() => setViewMode('category')}
              >
                <FaListUl className="mr0-25" aria-hidden="true" />
                By Category
              </button>
            </div>

            {/* Filters */}
            <div className="mb2-00">
              <p className="bg-brown0 pa0-50 br0-25 mb1-00 f1-25 gold0 flex items-center justify-center">
                Filters
              </p>
              {/* Search */}
              <div className="mb1-00 flex items-center w-100" style={{ gap: '0.5rem' }}>
                <span className="f1-25 brown0"><FaSearch aria-hidden="true" /></span>
                <input
                  type="text"
                  className="w-100 pa0-50 br0-25 brown0"
                  style={controlBaseStyle}
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {/* Restaurant */}
              <div className="mb1-00">
                <select
                  className="w-100 pa0-50 br0-25 brown0"
                  style={controlBaseStyle}
                  value={restaurantFilter}
                  onChange={(e) => { if (!slug) setRestaurantFilter(e.target.value); }}
                  disabled={!!slug}
                >
                  <option value="">All Restaurants</option>
                  {restaurants.map(restaurant => (
                    <option key={restaurant.id} value={restaurant.name}>{restaurant.name}</option>
                  ))}
                </select>
              </div>
              {/* Meal time */}
              <div className="mb1-00">
                <select className="w-100 pa0-50 br0-25 brown0" style={controlBaseStyle} value={mealPeriodFilter} onChange={(e) => setMealPeriodFilter(e.target.value)}>
                  <option value="">All Meal Times</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="supper">Supper</option>
                  <option value="all day">All Day</option>
                </select>
              </div>
              {/* Dietary */}
              <div className="mb1-00">
                <select className="w-100 pa0-50 br0-25 brown0" style={controlBaseStyle} value={dietaryFilter} onChange={(e) => setDietaryFilter(e.target.value)}>
                  <option value="">All Dietary</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="gluten_free">Gluten-Free</option>
                </select>
              </div>
              {/* Sort */}
              <div className="mb1-00">
                <select className="w-100 pa0-50 br0-25 brown0" style={controlBaseStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">Sort by Name</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="meal_period">Meal Time</option>
                  <option value="prep_time">Prep Time</option>
                  <option value="restaurant">Restaurant</option>
                </select>
              </div>
              {/* Reset */}
              {(searchTerm || dietaryFilter || (!slug && restaurantFilter) || mealPeriodFilter) && (
                <button
                  type="button"
                  className="w-100 pa0-50 br0-25 pointer ba bg-transparent mb1-00"
                  onClick={() => { setSearchTerm(''); setDietaryFilter(''); if (!slug) setRestaurantFilter(''); setMealPeriodFilter(''); }}
                >
                  <FaUndoAlt className="mr0-25" aria-hidden="true" />
                  Reset Filters
                </button>
              )}
            </div>

            {/* Category anchor nav (category view only) */}
            {viewMode === 'category' && sortedCategoryGroups.length > 0 && (
              <nav ref={categoryNavRef} className=" ba br0-25" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} aria-label="Menu categories">
                <p className="bg-brown0 pa0-50 br0-25 mb1-00 f1-25 gold0 flex items-center justify-center" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  Categories
                </p>
                <ul className="ph1-00 menu-categories-list" ref={desktopCategoriesListRef}>
                  {sortedCategoryGroups.map(group => {
                    const categoryId = categoryAnchorId(group.name);
                    return (
                      <li key={group.name} className="list-unstyled mb0-50">
                        <a
                          id={categoryNavItemId(group.name)}
                          href={`#${categoryId}`}
                          className={`text-decoration-none ${activeCategoryId === categoryId ? 'black b' : 'black-60'}`}
                          onClick={handleCategoryLinkClick(categoryId)}
                          aria-current={activeCategoryId === categoryId ? 'true' : undefined}
                        >
                          <div className="flex justify-between">
                            <div className="tl">{group.name}</div>
                            <div className="ba w2-00 h2-00 br0-25 flex items-center justify-center tr">
                              {group.items.length}
                            </div>
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="gc1s12 gc4s9-m min-w-0">
          {/* Mobile categories toggle (category view only) */}
          {/* Mobile categories toggle removed: unused state and handler */}

          {/* Section header */}
          <div className="shadow-4 mb2-00">
            <header className="flex items-center justify-between mb0-00 f1-50 bt bb bw2 bg-gold0 pa0-50">
              <h5 className="mb0-00 brown0 b">
                <FaUtensils className="mr0-50" aria-hidden="true" />
                {restaurantName ? `${restaurantName} Menu` : 'Our Menu'}
                
              </h5>
              <div>
                {totalGroupedItems > 0 && (
                  <span className="ml0-50 pa0-25 br0-25 f0-75 brown0" style={{ background: 'rgba(117,18,1,0.12)' }}>
                    {totalGroupedItems} menus
                  </span>
                )}
              </div>
            </header>
          </div>

          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid gtc1 gtc2-l ggap1-00 pa0-50">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <MenuItemCard key={item.id} item={item} />
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="empty-state" role="status" aria-live="polite">
                    <span className="empty-icon" aria-hidden="true"><FaBookOpen /></span>
                    <h3 className="silver">No menu items found</h3>
                    <p>Try adjusting your search or filters.</p>
                    <div className="empty-actions">
                      <button className="ba pa0-50 br0-25 bg-transparent brown0 pointer" onClick={() => setSearchTerm('')}>
                        <FaEraser className="mr0-25" aria-hidden="true" />Clear Search
                      </button>
                      <button className="ba pa0-50 br0-25 bg-transparent brown0 pointer" onClick={() => { setDietaryFilter(''); setRestaurantFilter(''); setMealPeriodFilter(''); }}>
                        <FaUndoAlt className="mr0-25" aria-hidden="true" />Reset Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Category View */
            sortedCategoryGroups.length > 0 ? (
              sortedCategoryGroups.map(group => (
                <div
                  key={group.name}
                  id={categoryAnchorId(group.name)}
                  className="shadow-4 mb2-00"
                >
                  {/* Gold category header */}
                  <div className="flex items-center justify-between bt bb bw2 bg-gold0 pa0-50 mb1-00">
                    <h5 className="f1-25 b mb0-00 brown0">
                      {group.name}
                      <span style={{ fontWeight: 400, fontSize: '0.85rem' }}> ({group.items.length} available)</span>
                    </h5>
                    {group.items.length >= 2 && (
                      <div className="flex items-center" style={{ gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="ba pa0-25 br0-25 pointer bg-transparent brown0"
                          onClick={() => scrollCategoryRow(group.name, 'left')}
                          aria-label={`Scroll ${group.name} left`}
                        >
                          <FaChevronLeft aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="ba pa0-25 br0-25 pointer bg-transparent brown0"
                          onClick={() => scrollCategoryRow(group.name, 'right')}
                          aria-label={`Scroll ${group.name} right`}
                        >
                          <FaChevronRight aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>

                  {group.items.length >= 2 ? (
                    /* 2+ items: horizontal scroll */
                    <div className="menu-scroll-wrapper pa1-00" style={{ position: 'relative' }}>
                      {getRowFade(group.name).left && <span className="menu-scroll-fade menu-scroll-fade-left" aria-hidden="true" />}
                      {getRowFade(group.name).right && <span className="menu-scroll-fade menu-scroll-fade-right" aria-hidden="true" />}
                      <div
                        id={categoryScrollerId(group.name)}
                        className="menu-horizontal-scroll"
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          overflowX: 'auto',
                          overflowY: 'clip',
                          paddingBottom: '0.5rem',
                          scrollSnapType: 'x proximity',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                          overscrollBehaviorX: 'contain',
                          touchAction: 'pan-x',
                        }}
                        onWheel={(e) => {
                          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                            e.preventDefault();
                            window.scrollBy({ top: e.deltaY, behavior: 'auto' });
                          }
                        }}
                      >
                        {group.items.map(item => (
                          <div
                            key={item.id}
                            style={{ minWidth: '320px', maxWidth: '360px', flex: '0 0 auto', scrollSnapAlign: 'start' }}
                          >
                            <MenuItemCard item={item} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* 1 item: centered */
                    <div className="pa1-00 flex justify-center">
                      <div style={{ width: '100%', maxWidth: '360px' }}>
                        {group.items.map(item => <MenuItemCard key={item.id} item={item} />)}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="pa2-00 empty-state" role="status" aria-live="polite">
                <span className="empty-icon" aria-hidden="true"><FaBookOpen /></span>
                <h3>No menu items found</h3>
                <p>Try adjusting your search or filters.</p>
                <div className="empty-actions">
                  <button className="ba pa0-50 br0-25 bg-transparent brown0 pointer" onClick={() => setSearchTerm('')}>
                    <FaEraser className="mr0-25" aria-hidden="true" />Clear Search
                  </button>
                  <button className="ba pa0-50 br0-25 bg-transparent brown0 pointer" onClick={() => { setDietaryFilter(''); setRestaurantFilter(''); setMealPeriodFilter(''); }}>
                    <FaUndoAlt className="mr0-25" aria-hidden="true" />Reset Filters
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <MenuItemFormModal
        show={showAddMenuModal}
        onHide={() => setShowAddMenuModal(false)}
        restaurantId={addMenuRestaurantId}
        onRequestCreateCategory={() => {
          setShowAddMenuModal(false);
          navigate('/vendor/categories');
        }}
        onSuccess={() => {
          setShowAddMenuModal(false);
          loadMenuItems();
        }}
      />
    </div>
  );
};

export default MenuPage;
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../App';
import SelectedRestaurants from '../components/homePage/SelectedRestaurants';
import SelectedRestaurantsSkeleton from '../components/homePage/SelectedRestaurantsSkeleton';
import MenuCategories from '../components/homePage/MenuCategories';
import MenuCategoriesSkeleton from '../components/homePage/MenuCategoriesSkeleton';
import { loadMyConnectionsCount, loadSocialDiningState } from '../utils/socialDiningData';
import AsideUser from '../components/homePage/AsideUser';
import { FaChevronLeft, FaChevronRight, FaStar, FaUtensils, FaExclamationTriangle } from 'react-icons/fa';
import { canManageRestaurants } from '../utils/userRoles';

const SIDEBAR_PLACEHOLDERS = [
    'You may also like',
    'Feedback',
    'You may know',
    'Top Restaurants'
];

function UpcomingSocialPlansCard({ upcomingSocialPlans = [] }) {
    return (
        <div className="shadow-4 pa0-50 mb2-00 br0-25 ba bg-gold5 brown0 b--gold0"
        >
            <div className="fw-bold mb-2 brown0">Upcoming Social Plans</div>
            {upcomingSocialPlans.length === 0 ? (
                <div className="small" style={{ color: '#666' }}>
                    No upcoming plans yet. Start one and invite diners.
                </div>
            ) : (
                <div className="grid" style={{ gap: '0.5rem' }}>
                    {upcomingSocialPlans.map((plan) => (
                        <div key={plan.id}
                            className="br0-25 pa0-50 ba bg-white"
                            style={{ borderColor: 'rgba(92,61,46,0.15)' }}
                        >
                            <div className="small fw-bold brown0"
                            >
                                {plan.title || 'Dining plan'}
                            </div>
                            <div className="small" style={{ color: '#666' }}
                            >
                                {plan.restaurantName || 'Restaurant'}
                            </div>
                            <div className="small" style={{ color: '#666' }}
                            >
                                {new Date(plan.scheduledFor).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SidebarPlaceholderCards() {
    return SIDEBAR_PLACEHOLDERS.map(
        (label) => (
            <div key={label} className="shadow-4 pa0-50 mb1-00 br0-25 ba bg-gold5 brown0 b--gold0">
                <span className="b brown0">{label}</span>
            </div>
        )
    );
}

function SidebarAnalytics({
    loadAnalyticsCounts,
    analyticsLoading,
    analyticsStatusClass,
    analyticsStatusLabel,
    analyticsHint,
    socialAnalyticsHint,
    userAnalytics
}) {
    return (
        <AsideUser
            loadAnalyticsCounts={loadAnalyticsCounts}
            analyticsLoading={analyticsLoading}
            analyticsStatusClass={analyticsStatusClass}
            analyticsStatusLabel={analyticsStatusLabel}
            analyticsHint={analyticsHint}
            socialAnalyticsHint={socialAnalyticsHint}
            userAnalytics={userAnalytics}
        />
    );
}

// --- PopularCuisinesCarousel component ---
function PopularCuisinesCarousel({ cuisines = [] }) {
    const [scrollIndex, setScrollIndex] = useState(0);
    const [visibleCount, setVisibleCount] = useState(4);

    // Responsive visibleCount
    useEffect(() => {
        function updateVisibleCount() {
            const width = window.innerWidth;
            if (width < 384) setVisibleCount(1);
            else if (width < 512) setVisibleCount(2);
            else if (width < 768) setVisibleCount(3);
            else setVisibleCount(4);
        }
        updateVisibleCount();
        window.addEventListener('resize', updateVisibleCount);
        return () => window.removeEventListener('resize', updateVisibleCount);
    }, []);

    const maxIndex = Math.max(0, cuisines.length - visibleCount);

    const scrollToIndex = (idx) => {
        setScrollIndex(idx);
    };

    const handleLeft = () => scrollToIndex(Math.max(0, scrollIndex - 1));
    const handleRight = () => scrollToIndex(Math.min(maxIndex, scrollIndex + 1));

    // Only render the visible items
    const visibleCuisines = cuisines.slice(scrollIndex, scrollIndex + visibleCount);

    // // Scroll indicator dots (one per possible window)
    // const indicators = Array.from({ length: maxIndex + 1 }).map((_, i) => (
    //     <span
    //         key={i}
    //         className={i === scrollIndex ? 'carousel-dot active' : 'carousel-dot'}
    //         onClick={() => scrollToIndex(i)}
    //     />
    // ));

    return (
        <div className="flex items-stretch justify-between
            mb2-00  
            shadow-4
            br0-25 ba 
            b--gold0"
        >
            <div className="flex bg-brown0 items-center justify-center self-stretch">
                <button
                    className="w4-00 h-100 br0-25 b--none pointer flex items-center justify-center"
                    style={{ background: 'transparent', boxShadow: 'none', color: '#fff' }}
                    onClick={handleLeft}
                    aria-label="Scroll left"
                    disabled={scrollIndex === 0}
                >
                    <FaChevronLeft size={18} />
                </button>
            </div>
           
            <div className="flex ggap1-00 w-100 pa2-00">
                {visibleCuisines.map((cuisine, idx) => (
                    <div className="w-100 flex" key={cuisine.id || cuisine.slug || idx}>
                        <Link to={`/restaurants?cuisine=${encodeURIComponent(cuisine.name || '')}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', width: '100%' }}>
                            <figure className="carousel-cuisine-card">
                                {cuisine.image ? (
                                    <img src={cuisine.image} 
                                        alt={cuisine.name} 
                                        className="w h8-00 br0-50 cover shadow-5" />
                                ) : (
                                    <span
                                        className="carousel-cuisine-emoji flex items-center justify-center"
                                        style={{ display: 'block', marginBottom: '0.25rem', minHeight: '2.5rem' }}
                                    >
                                        <FaUtensils size={28} color="#8b6b3f" />
                                    </span>
                                )}
                                <figcaption className="mv1-00 fw6">
                                    {cuisine.name}
                                </figcaption>
                                <div
                                    className="carousel-cuisine-meta flex flex-column items-center justify-center"
                                    style={{ fontSize: '0.85rem', color: '#888', gap: '0.2rem' }}
                                >
                                    {cuisine.restaurant_count ? (
                                        <span>{cuisine.restaurant_count} restaurants</span>
                                    ) : null}
                                    {cuisine.avg_rating != null && !isNaN(Number(cuisine.avg_rating)) ? (
                                        <span className="flex items-center justify-center" style={{ gap: '0.25rem' }}>
                                            <FaStar size={12} color="#d4a017" />
                                            <span>{Number(cuisine.avg_rating).toFixed(1)}</span>
                                        </span>
                                    ) : null}
                                </div>
                            </figure>
                        </Link>
                    </div>
                ))}
            </div>

            <div className="flex bg-brown0 items-center justify-center self-stretch">
                <button
                    className="w4-00 h-100 br0-25 b--none pointer flex items-center justify-center"
                    style={{ background: 'transparent', boxShadow: 'none', color: '#fff' }}
                    onClick={handleRight}
                    aria-label="Scroll right"
                    disabled={scrollIndex === maxIndex}
                >
                    <FaChevronRight size={18} />
                </button>
            </div>
            {/* <div className="carousel-indicators">{indicators}</div> */}
        </div>
    );
}

// Restaurants page component
const HomePage = () => {
    // Sidebar toggle for mobile
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarRef = useRef(null);
    const { restaurants, 
        loading, 
        setRestaurants, 
        setLoading, 
        setError, 
        API_BASE_URL, 
        menuItems, 
        setMenuItems, 
        error, 
        user 
    } = useApp();
    const [popularCuisines, setPopularCuisines] = useState([]);
    const [menuCategories, setMenuCategories] = useState([]);
    const [analyticsTotals, setAnalyticsTotals] = useState(
        {
            restaurants: null,
            menus: null,
            availableMenus: null,
            cuisines: null,
            categories: null,
            myRestaurants: null,
            myMenus: null,
            myCategories: null
        }
    );
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsError, setAnalyticsError] = useState(null);
    const [socialPlans, setSocialPlans] = useState([]);
    const [socialPlansSource, setSocialPlansSource] = useState('none');
    const [myConnectionsCount, setMyConnectionsCount] = useState(0);
    const [myConnectionsSource, setMyConnectionsSource] = useState('none');

    const normalizeArray = (data) => {
        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.results)) {
            return data.results;
        }

        return [];
    };

    const fetchAllPages = async (initialUrl, config = {}) => {
        const allResults = [];
        let nextUrl = initialUrl;

        while (nextUrl) {
            const response = await axios.get(nextUrl, config);
            const payload = response.data;

            if (Array.isArray(payload)) {
                allResults.push(...payload);
                nextUrl = null;
            } else {
                allResults.push(...(payload?.results || []));
                nextUrl = payload?.next || null;
            }
        }

        return allResults;
    };

    const uniqueCountBy = (list, getKey) => {
        if (!Array.isArray(list)) {
            return 0;
        }

        const keys = list
            .map(getKey)
            .filter((value) => value !== undefined && value !== null && value !== '');

        return new Set(keys).size;
    };

    const sumUniqueCountBy = (lists, getKey) => {
        if (!Array.isArray(lists)) {
            return 0;
        }

        const all = lists.flatMap((list) => (Array.isArray(list) ? list : []));
        return uniqueCountBy(all, getKey);
    };
    // Load menu categories from backend (all pages)
    const loadMenuCategories = async () => {
        try {
            const allCategories = [];
            let nextUrl = `${API_BASE_URL}/categories/`;

            while (nextUrl) {
                const response = await axios.get(nextUrl);
                const payload = response.data;

                if (Array.isArray(payload)) {
                    allCategories.push(...payload);
                    nextUrl = null;
                } else {
                    allCategories.push(...(payload?.results || []));
                    nextUrl = payload?.next || null;
                }
            }

            setMenuCategories(allCategories);
        } catch (err) {
            setMenuCategories([]);
        }
    };

    // Load restaurants (force=true bypasses the cached-data bail)
    const loadRestaurants = async (force = false) => {
        if (!force && restaurants && restaurants.length > 0) {
            return;
        }
    
        setLoading(true);
        try {
            const restaurantsResponse = await axios.get(`${API_BASE_URL}/restaurants/`);
            const restaurantsData = restaurantsResponse.data.results || restaurantsResponse.data;
            setRestaurants(restaurantsData);
            setError(null);
        } catch (err) {
            setError('Failed to load restaurants. Please try again.');
            setRestaurants([]);
        } finally {
            setLoading(false);
        }
    };

    // Load menu items (force=true bypasses the cached-data bail)
    const loadMenuItems = async (force = false) => {
        if (!force && menuItems && menuItems.length > 0) {
            return;
        }
    
        try {
            const menuResponse = await axios.get(`${API_BASE_URL}/menu-items/`);
            const menuData = menuResponse.data.results || menuResponse.data;
            setMenuItems(menuData);
        } catch (menuError) {
            setMenuItems([]);
        }
    };

    // Load popular cuisines from backend
    const loadPopularCuisines = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/restaurants/popular-cuisines/`);
            setPopularCuisines(normalizeArray(response.data));
        } catch (err) {
            setPopularCuisines([]);
        }
    };

    // DRY refresh logic — force=true skips cached-data bail
    const handleRefresh = () => {
        loadRestaurants(true);
        loadMenuItems(true);
        loadPopularCuisines();
        loadMenuCategories();
        loadAnalyticsCounts();
        loadSocialState();
    };

    const loadSocialState = async () => {
        const [socialState, connectionsState] = await Promise.all([
            loadSocialDiningState({ API_BASE_URL, user }),
            loadMyConnectionsCount({ API_BASE_URL, user })
        ]);

        setSocialPlans(Array.isArray(socialState?.plans) ? socialState.plans : []);
        setSocialPlansSource(socialState?.source || 'none');
        setMyConnectionsCount(Number(connectionsState?.count || 0));
        setMyConnectionsSource(connectionsState?.source || 'none');
    };

    const loadAnalyticsCounts = async () => {
        setAnalyticsLoading(true);
        setAnalyticsError(null);

        try {
            const [allRestaurants, allMenus, cuisines, allCategories] = await Promise.all([
                fetchAllPages(`${API_BASE_URL}/restaurants/`),
                fetchAllPages(`${API_BASE_URL}/menu-items/`),
                fetchAllPages(`${API_BASE_URL}/restaurants/popular-cuisines/`),
                fetchAllPages(`${API_BASE_URL}/categories/`)
            ]);

            const baseCounts = {
                restaurants: uniqueCountBy(allRestaurants, (restaurant) => restaurant?.id ?? restaurant?.slug ?? restaurant?.name),
                menus: uniqueCountBy(allMenus, (item) => item?.id ?? item?.slug ?? item?.name),
                availableMenus: uniqueCountBy(
                    allMenus.filter((item) => item?.is_available),
                    (item) => item?.id ?? item?.slug ?? item?.name
                ),
                cuisines: uniqueCountBy(cuisines, (cuisine) => cuisine?.slug ?? cuisine?.name ?? cuisine),
                categories: uniqueCountBy(allCategories, (category) => category?.id ?? category?.slug ?? category?.name),
                myRestaurants: null,
                myMenus: null,
                myCategories: null
            };

            const isVendorAnalytics = canManageRestaurants(user);

            if (isVendorAnalytics) {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error('Authentication token missing for vendor analytics');
                }

                const authHeaders = { headers: { 'Authorization': `Token ${token}` } };
                const myRestaurants = await fetchAllPages(`${API_BASE_URL}/restaurants/my-restaurants/`, authHeaders);

                const menuLists = await Promise.all(
                    myRestaurants.map((restaurant) => fetchAllPages(
                        `${API_BASE_URL}/menu-items/?restaurant=${restaurant.id}`,
                        authHeaders
                    ))
                );
                const categoryLists = await Promise.all(
                    myRestaurants.map((restaurant) => fetchAllPages(
                        `${API_BASE_URL}/categories/?restaurant=${restaurant.id}`,
                        authHeaders
                    ))
                );

                baseCounts.myRestaurants = uniqueCountBy(myRestaurants, (restaurant) => restaurant?.id ?? restaurant?.slug ?? restaurant?.name);
                baseCounts.myMenus = sumUniqueCountBy(
                    menuLists,
                    (item) => item?.id ?? item?.slug ?? item?.name
                );
                baseCounts.myCategories = sumUniqueCountBy(
                    categoryLists,
                    (category) => category?.id ?? category?.slug ?? category?.name
                );
            }

            setAnalyticsTotals(baseCounts);
        } catch (analyticsCountError) {
            console.error('Failed to load backend-authoritative analytics:', analyticsCountError);
            setAnalyticsError('Analytics unavailable from backend');
            setAnalyticsTotals({
                restaurants: null,
                menus: null,
                availableMenus: null,
                cuisines: null,
                categories: null,
                myRestaurants: null,
                myMenus: null,
                myCategories: null
            });
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // Load data on mount
    useEffect(() => {
        loadRestaurants();
        loadMenuItems();
        loadPopularCuisines();
        loadMenuCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(
        () => {
            loadAnalyticsCounts();
            loadSocialState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [API_BASE_URL, user?.id, user?.user_type, user?.email, user?.username]
    );

    useEffect(
        () => {
            const onStorage = () => {
                loadSocialState();
            };

            const onConnectionsUpdated = () => {
                loadSocialState();
            };

            const onPlansUpdated = () => {
                loadSocialState();
            };

            window.addEventListener('storage', onStorage);
            window.addEventListener('socialDining:connectionsUpdated', onConnectionsUpdated);
            window.addEventListener('socialDining:plansUpdated', onPlansUpdated);

            return () => {
                window.removeEventListener('storage', onStorage);
                window.removeEventListener('socialDining:connectionsUpdated', onConnectionsUpdated);
                window.removeEventListener('socialDining:plansUpdated', onPlansUpdated);
            };
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [API_BASE_URL, user?.id, user?.email, user?.username]
    );

    if (loading) {
        return (
            <div className="container container90 bg-white" style={{ overflow: 'visible' }}>
                <div className="grid gtc12 relative ggap1-00 brown0 bg-white mt2-00 justify-center">
                    {/* Sidebar skeleton (desktop & mobile) */}
                    <aside className="dn db-m gc1s12 gc1s3-m" aria-label="Sidebar skeleton">
                        <div className="sticky top-2 pa1-000 flex flex-column gap-2">
                            {/* User card skeleton */}
                            <div className="shadow-4 pa0-50 mb1-00 br0-25 ba bg-white brown0 b--gold0 flex flex-column items-center animate-skeleton" style={{minHeight:'210px',maxWidth:'320px'}}>
                                <span className="skeleton-circle shimmer mb-2" style={{width:'56px',height:'56px'}}></span>
                                <span className="skeleton-line shimmer mb-2" style={{width:'70%',height:'20px'}}></span>
                                <span className="skeleton-line shimmer mb-1" style={{width:'60%',height:'14px'}}></span>
                                <span className="skeleton-pill shimmer mb-2" style={{width:'40%',height:'18px'}}></span>
                            </div>
                            {/* Analytics skeleton */}
                            <div className="shadow-4 pa0-50 mb2-00 br0-25 ba bg-gold5 brown0 b--gold0 animate-skeleton" style={{minHeight:'120px',maxWidth:'320px'}}>
                                {[...Array(3)].map((_, i) => (
                                    <span key={i} className="skeleton-line shimmer mb-2" style={{width:`${60 + 10*i}%`,height:'16px',display:'block'}}></span>
                                ))}
                            </div>
                            {/* Placeholder cards */}
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="shadow-4 pa0-50 mb1-00 br0-25 ba bg-gold5 brown0 b--gold0 animate-skeleton" style={{minHeight:'60px',maxWidth:'320px'}}>
                                    <span className="skeleton-line shimmer mb-2" style={{width:'50%',height:'16px',display:'block'}}></span>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Main skeleton content */}
                    <div className="gc1s12 gc4s9-m grid gtc12 ggap1-00">
                        {/* Headline skeleton */}
                        <div className="gc1s12 flex flex-column pv3-00 ph1-00 bg-brown0 gold0 shadow-4 br0-25 mb2-00 tc f2-00-m animate-skeleton">
                            <span className="skeleton-line shimmer mb-2" style={{width:'40%',height:'36px',margin:'0 auto'}}></span>
                            <span className="skeleton-line shimmer mb-2" style={{width:'60%',height:'16px',margin:'0 auto'}}></span>
                            <div className="mb1-00 flex justify-around items-center flex-wrap gap-2">
                                {[...Array(3)].map((_, i) => (
                                    <span key={i} className="skeleton-pill shimmer" style={{height:'32px',width:'80px',display:'inline-block'}}></span>
                                ))}
                            </div>
                            <div className="flex justify-center flex-wrap gap-2">
                                {[...Array(2)].map((_, i) => (
                                    <span key={i} className="skeleton-pill shimmer" style={{height:'32px',width:'120px',display:'inline-block'}}></span>
                                ))}
                            </div>
                        </div>
                        {/* Popular Cuisines Skeleton */}
                        <div className="gc1s12 ba br0-25 shadow-4 bg-white pa0-50 animate-skeleton">
                            <span className="skeleton-line shimmer mb-2" style={{width:'30%',height:'28px'}}></span>
                            <span className="skeleton-line shimmer mb-2" style={{width:'50%',height:'16px'}}></span>
                            <div className="row ggap1-00">
                                {[...Array(4)].map((_, idx) => (
                                    <div className="col-6 col-md-3 mb-3 d-flex" key={idx}>
                                        <div className="card h-100 w-100 shadow-sm text-center flex flex-column align-items-center justify-content-center animate-skeleton" style={{minHeight:'140px'}}>
                                            <span className="skeleton-circle shimmer mb-2" style={{width:'48px',height:'48px'}}></span>
                                            <span className="skeleton-line shimmer mb-1" style={{width:'60%',height:'16px'}}></span>
                                            <span className="skeleton-line shimmer mb-1" style={{width:'40%',height:'12px'}}></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Featured Restaurants Skeleton */}
                        <div className="gc1s12 gc1s8-m ba br0-25 shadow-4 bg-white pa0-75 animate-skeleton">
                            <span className="skeleton-line shimmer mb-2" style={{width:'30%',height:'28px'}}></span>
                            <span className="skeleton-line shimmer mb-2" style={{width:'50%',height:'16px'}}></span>
                            <div className="row ggap1-00">
                                {[...Array(6)].map((_, i) => (
                                    <div className="col-6 col-md-4 col-lg-2 mb-3 d-flex" key={i}>
                                        <div className="card h-100 w-100 shadow-sm text-center flex flex-column align-items-center justify-content-center animate-skeleton" style={{minHeight:'140px'}}>
                                            <span className="skeleton-circle shimmer mb-2" style={{width:'48px',height:'48px'}}></span>
                                            <span className="skeleton-line shimmer mb-1" style={{width:'60%',height:'16px'}}></span>
                                            <span className="skeleton-line shimmer mb-1" style={{width:'40%',height:'12px'}}></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Menu Categories Skeleton */}
                        <div className="gc1s12 gc9s4-m ba br0-25 shadow-4 bg-white pa0-75 animate-skeleton">
                            <span className="skeleton-line shimmer mb-2" style={{width:'30%',height:'28px'}}></span>
                            <span className="skeleton-line shimmer mb-2" style={{width:'50%',height:'16px'}}></span>
                            {[...Array(2)].map((_, i) => (
                                <div className="mb-4" key={i}>
                                    <span className="skeleton-line shimmer mb-2" style={{width:'30%',height:'22px'}}></span>
                                    <div className="row ggap1-00">
                                        {[...Array(4)].map((_, j) => (
                                            <div className="col-6 col-md-3 col-lg-2 mb-3 d-flex" key={j}>
                                                <div className="card h-100 w-100 shadow-sm text-center flex flex-column align-items-center justify-content-center animate-skeleton" style={{minHeight:'100px'}}>
                                                    <span className="skeleton-circle shimmer mb-2" style={{width:'36px',height:'36px'}}></span>
                                                    <span className="skeleton-line shimmer mb-1" style={{width:'60%',height:'14px'}}></span>
                                                    <span className="skeleton-line shimmer mb-1" style={{width:'40%',height:'10px'}}></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Skeleton CSS for shimmer and shapes */}
                <style>{`
                    .animate-skeleton .shimmer {
                        position: relative;
                        overflow: hidden;
                        background: #ececec;
                    }
                    .skeleton-line {
                        border-radius: 6px;
                        display: block;
                        margin-bottom: 0.5rem;
                        min-height: 12px;
                    }
                    .skeleton-pill {
                        border-radius: 999px;
                        display: inline-block;
                        min-height: 24px;
                        background: #ececec;
                    }
                    .skeleton-circle {
                        border-radius: 50%;
                        display: inline-block;
                        background: #ececec;
                    }
                    .shimmer:before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -150px;
                        height: 100%;
                        width: 150px;
                        background: linear-gradient(90deg, rgba(236,236,236,0) 0%, rgba(255,255,255,0.7) 50%, rgba(236,236,236,0) 100%);
                        animation: shimmer 1.5s infinite;
                    }
                    @keyframes shimmer {
                        0% { left: -150px; }
                        100% { left: 100%; }
                    }
                    @media (max-width: 900px) {
                        .gc1s12.gc4s9-m { grid-column: 1 / span 12 !important; }
                        .gc1s12.gc1s8-m { grid-column: 1 / span 12 !important; }
                        .gc1s12.gc9s4-m { grid-column: 1 / span 12 !important; }
                    }
                `}</style>
            </div>
        );
    }

    const allMenusCount = analyticsTotals.menus;
    const restaurantsCount = analyticsTotals.restaurants;
    const cuisinesCount = analyticsTotals.cuisines;
    const availableMenusCount = analyticsTotals.availableMenus;
    const myRestaurantsCount = analyticsTotals.myRestaurants;
    const myMenusCount = analyticsTotals.myMenus;
    const isVendorAnalytics = canManageRestaurants(user);
    const usingLiveAnalytics = analyticsError === null && !analyticsLoading;
    const socialDiningLink = '/social-dining';
    const cuisinesLink = '/cuisines';
    const socialConnectionsHelper = myConnectionsSource === 'backend'
        ? 'Mutual dining connections (database)'
        : (myConnectionsSource === 'local' ? 'Mutual dining connections (local)' : 'Mutual dining connections');
    const socialPlansHelper = socialPlansSource === 'backend'
        ? 'Open dining plans (database)'
        : (socialPlansSource === 'local' ? 'Open dining plans (local)' : 'Open dining plans');
    const analyticsStatusLabel = isVendorAnalytics
        ?   (analyticsLoading 
                ? 'Loading live account data' 
                : (
                    usingLiveAnalytics 
                    ? 'Live account data' 
                    : 'Backend analytics unavailable'
                )
            )
        : (analyticsLoading ? 'Loading marketplace data' : (usingLiveAnalytics ? 'Marketplace data' : 'Backend analytics unavailable'));
    const analyticsStatusClass = usingLiveAnalytics ? 'text-success' : (analyticsLoading ? 'text-muted' : 'text-danger');
    const analyticsHint = isVendorAnalytics
        ? 'Track your storefront numbers and jump straight to management pages.'
        : 'Explore marketplace activity and open the most relevant pages quickly.';
    const displayCount = (value) => {
        if (analyticsLoading) {
            return '...';
        }
        if (value === null || value === undefined) {
            return 'N/A';
        }
        return value;
    };
    const upcomingSocialPlans = socialPlans
        .filter((plan) => {
            const planTime = new Date(plan?.scheduledFor || plan?.createdAt || 0).getTime();
            return Number.isFinite(planTime) && planTime >= Date.now();
        })
        .sort((left, right) => new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime())
        .slice(0, 3);
    const socialAnalyticsHint = user
        ? 'Social Dining tracks mutual connections and live group plans.'
        : 'Log in to track mutual connections and dining plans.';
    const userAnalytics = isVendorAnalytics
        ? [
            { label: 'My Restaurants', value: displayCount(myRestaurantsCount), to: '/vendor/dashboard', helper: 'View dashboard' },
            { label: 'My Menus', value: displayCount(myMenusCount), to: '/vendor/menu-items', helper: 'Manage items' },
            { label: 'All Menus', value: displayCount(allMenusCount), to: '/menu', helper: 'Browse catalog' },
            { label: 'Dining Plans', value: socialPlans.length, to: socialDiningLink, helper: socialPlansHelper },
            { label: 'My Connections', value: myConnectionsCount, to: '/connections', helper: socialConnectionsHelper },
        ]
        : user
            ? 
                [
                    { label: 'Restaurants', value: displayCount(restaurantsCount), to: '/restaurants', helper: 'Find places' },
                    { label: 'Available Menus', value: displayCount(availableMenusCount), to: '/menu', helper: 'Order now' },
                    { label: 'Popular Cuisines', value: displayCount(cuisinesCount), to: cuisinesLink, helper: 'Discover tastes' },
                    { label: 'Dining Plans', value: socialPlans.length, to: socialDiningLink, helper: socialPlansHelper },
                    { label: 'My Connections', value: myConnectionsCount, to: '/connections', helper: socialConnectionsHelper },
                ]
            : 
                [
                    { label: 'Restaurants', value: displayCount(restaurantsCount), to: '/restaurants', helper: 'Find places' },
                    { label: 'Menus', value: displayCount(allMenusCount), to: '/menu', helper: 'Explore dishes' },
                    { label: 'Popular Cuisines', value: displayCount(cuisinesCount), to: cuisinesLink, helper: 'See trends' },
                ]
            ;
    const headlineRestaurantsCount = displayCount(restaurantsCount);
    const headlineMenusCount = displayCount(allMenusCount);

    // Derive per-cuisine average ratings from the restaurants list (restaurant.rating or
    // restaurant.average_rating) since the popular-cuisines endpoint doesn't return avg_rating.
    const cuisinesWithRatings = (() => {
        if (!Array.isArray(restaurants) || restaurants.length === 0) return popularCuisines;
        const ratingsByCuisine = {};
        restaurants.forEach((r) => {
            const cuisineName = (r?.cuisine?.name || r?.cuisine || '').trim().toLowerCase();
            if (!cuisineName) return;
            const rating = Number(r?.average_rating ?? r?.rating ?? 0);
            if (rating > 0) {
                if (!ratingsByCuisine[cuisineName]) ratingsByCuisine[cuisineName] = { sum: 0, count: 0 };
                ratingsByCuisine[cuisineName].sum += rating;
                ratingsByCuisine[cuisineName].count += 1;
            }
        });
        return popularCuisines.map((cuisine) => {
            const key = (cuisine?.name || '').trim().toLowerCase();
            const entry = ratingsByCuisine[key];
            const computed = entry ? entry.sum / entry.count : null;
            return {
                ...cuisine,
                avg_rating: cuisine.avg_rating > 0
                    ? cuisine.avg_rating
                    : (computed ?? cuisine.avg_rating ?? null),
            };
        });
    })();


    // Main layout: sidebar (aside) and main content
    return (
        <div className="container container90 bg-white" 
            style={{ overflow: 'visible' }}>
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
                <span aria-hidden="true" className="f1-50"
                >☰</span>
            </button>
            <div className="grid gtc12 relative ggap1-00 brown0 bg-white mt2-00 justify-center">
                {/* Sidebar (desktop) */}
                <aside className="dn db-m gc1s12 gc1s3-m">
                    <div className="sticky top-2"
                        style={{ display: 'flex', flexDirection: 'column' }}
                    >
                        <SidebarAnalytics
                            loadAnalyticsCounts={loadAnalyticsCounts}
                            analyticsLoading={analyticsLoading}
                            analyticsStatusClass={analyticsStatusClass}
                            analyticsStatusLabel={analyticsStatusLabel}
                            analyticsHint={analyticsHint}
                            socialAnalyticsHint={socialAnalyticsHint}
                            userAnalytics={userAnalytics}
                        />
                        <UpcomingSocialPlansCard upcomingSocialPlans={upcomingSocialPlans} />
                        <SidebarPlaceholderCards />
                    </div>
                </aside>

                {/* Sidebar (mobile overlay) */}
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
                                <SidebarAnalytics
                                    loadAnalyticsCounts={loadAnalyticsCounts}
                                    analyticsLoading={analyticsLoading}
                                    analyticsStatusClass={analyticsStatusClass}
                                    analyticsStatusLabel={analyticsStatusLabel}
                                    analyticsHint={analyticsHint}
                                    socialAnalyticsHint={socialAnalyticsHint}
                                    userAnalytics={userAnalytics}
                                />
                                <UpcomingSocialPlansCard upcomingSocialPlans={upcomingSocialPlans} />
                                <SidebarPlaceholderCards />
                            </aside>
                        </div>
                    )
                }

                {/* Main content */}
                
                    {/* Example: headline, error, restaurants, cuisines, menu categories, etc. */}
                    <div className="gc1s12 gc4s9-m grid gtc12 ggap1-00">
                        <div className="gc1s12 flex flex-column
                            pv3-00 ph1-00
                            bg-brown0 gold0
                            shadow-4 
                            br0-25 mb2-00 tc f2-00-m
                            "
                        >
                            <h1 className="mb0-50">🏪 All Restaurants</h1>
                            <p className="mb1-00">
                                Discover our partner restaurants and their specialties
                            </p>
                            <div className="mb1-00"> 
                                <div className="flex justify-around items-center flex-wrap" style={{ gap: '0.5rem' }}>
                                    <div className="ba br0-50 mb1-00 pa1-00">
                                        <span className="red b f4-00">{headlineRestaurantsCount} </span>
                                        restaurants
                                    </div>
                                    <div className="ba br0-50 mb1-00 pa1-00">
                                        <span className="red b f4-00">{headlineMenusCount} </span>
                                        menus
                                    </div>
                                    <div className="ba br0-50 mb1-00 pa1-00">
                                        <span className="gold0 b red f4-00">{displayCount(cuisinesCount)} </span>
                                        cuisines
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-center flex-wrap" style={{ gap: '0.5rem' }}>
                                <Link to="/restaurants" className="ba pa0-50 br0-25 bg-gold0 brown0 b--gold0 no-underline b">
                                    Browse Restaurants
                                </Link>
                                <Link to="/menu" className="ba pa0-50 br0-25 bg-transparent gold0 b--gold0 no-underline b">
                                    Explore Menu
                                </Link>
                            </div>
                        </div>
                        
                        {/* Error message */}
                        {
                            error && (
                                <div className="alert alert-danger alert-dismissible gc1s12" role="alert">
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

                        {/* Popular Cuisines Carousel - now above restaurants */}
                        <div className="gc1s12 ba br0-25 b--gold0 shadow-4 bg-white pa0-50">
                            <div className="mb0-50">
                                <h2 className="f4-00 brown0 mb0-25">Popular Cuisines</h2>
                                <p className="mb1-00 f2-00" 
                                    style={{ color: '#666' }}
                                >
                                    Explore trending tastes across the marketplace.
                                </p>
                            </div>
                            <PopularCuisinesCarousel cuisines={cuisinesWithRatings} />
                        </div>
                        <div
                            className="gc1s12 gc1s8-m ba br0-25 b--gold0 shadow-4 bg-white pa0-75"
                            style={{ alignSelf: 'start' }}
                        >
                            <div className="flex justify-between items-center flex-wrap mb1-00" style={{ gap: '0.5rem' }}>
                                <div>
                                    <h2 className="f1-25 brown0 mb0-25">Featured Restaurants</h2>
                                    <p className="mb0-00" style={{ color: '#666' }}>Browse our partner restaurants and their specialties.</p>
                                </div>
                                <Link to="/restaurants" className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 no-underline b">
                                    View all
                                </Link>
                            </div>
                            <SelectedRestaurants restaurants={restaurants} handleRefresh={handleRefresh} />
                        </div>
                        <div
                            className="gc1s12 gc9s4-m ba br0-25 b--gold0 shadow-4 bg-white pa0-75"
                            style={{ alignSelf: 'start' }}
                        >
                            <MenuCategories categories={menuCategories} />
                        </div>
                    </div>
                
            </div>
        </div>
    );
};

export default HomePage;
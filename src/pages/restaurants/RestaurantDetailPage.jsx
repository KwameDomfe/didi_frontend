
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../../App';
import {
    FaArrowLeft, FaUtensils, FaMapMarkerAlt, FaPhone, FaEnvelope,
    FaGlobe, FaTruck, FaClock, FaDollarSign, FaMoneyBillAlt, FaStar,
    FaList, FaCheckCircle, FaLock, FaPen,
} from 'react-icons/fa';
import { MdStar } from 'react-icons/md';
import { checkIsOpenNow, renderStars } from '../../utils/restaurantUtils';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom brown marker icon (SVG data URL)
const brownMarker = new Icon({
    iconUrl: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='48' viewBox='0 0 32 48'>
        <path fill='%23543a1c' stroke='white' stroke-width='2' d='M16 1C8.268 1 2 7.268 2 15c0 10.493 12.13 30.13 12.64 30.96a2 2 0 0 0 3.72 0C17.87 45.13 30 25.493 30 15c0-7.732-6.268-14-14-14zm0 20a6 6 0 1 1 0-12 6 6 0 0 1 0 12z'/>
        <text x='16' y='22' text-anchor='middle' font-size='12' font-family='Arial' font-weight='bold' fill='%23543a1c' dy='.3em'>•</text>
    </svg>`,
    iconSize: [32, 48],
    iconAnchor: [16, 47],
    popupAnchor: [0, -40],
    className: '',
});

const Inner = () => {
    const { slug } = useParams();
    const { API_BASE_URL, showToast, user, setRestaurants } = useApp();
    const [restaurant, setRestaurant] = useState(null);
    const [cuisineOptions, setCuisineOptions] = useState([]);
    const [cuisinesLoading, setCuisinesLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsError, setReviewsError] = useState(null);
    const [allReviewsLoaded, setAllReviewsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Review form state
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewHover, setReviewHover] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewFormError, setReviewFormError] = useState('');
    // Edit review state
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [editRating, setEditRating] = useState(0);
    const [editHover, setEditHover] = useState(0);
    const [editComment, setEditComment] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        const run = async () => {
            try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/restaurants/${slug}/`);
            if (!mounted) return;
            setRestaurant(res.data);
            // Seed with recent_reviews while the full list loads
            setReviews(res.data?.recent_reviews || []);
            } catch (e) {
            if (!mounted) return;
            setError('Could not load restaurant');
            } finally {
            if (mounted) setLoading(false);
            }
        };
        run();
        return () => { mounted = false; };
    }, [slug, API_BASE_URL]);

    // Load full reviews list from the dedicated endpoint on mount
    useEffect(() => {
    if (!slug || !API_BASE_URL) return;
    let mounted = true;
    setReviewsLoading(true);
    axios.get(`${API_BASE_URL}/restaurants/${slug}/reviews/`)
        .then(res => {
        if (!mounted) return;
        const data = res.data;
        setReviews(Array.isArray(data) ? data : (data?.results || []));
        setAllReviewsLoaded(true);
        })
        .catch(() => {
        if (mounted) setReviewsError('Could not load reviews');
        })
        .finally(() => {
        if (mounted) setReviewsLoading(false);
        });
    return () => { mounted = false; };
    }, [slug, API_BASE_URL]);

    useEffect(() => {
        let mounted = true;

        const loadCuisines = async () => {
            try {
                const allCuisines = [];
                let nextUrl = `${API_BASE_URL}/cuisines/`;

                while (nextUrl) {
                    const response = await axios.get(nextUrl);
                    const payload = response.data;

                    if (Array.isArray(payload)) {
                        allCuisines.push(...payload);
                        nextUrl = null;
                    } else {
                        allCuisines.push(...(payload?.results || []));
                        nextUrl = payload?.next || null;
                    }
                }

                if (mounted) {
                    setCuisineOptions(allCuisines);
                }
            } catch {
                if (mounted) {
                    setCuisineOptions([]);
                }
            } finally {
                if (mounted) setCuisinesLoading(false);
            }
        };

        loadCuisines();

        return () => { mounted = false; };
    }, [API_BASE_URL]);

    if (loading) return 
        <div className="container py-5">
            <div className="text-muted">Loading restaurant…</div>
        </div>;
    if (error) return (
    <div className="container py-5">
        <div className="alert alert-danger">
            {error}
        </div>
        <Link className="btn btn-secondary" to="/restaurants">
            Back to restaurants
        </Link>
    </div>
    );
    if (!restaurant) return (
    <div className="container py-5">
        <div className="text-muted">Restaurant not found</div>
        <Link className="btn btn-secondary" to="/restaurants">Back to restaurants</Link>
    </div>
    );

    const handleCopyLink = async () => {
        const url = window.location.href;
        try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
        } else {
            const el = document.createElement('textarea');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        showToast('Link copied to clipboard', 'success');
        } catch (e) {
        showToast('Unable to copy link', 'error');
        }
    };



    // Sync rating/total_reviews back to the global restaurants list
    const syncGlobalRestaurant = (updatedFields) => {
        setRestaurants(prev => prev.map(r =>
            r.slug === slug ? { ...r, ...updatedFields } : r
        ));
    };

    const loadAllReviews = async () => {
        try {
        setReviewsError(null);
        setReviewsLoading(true);
        const res = await axios.get(`${API_BASE_URL}/restaurants/${slug}/reviews/`);
        const data = res.data;
        setReviews(Array.isArray(data) ? data : (data?.results || []));
        setAllReviewsLoaded(true);
        } catch (e) {
        setReviewsError('Could not load reviews');
        } finally {
        setReviewsLoading(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!reviewRating) { setReviewFormError('Please select a star rating.'); return; }
        setReviewFormError('');
        setReviewSubmitting(true);
        try {
        const token = localStorage.getItem('authToken');
        const res = await axios.post(
            `${API_BASE_URL}/restaurants/${slug}/reviews/`,
            { rating: reviewRating, comment: reviewComment },
            { headers: token ? { Authorization: `Token ${token}` } : {} }
        );
        setReviews(prev => [res.data, ...prev]);
        const updatedRating = res.data.restaurant_rating ?? undefined;
        setRestaurant(prev => ({
            ...prev,
            total_reviews: (prev.total_reviews || 0) + 1,
            rating: updatedRating ?? prev.rating,
            average_rating: updatedRating ?? prev.average_rating,
        }));
        syncGlobalRestaurant({
            total_reviews: (restaurant.total_reviews || 0) + 1,
            ...(updatedRating != null ? { rating: updatedRating, average_rating: updatedRating } : {}),
        });
        setReviewRating(0);
        setReviewComment('');
        setShowReviewForm(false);
        showToast('Review submitted!', 'success');
        } catch (err) {
        const msg = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || 'Could not submit review.';
        if (msg.toLowerCase().includes('already reviewed')) {
            // Reload reviews so userReview is found and UI switches to Edit mode
            setShowReviewForm(false);
            setReviewFormError('');
            try {
            const res = await axios.get(`${API_BASE_URL}/restaurants/${slug}/reviews/`);
            const data = res.data;
            setReviews(Array.isArray(data) ? data : (data?.results || []));
            setAllReviewsLoaded(true);
            } catch (_) {}
        } else {
            setReviewFormError(msg);
        }
        } finally {
        setReviewSubmitting(false);
        }
    };

    const handleStartEditReview = (r) => {
        setEditingReviewId(r.id);
        setEditRating(r.rating);
        setEditComment(r.comment || '');
        setEditHover(0);
    };

    const handleCancelEditReview = () => {
        setEditingReviewId(null);
        setEditRating(0);
        setEditComment('');
        setEditHover(0);
    };

    const handleSaveEditReview = async (e) => {
        e.preventDefault();
        if (!editRating) { showToast('Please select a star rating.', 'error'); return; }
        setEditSubmitting(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await axios.patch(
                `${API_BASE_URL}/reviews/${editingReviewId}/`,
                { rating: editRating, comment: editComment },
                { headers: token ? { Authorization: `Token ${token}` } : {} }
            );
            setReviews(prev => prev.map(r => r.id === editingReviewId ? { ...r, ...res.data } : r));
            // Recalculate average from updated list
            const updatedReviews = reviews.map(r => r.id === editingReviewId ? { ...r, ...res.data } : r);
            const newAvg = updatedReviews.length
                ? updatedReviews.reduce((s, r) => s + Number(r.rating), 0) / updatedReviews.length
                : 0;
            const roundedAvg = Math.round(newAvg * 100) / 100;
            setRestaurant(prev => ({ ...prev, rating: roundedAvg, average_rating: roundedAvg }));
            syncGlobalRestaurant({ rating: roundedAvg, average_rating: roundedAvg });
            handleCancelEditReview();
            showToast('Review updated!', 'success');
        } catch (err) {
            showToast(err?.response?.data?.detail || 'Could not update review.', 'error');
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Delete your review?')) return;
        try {
        const token = localStorage.getItem('authToken');
        await axios.delete(
            `${API_BASE_URL}/reviews/${reviewId}/`,
            { headers: token ? { Authorization: `Token ${token}` } : {} }
        );
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        const newTotal = Math.max(0, (restaurant.total_reviews || 1) - 1);
        const remainingReviews = reviews.filter(r => r.id !== reviewId);
        const newAvg = remainingReviews.length
            ? Math.round(remainingReviews.reduce((s, r) => s + Number(r.rating), 0) / remainingReviews.length * 100) / 100
            : 0;
        setRestaurant(prev => ({
            ...prev,
            total_reviews: newTotal,
            rating: newAvg,
            average_rating: newAvg,
        }));
        syncGlobalRestaurant({ total_reviews: newTotal, rating: newAvg, average_rating: newAvg });
        showToast('Review deleted.', 'success');
        } catch (err) {
        showToast(err?.response?.data?.detail || 'Could not delete review.', 'error');
        }
    };

    const avgRating = restaurant.average_rating ?? restaurant.rating ?? 0;

    const userReview = user ? reviews.find(r => r.user_id === user.id) : null;

    const PRICE_RANGE_LABELS = { '$': 'Budget', '$$': 'Moderate', '$$$': 'Expensive', '$$$$': 'Fine Dining' };
    const priceRangeLabel = PRICE_RANGE_LABELS[restaurant.price_range] || restaurant.price_range || '—';

    const cuisineName = (() => {
        const directName = restaurant?.cuisine?.name;
        if (directName) return directName;

        if (restaurant?.cuisine?.id) {
            const byId = cuisineOptions.find((c) => String(c?.id) === String(restaurant.cuisine.id));
            if (byId?.name) return byId.name;
        }

        if (typeof restaurant?.cuisine === 'number') {
            const byId = cuisineOptions.find((c) => String(c?.id) === String(restaurant.cuisine));
            if (byId?.name) return byId.name;
        }

        if (typeof restaurant?.cuisine === 'string') {
            const value = restaurant.cuisine.trim();
            if (value && !value.startsWith('/')) return value;

            const idMatch = value.match(/\/cuisines\/(\d+)\/?$/i);
            const cuisineId = idMatch?.[1];
            if (cuisineId) {
                const byId = cuisineOptions.find((c) => String(c?.id) === String(cuisineId));
                if (byId?.name) return byId.name;
            }
        }

        if (restaurant?.cuisine_id) {
            const byId = cuisineOptions.find((c) => String(c?.id) === String(restaurant.cuisine_id));
            if (byId?.name) return byId.name;
        }

        if (restaurant?.cuisine_name) return restaurant.cuisine_name;
        if (restaurant?.cuisine_type) return restaurant.cuisine_type;
        if (Array.isArray(restaurant?.cuisines) && restaurant.cuisines.length > 0) {
            return restaurant.cuisines[0]?.name || restaurant.cuisines[0] || null;
        }

        return null;
    })();

    const asideContent = (
        <div className="pa1-00 restaurant-detail-aside-inner">
            <div className="grid ggap2-00 mb2-00">
                <Link to="/restaurants"
                    className="brown0 hover-gold0 pa0-25 ba b--brown0 br0-25"
                    data-testid="restaurant-detail-back-desktop"
                    onClick={() => setSidebarOpen(false)}
                >
                    ← Back
                </Link>
                <button
                    type="button"
                    className="brown0 hover-gold0 pa0-25 ba b--brown0 br0-25"
                    onClick={handleCopyLink}
                    data-testid="restaurant-detail-copy-link-desktop"
                >
                    🔗 Copy Link
                </button>
                <Link className="brown0 hover-gold0 pa0-25 ba b--brown0 br0-25"
                    to={`/restaurants/${restaurant.slug}/menu`}
                    data-testid="restaurant-detail-browse-menu-desktop"
                    onClick={() => setSidebarOpen(false)}
                >
                    🍽️ Browse Menu
                </Link>
            </div>
            <div className="mb-3 text-center">
                {renderStars(avgRating)}
                <div className="small text-muted mt-1">{Number(avgRating).toFixed(1)} · {restaurant.total_reviews || 0} reviews</div>
            </div>
            {/* Is Active */}
            <div className="mb-3 text-center">
                {
                    restaurant.is_active
                    ? <span className="badge bg-success w-100 py-2">✅ Open</span>
                    : <span className="badge bg-secondary w-100 py-2">🔒 Closed</span>
                }
            </div>
            <nav id="page-nav" className="bg-light pv2-00 br0-25">
                <p className="bg-brown0 pa0-50 br0-25 mb1-00 f1-25 gold1 flex items-center justify-center">
                    On this page
                </p>
                <ul className="list-unstyled mb-0">
                    <li className="mb1-00">
                        <a className="text-decoration-none brown0 hover-gold0"
                        href="#restaurant-banner" onClick={() => setSidebarOpen(false)}>Overview
                        </a></li>
                    <li className="mb1-00">
                        <a className="text-decoration-none brown0 hover-gold0"
                        href="#restaurant-contact-location" onClick={() => setSidebarOpen(false)}>Location & Contact
                        </a></li>
                    <li className="mb1-00">
                        <a className="text-decoration-none brown0 hover-gold0"
                        href="#restaurant-menu-categories" onClick={() => setSidebarOpen(false)}>Menu Categories
                        </a></li>
                    <li className="mb1-00">
                        <a className="text-decoration-none brown0 hover-gold0"
                        href="#restaurant-delivery-info" onClick={() => setSidebarOpen(false)}>Delivery Information
                        </a></li>
                    <li className="mb1-00">
                        <a className="text-decoration-none brown0 hover-gold0"
                        href="#restaurant-features" onClick={() => setSidebarOpen(false)}>Features & Amenities
                        </a></li>
                    <li className="mb1-00">
                        <a className="text-decoration-none brown0 hover-gold0"
                        href="#restaurant-hours" onClick={() => setSidebarOpen(false)}>Opening Hours
                        </a></li>
                    <li className="mb-0">
                        <a className="text-decoration-none brown0 hover-gold0"
                            href="#restaurant-reviews" onClick={() => setSidebarOpen(false)}>
                                Reviews
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    );

    return (
        <div className="container container90 restaurant-detail-page" style={{ overflow: 'visible' }}>
            <button
                className="dn-m fixed z-999 w2-50 h2-50 shadow-4 top-5 left-1 br0-25 b--none pointer bg-white"
                aria-label="Open sidebar"
                onClick={() => setSidebarOpen(true)}
            >
                <span aria-hidden="true" className="f1-50">☰</span>
            </button>

            {sidebarOpen && (
                <div
                    style={{
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
                        {asideContent}
                    </aside>
                </div>
            )}

            <div className="flex justify-between align-center mv2-00 bg-brown0 pa1-00 br0-25"
            >
                <Link to="/restaurants" 
                className="ba pa0-50 br0-25 flex items-center" 
                data-testid="restaurant-detail-back"
                >
                  <FaArrowLeft style={{ marginRight: '0.35rem' }} /> Back
                </Link>
                <div>
                    <button type="button" 
                        className="pa0-50" 
                        onClick={handleCopyLink} 
                        data-testid="restaurant-detail-copy-link"
                    >
                        🔗 Copy Link
                    </button>
                </div>
            </div>

            <div className="grid gtc12 ggap1-00 brown0 bg-white" style={{ overflow: 'visible' }}>
                <aside className="dn db-m gc1s12 gc1s3-m restaurant-detail-aside">
                    <div
                        className="sticky top-2 pa1-00"
                        style={{ maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
                    >
                        {asideContent}
                    </div>
                </aside>
                <div className="gc1s12 gc4s6-m">

                    {/* Main Restaurant Info Card */}
                    <figure id="restaurant-banner" 
                        className="w-100 mb2-00"        
                    >
                        <img src={
                                restaurant.image 
                                || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop'
                            } 
                            alt={restaurant.name} 
                            className=""
                        />
                        <figcaption className="brown0"
                        >
                            <div className="mt1-00"
                            >
                                <div className=""
                                >
                                    <h2 className="f1-75 f2-25-s f3-00-l"
                                    >
                                        {restaurant.name}
                                    </h2>
                                    <div className="flex flex-column justify-center ggap1-00 mb1-00"
                                    >
                                        <div className="flex items-center ggap1-00">
                                            <span className="fw-semibold">Cuisine Type:</span>
                                            <span className="b">
                                                {cuisinesLoading && !cuisineName ? '…' : (cuisineName || '—')}
                                            </span>
                                        </div>
                                        <div className="flex items-center ggap1-00">
                                            <span className="">Price Range:</span>
                                            <span className="b">{priceRangeLabel}</span>
                                        </div>
                                        
                                        <div className="flex items-center ggap1-00"
                                        >
                                        {renderStars(avgRating)}
                                        <span className="b"
                                        >
                                            {Number(avgRating).toFixed(1)}
                                            {' '}({restaurant.total_reviews || 0} reviews)
                                        </span>
                                        </div>
                                    </div>
                                    <p className="f1-25 lh-copy"
                                    >
                                        {restaurant.description}
                                    </p>
                                </div>
                                <div className=""
                                >
                                    <div className="mb2-00">
                                        <Link 
                                            className="bg-brown0 pa0-50 br0-50 " 
                                            to={`/restaurants/${restaurant.slug}/menu`} 
                                            data-testid="restaurant-detail-browse-menu"
                                        >
                                            <FaUtensils className="mr0-25" /> Browse Menu
                                        </Link>
                                    </div>
                                    {
                                        checkIsOpenNow(restaurant)
                                        ? (
                                            <span className="badge bg-success w-100 py-3"
                                            >
                                            <FaCheckCircle className="mr0-25 " /> Currently Open to Customers
                                            </span>
                                        ) 
                                        : (
                                            <span className="badge bg-secondary w-100 py-2"
                                            >
                                            <FaLock className="mr0-25 " /> Currently Closed to Customers
                                            </span>
                                        )
                                    }
                                </div>
                            </div>
                        </figcaption>
                    </figure>

                    {/* Restaurant Details Grid */}
                    <div id="restaurant-details" 
                        className=""
                    >
                        {/* Location & Contact */}
                        <div id="restaurant-contact-location" 
                            className="shadow-4 ma0-50"
                        >
                            
                                <header>
                                    <h5 className="flex items-center 
                                        mb2-00 
                                        f1-50 bt bb bw2  bg-gold0 pa0-50"
                                    >
                                        <FaMapMarkerAlt className="mr0-50 gold1"
                                            
                                        /> Location & Contact
                                    </h5>

                                    <div className="mb1-00"
                                    >
                                        <strong className="mb0-50 dib bb">
                                            Address:
                                        </strong>
                                        <p className="mb-0"
                                        >
                                            {restaurant.address}
                                        </p>
                                    </div>
                                </header>
                                

                                {
                                    restaurant.latitude && restaurant.longitude && (
                                        <div className="mb2-00 mh1-00">
                                            <strong className="mb0-50 dib bb">Map:</strong>
                                            <div style={{ height: 220, width: '100%', overflow: 'hidden' }}>
                                                <MapContainer
                                                    center={[restaurant.latitude, restaurant.longitude]}
                                                    zoom={16}
                                                    style={{ height: '100%', width: '100%' }}
                                                    scrollWheelZoom={false}
                                                >
                                                    <TileLayer
                                                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> contributors'
                                                    />
                                                    <Marker position={[restaurant.latitude, restaurant.longitude]} icon={brownMarker}>
                                                        <Popup>
                                                            {restaurant.name}<br />{restaurant.address}
                                                        </Popup>
                                                    </Marker>
                                                </MapContainer>
                                            </div>
                                        </div>
                                    )
                                }

                                <div className="flex justify-between items-start flex-wrap ggap1-00
                                    pa0-50">
                                    {
                                        restaurant.phone_number && (
                                            <div className="mb-3"
                                            >
                                                <strong className="flex items-center">
                                                <FaPhone style={{ marginRight: '0.35rem', color: '#f5a623' }} /> Phone:
                                                </strong>
                                                <p className="mb-0"
                                                >
                                                <a href={`tel:${restaurant.phone_number}`}
                                                    className="brown0 hover-gold0"
                                                >
                                                    {restaurant.phone_number}
                                                </a>
                                                </p>
                                            </div>
                                        )
                                    }
                                    {
                                        restaurant.email && (
                                            <div className="mb-3"
                                            >
                                                <strong className="flex items-center">
                                                <FaEnvelope style={{ marginRight: '0.35rem', color: '#f5a623' }} /> Email:
                                                </strong>
                                                <p className="mb-0 gold0"
                                                >
                                                <a href={`mailto:${restaurant.email}`}
                                                className="brown0 hover-gold0"
                                                >
                                                    {restaurant.email}
                                                </a>
                                                </p>
                                            </div>
                                        )
                                    }
                                    {
                                        restaurant.website && (
                                            <div className="mb-3">
                                                <strong className="flex items-center">
                                                <FaGlobe style={{ marginRight: '0.35rem', color: '#f5a623' }} /> Website:
                                                </strong>
                                                <p className="mb-0"
                                                >
                                                <a href={restaurant.website} 
                                                    className="brown0 hover-gold0"
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                >
                                                    {restaurant.website}
                                                </a>
                                                </p>
                                            </div>
                                        )
                                    }
                                </div>
                            
                            
                        </div>
                           
                        {/* Menu Categories Preview */}
                        {
                            restaurant.categories 
                            && restaurant.categories.length > 0 
                            && (
                            <div id="restaurant-menu-categories"
                                className="shadow-4 ma0-50"
                                
                            >
                                <header className="flex justify-content-between align-items-center 
                                    w-100 mb2-00 bt bb bw2 bg-gold0 pa0-50 "
                                >
                                    <h3 className="f1-50">
                                    <FaList className="mr0-50" /> Menu Categories
                                    </h3>
                                </header>
                            
                                <div className="grid gtc2 gtc3-l pa0-50 ggap0-50"
                                >
                                    {
                                        restaurant.categories.map(
                                            category => (
                                            <Link
                                                key={category.id}
                                                to={category.slug ? `/categories/${category.slug}` : `/restaurants/${restaurant.slug}/menu`}
                                                className="ba br0-50 overflow-hidden bg-brown0 white no-underline"
                                                style={{ display: 'block', textDecoration: 'none' }}
                                            >
                                                {category.image && (
                                                    <img
                                                        src={category.image}
                                                        alt={category.name}
                                                        className="w-100"
                                                        style={{ height: 110, objectFit: 'cover', display: 'block' }}
                                                    />
                                                )}
                                                <div className="pa0-50"
                                                >
                                                    <h6 className="mb0-50"
                                                    >
                                                        {category.name}
                                                    </h6>
                                                    {
                                                        category.description && (
                                                        <p className="gold0"
                                                        >
                                                            {category.description}
                                                        </p>
                                                        )
                                                    }
                                                    <small className="white">
                                                        {category.items_count || 0} items
                                                    </small>
                                                </div>
                                            </Link>
                                            )
                                        )
                                    }
                                </div>
                                <footer className="flex items-center justify-end">
                                    <Link to={`/restaurants/${restaurant.slug}/menu`} 
                                    className="brown0 tc pa0-50 ma0-50 bg-gold1 br0-25 ba b"
                                    >
                                    View Full Menu →
                                </Link>
                                </footer>
                                
                            </div>
                            )
                        }
                        {/* Delivery & Order Info */}
                        <div id="restaurant-delivery-info" className="mv2-00"
                        >
                            <div className="card shadow-sm h-100">
                                <h3 className="mb2-00 flex items-center 
                                    f1-50 ba bg-gold0 pa0-50 br0-25"
                                    >
                                    <FaTruck  className="mr0-50"
                                    /> Delivery Information
                                </h3>
                            
                                <div className="flex flex-column flex-row-s justify-between 
                                    ggap1-00 pa1-00"
                                >
                                
                                    <div className="br0-25 pa1-00 bg-black-80"
                                    >
                                        <strong className="f0-75 white">
                                        Delivery Time:
                                        </strong>
                                        <p className="mv1-00 f1-25 bg-yellow0 gold0 br0-25 flex items-center"
                                        ><FaClock style={{ marginRight: '0.35rem' }} /> {
                                                restaurant.delivery_time != null && restaurant.delivery_time !== '' 
                                                ? restaurant.delivery_time 
                                                : '30 - 45 min'
                                            }
                                        </p>
                                    </div>
                                    <div className="br0-25 pa1-00 bg-black-80"
                                    >
                                        <strong className="f0-75 white">
                                        Delivery Fee:
                                        </strong>
                                        <p className="mv1-00 f1-25 bg-yellow0 gold0 br0-25 flex items-center"
                                        >
                                        <FaDollarSign style={{ marginRight: '0.35rem' }} /> GHC {
                                            restaurant.delivery_fee != null
                                            ? restaurant.delivery_fee
                                            : '2.99'
                                        }
                                        </p>
                                    </div>
                                    <div className="br0-25 pa1-00 bg-black-80"
                                    >
                                        <strong className="f0-75 white">
                                        Minimum Order:
                                        </strong>
                                        <p className="mv1-00 f1-25 bg-yellow0 gold0 br0-25 flex items-center"
                                        >
                                        <FaMoneyBillAlt style={{ marginRight: '0.35rem' }} /> GHC {
                                            restaurant.min_order != null
                                            ? restaurant.min_order
                                            : '0.00'
                                        }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    

                    {/* Features & Amenities */}
                    {   restaurant.features 
                        && restaurant.features.length > 0 
                        && (
                        <div id="restaurant-features" 
                            className="mb2-00"
                        >
                            <div className="card-body"
                            >
                                <h3 className="mb2-00 flex items-center ba bg-gold0 pa0-50 br0-25 f1-50"
                                >
                                    <FaStar style={{ marginRight: '0.4rem', color: '#f5a623' }} /> Features & Amenities
                                </h3>
                                <div className="flex justify-center items-center ggap1-00 br0-50"
                                >
                                    {
                                    restaurant.features.map(
                                        (feature, idx) => (
                                        <span key={idx} className="flex items-center justify-center ba pa0-50 br0-50 bg-brown0 white h4-00"
                                        >
                                            {
                                            feature
                                            .replace(/_/g, ' ')
                                            .replace(/\b\w/g, l => l
                                            .toUpperCase())
                                            }
                                        </span>
                                        )
                                    )
                                    }
                                </div>
                            </div>
                        </div>
                        )
                    }

                    {/* Opening Hours */}
                    {
                        restaurant.opening_hours 
                        && Object.keys(restaurant.opening_hours).length > 0 
                        && (
                        <div className="mb2-00"
                            id="restaurant-hours"
                        >
                            <div className="card-body"
                            >
                            <h3 className="mb2-00 flex items-center ba bg-gold0 pa0-50 br0-25 f1-50"
                            >
                                <FaClock style={{ marginRight: '0.4rem', color: '#f5a623' }} /> Opening Hours
                            </h3>
                            <div className="row"
                            >
                                {
                                ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(
                                    day => {
                                    const dayName = { 
                                        mon: 'Monday', 
                                        tue: 'Tuesday', 
                                        wed: 'Wednesday', 
                                        thu: 'Thursday', 
                                        fri: 'Friday', 
                                        sat: 'Saturday', 
                                        sun: 'Sunday' 
                                    }[day];
                                    const hours = restaurant.opening_hours[day];
                                    if (!hours) return null;
                                    return (
                                        <div key={day} className="col-md-6 mb-2"
                                        >
                                            <div className="flex justify-between pa1-00 mb1-00 ba br0-25"
                                            >
                                                <strong >
                                                {dayName}:
                                                </strong>
                                                <span>
                                                {
                                                    hours.closed 
                                                    ? (
                                                        <span className="text-danger">Closed</span>
                                                    ) 
                                                    : hours.open 
                                                    && hours.close 
                                                    ? (
                                                        `${hours.open} - ${hours.close}`
                                                    ) 
                                                    : (
                                                        <span className="text-muted">Hours not set</span>
                                                    )
                                                }
                                                </span>
                                            </div>
                                        </div>
                                    );
                                    }
                                )
                                }
                            </div>
                            </div>
                        </div>
                        )
                    }

                    {/* Reviews Section */}
                    <div id="restaurant-reviews" className="">
                        <div className="mb2-00">
                            {/* Header row */}
                            <div className="flex justify-between items-center mb1-00 flex-wrap" style={{ gap: '0.5rem' }}>
                                <h3 className="flex items-center w-100 ba bg-gold0 pa0-50 br0-25 f1-50">
                                    <FaStar className="mr0-50 gold1"/> Customer Reviews
                                </h3>
                                <div className="flex items-center" style={{ gap: '0.75rem' }}>
                                    <span className="flex items-center" style={{ gap: '0.25rem' }}>
                                        {renderStars(avgRating)}
                                        <span className="text-muted" style={{ fontSize: '0.88rem' }}>
                                            {Number(avgRating).toFixed(1)} · {reviews.length || restaurant.total_reviews || 0} reviews
                                        </span>
                                    </span>
                                    {user && !userReview && (
                                        <button
                                            type="button"
                                            className="flex items-center pa0-50 ba br0-25 b--gold0 bg-brown0 gold0 pointer"
                                            style={{ fontSize: '0.82rem', gap: '0.3rem', opacity: reviewsLoading ? 0.5 : 1 }}
                                            onClick={() => { if (!reviewsLoading) { setShowReviewForm(v => !v); setReviewFormError(''); } }}
                                            disabled={reviewsLoading}
                                            title={reviewsLoading ? 'Loading reviews…' : ''}
                                        >
                                            <FaPen style={{ fontSize: '0.72rem' }} />
                                            {showReviewForm ? 'Cancel' : 'Write a Review'}
                                        </button>
                                    )}
                                    {user && userReview && editingReviewId !== userReview.id && (
                                        <button
                                            type="button"
                                            className="flex items-center pa0-50 ba br0-25 b--gold0 bg-brown0 gold0 pointer"
                                            style={{ fontSize: '0.82rem', gap: '0.3rem' }}
                                            onClick={() => handleStartEditReview(userReview)}
                                        >
                                            <FaPen style={{ fontSize: '0.72rem' }} />
                                            Edit your review
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Rating distribution bar */}
                            {reviews.length > 0 && (() => {
                                const counts = [5,4,3,2,1].map(star => ({
                                    star,
                                    count: reviews.filter(r => Math.round(r.rating) === star).length,
                                }));
                                return (
                                    <div className="mb1-00" style={{ maxWidth: 320 }}>
                                        {counts.map(({ star, count }) => (
                                            <div key={star} className="flex items-center mb0-25" style={{ gap: '0.5rem', fontSize: '0.78rem' }}>
                                                <span style={{ width: '1.2rem', textAlign: 'right', flexShrink: 0 }}>{star}</span>
                                                <MdStar style={{ color: '#f5a623', flexShrink: 0 }} />
                                                <div style={{ flex: 1, background: '#e9e9e9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                                    <div style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`, background: '#f5a623', height: '100%', borderRadius: 4, transition: 'width 0.4s' }} />
                                                </div>
                                                <span style={{ width: '1.5rem', color: '#777', flexShrink: 0 }}>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {/* Review submission form */}
                            {showReviewForm && user && !userReview && (
                                <form onSubmit={handleSubmitReview} 
                                    className="ba br0-25 pa1-00 mb1-00 bg-brown0 gold0" 
                                    style={{ maxWidth: 480 }}
                                >
                                    <div className="mb0-75">
                                        <div className="f1-00 b mb0-25">Your Rating</div>
                                        <div className="flex" style={{ gap: '0.25rem' }}>
                                            {[1,2,3,4,5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setReviewRating(star)}
                                                    onMouseEnter={() => setReviewHover(star)}
                                                    onMouseLeave={() => setReviewHover(0)}
                                                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '1.6rem', color: star <= (reviewHover || reviewRating) ? '#f5a623' : '#ccc' }}
                                                    aria-label={`${star} star`}
                                                >
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb0-75">
                                        <label className="f1-00 b mb0-25 db">
                                            Comment 
                                            <span style={{ fontWeight: 400, fontSize: '0.8rem' }}
                                            >
                                                (optional)
                                            </span>
                                        </label>
                                        <textarea
                                            className="w-100 br0-25 pa0-50"
                                            rows={3}
                                            value={reviewComment}
                                            onChange={e => setReviewComment(e.target.value)}
                                            placeholder="Share your experience…"
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>
                                    {reviewFormError && (
                                        <div className="mb0-75" 
                                            style={
                                                { 
                                                    color: '#c0392b', 
                                                    fontSize: '0.88rem', 
                                                    background: '#fdecea', 
                                                    border: '1px solid #f5c6cb', 
                                                    borderRadius: 4, 
                                                    padding: '0.4rem 0.6rem' 
                                                }
                                            }
                                        >
                                            {reviewFormError}
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        className="pa0-50 br0-25 ba b--gold0 bg-gold0 brown0 b pointer"
                                        disabled={reviewSubmitting || !reviewRating}
                                    >
                                        {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                                    </button>
                                </form>
                            )}

                            {reviewsError && <div className="alert alert-danger py-2">{reviewsError}</div>}
                            {reviewsLoading && <div className="text-muted">Loading reviews…</div>}
                            {!reviewsLoading && reviews.length === 0 && (
                                <div className="text-muted">No reviews yet. Be the first to review!</div>
                            )}

                            <div className="list-group">
                                {reviews.map((r) => (
                                    <div key={r.id} className="list-group-item"
                                    >
                                        <div className="flex justify-between items-center flex-wrap" style={{ gap: '0.25rem' }}>
                                            <div className="fw-semibold">{r.user_name || r.user || 'Anonymous'}</div>
                                            <div className="flex items-center" style={{ gap: '0.35rem' }}>
                                                {editingReviewId !== r.id && renderStars(r.rating)}
                                                {editingReviewId !== r.id && (
                                                    <span style={{ fontSize: '0.78rem', color: '#888' }}>{Number(r.rating).toFixed(1)}</span>
                                                )}
                                                {user && (r.user_id === user.id) && editingReviewId !== r.id && (
                                                    <div className="flex" style={{ gap: '0.4rem', marginLeft: '0.5rem' }}>
                                                        <button
                                                            className="flex items-center pa0-50 ba br0-25 b--gold0 bg-brown0 gold0 pointer"
                                                            style={{ fontSize: '0.75rem', gap: '0.25rem' }}
                                                            onClick={() => handleStartEditReview(r)}
                                                        >
                                                            <FaPen style={{ fontSize: '0.65rem' }} /> Edit
                                                        </button>
                                                        <button
                                                            className="flex items-center pa0-50 ba br0-25 pointer"
                                                            style={{ fontSize: '0.75rem', gap: '0.25rem', borderColor: '#c0392b', color: '#c0392b', background: 'transparent' }}
                                                            onClick={() => handleDeleteReview(r.id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {editingReviewId === r.id ? (
                                            <form onSubmit={handleSaveEditReview} className="mt-2">
                                                <div className="flex mb-2" style={{ gap: '0.2rem' }}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <span
                                                            key={star}
                                                            onClick={() => setEditRating(star)}
                                                            onMouseEnter={() => setEditHover(star)}
                                                            onMouseLeave={() => setEditHover(0)}
                                                            style={{ cursor: 'pointer', fontSize: '1.4rem', color: star <= (editHover || editRating) ? '#f59e0b' : '#ccc' }}
                                                        >★</span>
                                                    ))}
                                                </div>
                                                <textarea
                                                    className="form-control mb-2"
                                                    rows={3}
                                                    value={editComment}
                                                    onChange={e => setEditComment(e.target.value)}
                                                    placeholder="Update your review…"
                                                />
                                                <div className="flex" style={{ gap: '0.5rem' }}>
                                                    <button
                                                        className="pa0-50 br0-25 ba b--gold0 bg-gold0 brown0 b pointer"
                                                        type="submit"
                                                        disabled={editSubmitting}
                                                        style={{ fontSize: '0.85rem' }}
                                                    >
                                                        {editSubmitting ? 'Saving…' : 'Save'}
                                                    </button>
                                                    <button
                                                        className="pa0-50 br0-25 ba pointer"
                                                        style={{ fontSize: '0.85rem', borderColor: '#888', color: '#888', background: 'transparent' }}
                                                        type="button"
                                                        onClick={handleCancelEditReview}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <>
                                                {r.comment && <p className="mb-2 mt-2">{r.comment}</p>}
                                                {Array.isArray(r.images) && r.images.length > 0 && (
                                                    <div className="flex flex-wrap" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                        {r.images.map((url, idx) => (
                                                            <a href={url} key={idx} target="_blank" rel="noreferrer">
                                                                <img src={url} alt="review" style={{ maxHeight: 90, borderRadius: 6 }} />
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="text-muted small mt-2">
                                                    {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    {r.updated_at && r.updated_at !== r.created_at && (
                                                        <span style={{ marginLeft: '0.5rem' }}>(edited)</span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {!allReviewsLoaded && (restaurant.total_reviews || 0) > reviews.length && (
                                <button className="btn btn-outline-primary mt-3" onClick={loadAllReviews} disabled={reviewsLoading}>
                                    {reviewsLoading ? 'Loading…' : `Load all ${restaurant.total_reviews} reviews`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
};

export default function RestaurantDetailPage() {
    return <Inner />;
}

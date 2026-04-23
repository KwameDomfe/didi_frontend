import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../App';
import MenuItemCard from './menus/MenuItemCard';
import { MenuItemSkeleton } from '../components/SkeletonLoader';

const CategoryDetailPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { API_BASE_URL, showToast } = useApp();
    
    const [category, setCategory] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadCategoryAndItems = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
        // Load all category pages so direct slug links always resolve.
        const categories = [];
        let nextUrl = `${API_BASE_URL}/categories/`;

        while (nextUrl) {
            const categoriesResponse = await axios.get(nextUrl);
            const payload = categoriesResponse.data;

            if (Array.isArray(payload)) {
            categories.push(...payload);
            nextUrl = null;
            } else {
            categories.push(...(payload?.results || []));
            nextUrl = payload?.next || null;
            }
        }
        
        // Find category by slug
        const normalizedSlug = String(slug || '').trim().toLowerCase();
        const foundCategory = categories.find(cat => 
            String(cat?.slug || '').trim().toLowerCase() === normalizedSlug || 
            String(cat?.name || '').toLowerCase().replace(/\s+/g, '-') === normalizedSlug
        );

        if (!foundCategory) {
            setError('Category not found');
            setLoading(false);
            return;
        }

        setCategory(foundCategory);

        // Load menu items for this category using category ID
        const menuItemsResponse = await axios.get(`${API_BASE_URL}/menu-items/?category=${foundCategory.id}`);
        const items = menuItemsResponse.data.results || menuItemsResponse.data;
        setMenuItems(items);
        } catch (err) {
        console.error('Error loading category:', err);
        setError('Failed to load category. Please try again.');
        showToast('Failed to load category', 'error');
        } finally {
        setLoading(false);
        }
    }, [API_BASE_URL, showToast, slug]);

    useEffect(() => {
        loadCategoryAndItems();
    }, [loadCategoryAndItems]);

    if (loading) {
        return (
        <div className="container my-5">
            <div className="row">
            <div className="col-12 mb-4">
                <div className="placeholder-glow">
                <span className="placeholder col-6 placeholder-lg"></span>
                </div>
            </div>
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="col-md-6 col-lg-4 mb-4">
                <MenuItemSkeleton />
                </div>
            ))}
            </div>
        </div>
        );
    }

    if (error) {
        return (
        <div className="container my-5">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
            <div>
                <strong>Error!</strong> {error}
            </div>
            </div>
            <Link to="/" className="btn btn-primary">
            ← Back to Home
            </Link>
        </div>
        );
    }

    if (!category) {
        return (
        <div className="container my-5">
            <div className="text-center">
            <h2>Category Not Found</h2>
            <p className="text-muted">The category you're looking for doesn't exist.</p>
            <Link to="/" className="btn btn-primary">
                ← Back to Home
            </Link>
            </div>
        </div>
        );
    }

    return (
        <div className="container90 my-5">
            <div className="shadow-4 mb2-00">
                <header className="bt bb bw2 bg-gold0 pa0-75">
                    <nav aria-label="breadcrumb" className="mb0-50">
                        <ol className="breadcrumb mb0-00">
                            <li className="breadcrumb-item">
                                <Link to="/">Home</Link>
                            </li>
                            <li className="breadcrumb-item">
                                <Link to="/categories">Categories</Link>
                            </li>
                            <li className="breadcrumb-item active" aria-current="page">
                                {category.name}
                            </li>
                        </ol>
                    </nav>
                    <div className="flex justify-between items-start flex-wrap" style={{ gap: '0.75rem' }}>
                        <div>
                            <h1 className="f2-00 mb0-25 brown0 b">{category.name}</h1>
                            {category.description && (
                                <p className="mb0-50 brown0" style={{ opacity: 0.85 }}>{category.description}</p>
                            )}
                        </div>
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => navigate(-1)}
                        >
                            ← Back
                        </button>
                    </div>
                </header>
            </div>

            <div className="grid gtc12 relative ggap1-00 brown0 bg-white pa1-00 br0-25">
                <aside className="gc1s12 gc1s3-m">
                    <div className="sticky top-2" style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}>
                        <div className="mb1-00 bg-brown0 br0-25 pa1-00">
                            <h2 className="f1-25 gold0 mb1-00 bb pb0-50">Category Info</h2>
                            <div className="grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <div className="f1-50 fw7 gold0">{menuItems.length}</div>
                                    <div className="f0-75 white" style={{ opacity: 0.8 }}>Items</div>
                                </div>
                                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <div className="f0-90 fw7 gold0 text-uppercase">
                                        {category.meal_period ? category.meal_period.replace(/_/g, ' ') : 'Any'}
                                    </div>
                                    <div className="f0-75 white" style={{ opacity: 0.8 }}>Meal Time</div>
                                </div>
                            </div>
                        </div>

                        <div className="ba b--black-10 br0-25 pa0-75 bg-near-white">
                            <p className="mb0-50 b">Quick Actions</p>
                            <div className="d-grid gap-2">
                                <Link to="/categories" className="btn btn-outline-secondary btn-sm">
                                    Browse Categories
                                </Link>
                                <Link to="/menu" className="btn btn-outline-primary btn-sm">
                                    Browse All Menu Items
                                </Link>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="gc1s12 gc4s9-m min-w-0">
                    {menuItems.length > 0 ? (
                        <div className="row">
                            {menuItems.map(item => (
                                <div key={item.id} className="col-md-6 col-xl-4 mb-4">
                                    <MenuItemCard item={item} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-5 ba b--black-10 br0-25 bg-near-white">
                            <div className="text-muted mb-3" style={{ fontSize: '3rem' }}>
                                🍽️
                            </div>
                            <h3>No items in this category yet</h3>
                            <p className="text-muted">Check back later for delicious additions!</p>
                            <Link to="/menu" className="btn btn-primary mt-2">
                                Browse All Menu Items
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryDetailPage;

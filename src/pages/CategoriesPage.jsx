import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useApp } from '../App';

export default function CategoriesPage() {
  const { API_BASE_URL, showToast } = useApp();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mealPeriodFilter, setMealPeriodFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const fetchAllPages = useCallback(async (initialUrl) => {
    const rows = [];
    let nextUrl = initialUrl;

    while (nextUrl) {
      const response = await axios.get(nextUrl);
      const payload = response.data;

      if (Array.isArray(payload)) {
        rows.push(...payload);
        nextUrl = null;
      } else {
        rows.push(...(payload?.results || []));
        nextUrl = payload?.next || null;
      }
    }

    return rows;
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadCategories = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await fetchAllPages(`${API_BASE_URL}/categories/`);
        if (!mounted) {
          return;
        }

        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
        if (!mounted) {
          return;
        }

        setCategories([]);
        setError('Failed to load categories. Please try again.');
        showToast('Failed to load categories', 'error');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      mounted = false;
    };
  }, [API_BASE_URL, fetchAllPages, showToast]);

  const filteredCategories = useMemo(() => {
    const filtered = [...categories].filter((category) => {
      const categoryName = String(category?.name || '');
      const categoryDescription = String(category?.description || '');
      const categoryMealPeriod = String(category?.meal_period || '').toLowerCase();

      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const haystack = `${categoryName} ${categoryDescription}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (mealPeriodFilter && categoryMealPeriod !== mealPeriodFilter) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'meal_period') {
        return String(a?.meal_period || '').localeCompare(String(b?.meal_period || ''));
      }

      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });

    return filtered;
  }, [categories, mealPeriodFilter, searchTerm, sortBy]);

  const mealPeriodOptions = useMemo(() => {
    const values = new Set();
    categories.forEach((category) => {
      if (category?.meal_period) {
        values.add(String(category.meal_period).toLowerCase());
      }
    });
    return Array.from(values).sort();
  }, [categories]);

  const groupedCategories = useMemo(() => {
    const groups = filteredCategories.reduce((acc, category) => {
      const mealPeriodKey = String(category?.meal_period || 'uncategorized').toLowerCase();

      if (!acc[mealPeriodKey]) {
        acc[mealPeriodKey] = [];
      }

      acc[mealPeriodKey].push(category);
      return acc;
    }, {});

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mealPeriod, rows]) => ({
        mealPeriod,
        rows,
      }));
  }, [filteredCategories]);

  const formatMealPeriod = (value) => {
    const cleaned = String(value || '').replace(/_/g, ' ').trim();
    if (!cleaned || cleaned === 'uncategorized') {
      return 'Uncategorized';
    }

    return cleaned
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading... bla bla bla</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger">{error}</div>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container90 my-5">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="mb-1">Categories</h1>
          <p className="text-muted mb-0">Browse menu categories across restaurants</p>
        </div>
        <Link to="/menu" className="brown0">Browse All Menu Items</Link>
      </div>

      <div className="grid gtc12 relative ggap1-00 
        brown0 bg-white br0-25">
        <aside className="gc1s12 gc1s3-m">
          <div className="sticky top-2" style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}>
            <div className="mb1-00 bg-brown0 br0-25 pa1-00">
              <h2 className="f1-25 gold0 mb1-00 bb pb0-50">Category Directory</h2>
              <div className="grid ggap0-50" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-50 fw7 gold0">{categories.length}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Total</div>
                </div>
                <div className="tc pa0-75 br0-25" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="f1-50 fw7 gold0">{filteredCategories.length}</div>
                  <div className="f0-75 white" style={{ opacity: 0.8 }}>Showing</div>
                </div>
              </div>
            </div>

            <div className="mb1-00">
              <p className="bg-brown0 pa0-50 br0-25 mb1-00 f1-25 gold0 flex items-center justify-center">Filters</p>
              <div className="mb1-00">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="mb1-00">
                <select
                  className="form-select"
                  value={mealPeriodFilter}
                  onChange={(event) => setMealPeriodFilter(event.target.value)}
                >
                  <option value="">All Meal Times</option>
                  {mealPeriodOptions.map((mealPeriod) => (
                    <option key={mealPeriod} value={mealPeriod}>
                      {mealPeriod.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb1-00">
                <select
                  className="form-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="name">Sort by Name</option>
                  <option value="meal_period">Sort by Meal Time</option>
                </select>
              </div>
              {(searchTerm || mealPeriodFilter || sortBy !== 'name') && (
                <button
                  type="button"
                  className="w-100 pa0-50 br0-25 pointer ba bg-transparent"
                  onClick={() => {
                    setSearchTerm('');
                    setMealPeriodFilter('');
                    setSortBy('name');
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="gc1s12 gc4s9-m min-w-0">
          {filteredCategories.length === 0 ? (
            <div className="alert alert-info">No categories available for this filter.</div>
          ) : (
            <div className="flex flex-column" style={{ gap: '1.5rem' }}>
              {groupedCategories.map((group) => (
                <section key={group.mealPeriod}>
                  <div className="bg-gold0 pa0-50 br0-25 mb1-00 flex items-center justify-between">
                    <h3 className="mb0-00 f1-25 brown0">{formatMealPeriod(group.mealPeriod)}</h3>
                    <span className="pa0-25 br0-25 f0-75 brown0" style={{ background: 'rgba(117,18,1,0.12)' }}>
                      {group.rows.length}
                    </span>
                  </div>

                  <div className="grid gtc12 gtc6-m gtc4-l ggap1-00">
                    {group.rows.map((category) => {
                      const categorySlug = category?.slug || String(category?.name || '').toLowerCase().replace(/\s+/g, '-');

                      return (
                        <div key={category.id || categorySlug} className="col-md-6 col-xl-4 mb-4">
                          <div className="card h-100 shadow-sm">
                            {category.image && (
                              <Link to={`/categories/${categorySlug}`} aria-label={`Open ${category.name || 'category'} details`}>
                                <img
                                  src={category.image}
                                  alt={category.name || 'Category'}
                                  className="card-img-top"
                                  style={{ height: '180px', objectFit: 'cover' }}
                                />
                              </Link>
                            )}
                            <div className="card-body d-flex flex-column">
                              <h5 className="card-title mb-2">
                                <Link
                                  to={`/categories/${categorySlug}`}
                                  className="text-decoration-none brown0"
                                >
                                  {category.name || 'Unnamed Category'}
                                </Link>
                              </h5>
                              {category.meal_period && (
                                <span className="badge bg-light text-dark mb-2 text-uppercase align-self-start">
                                  {String(category.meal_period).replace(/_/g, ' ')}
                                </span>
                              )}
                              <p className="text-muted small mb-3 flex-grow-1">
                                {category.description || 'No description yet.'}
                              </p>
                              <Link to={`/categories/${categorySlug}`} className="btn btn-primary btn-sm align-self-start">
                                View Category
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

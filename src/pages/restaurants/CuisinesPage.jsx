import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useApp } from '../../App';

const CuisinesPage = () => {
  const { API_BASE_URL } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popularCuisines, setPopularCuisines] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadCuisines = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`${API_BASE_URL}/restaurants/popular-cuisines/`);
        const payload = response.data;
        const list = Array.isArray(payload) ? payload : (payload?.results || []);
        if (mounted) {
          setPopularCuisines(list);
        }
      } catch (requestError) {
        if (mounted) {
          setError('Failed to load cuisines. Please try again.');
          setPopularCuisines([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCuisines();

    return () => {
      mounted = false;
    };
  }, [API_BASE_URL]);

  const cuisines = useMemo(() => {
    const normalizedMap = new Map();

    popularCuisines.forEach((cuisine) => {
      const key = String(cuisine?.slug || cuisine?.name || cuisine || '').trim().toLowerCase();
      if (!key) {
        return;
      }
      if (!normalizedMap.has(key)) {
        normalizedMap.set(key, cuisine);
      }
    });

    return Array.from(normalizedMap.values())
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [popularCuisines]);

  if (loading) {
    return (
      <div className="container container90 mt-4">
        <div className="mb-3">
          <div className="skeleton-page-title mb-2" style={{ height: '36px', width: '260px' }}></div>
          <div className="skeleton-text" style={{ width: '60%' }}></div>
        </div>
        <div className="grid gtc1 gtc2-m gtc4-l ggap1-00">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="ba">
              <div className="">
                <div className="skeleton-text mb-2" style={{ width: '50%' }}></div>
                <div className="skeleton-text" style={{ width: '35%' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container container90 mt-4">
      <div className="mb-4">
        <h1>Popular Cuisines</h1>
        <p className="lead text-muted mb-2">Browse every cuisine behind the analytics total and jump to matching restaurants.</p>
        <div className="text-muted small">
          {cuisines.length} {cuisines.length === 1 ? 'cuisine' : 'cuisines'}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {cuisines.length === 0 && !error ? (
        <div className="alert alert-light border" role="status">
          No cuisines available right now.
        </div>
      ) : (
        <div className="grid gtc1 gtc2-m gtc4-l ggap1-00">
          {cuisines.map((cuisine) => (
            <Link
              key={String(cuisine?.slug || cuisine?.name)}
              to={`/restaurants?cuisine=${encodeURIComponent(cuisine?.name || '')}`}
              className="ba red  br0-25 pa1-00 d-flex flex-column justify-content-between"
            >
              <div className="fw-bold mb0-25">{cuisine?.name || 'Cuisine'}</div>
              <div className="small gray">
                {Number(cuisine?.restaurant_count || 0)} restaurants
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CuisinesPage;

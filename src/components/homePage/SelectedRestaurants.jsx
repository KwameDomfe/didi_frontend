import RestaurantCard from '../RestaurantCard';
import { Link } from 'react-router-dom';

const SelectedRestaurants = ({ restaurants = [], handleRefresh }) => {
    return (
        <>
            {restaurants.length > 0 ? (
                    <div className="w-100">
                        {
                            restaurants.map(restaurant => (
                            <RestaurantCard key={restaurant.id} restaurant={restaurant} showMenu={true} onUpdate={handleRefresh} />
                        )
                        )
                        }
                    </div>
                ) : (
                    <div className="empty-state" role="status" aria-live="polite"
                    >
                        <span className="empty-icon" aria-hidden="true">🔎</span>
                        <h3 className="text-muted">No restaurants found</h3>
                        <p className="mb-3">Please try refreshing, or check back later.</p>
                        <div className="empty-actions"
                        >
                            <button className="btn btn-primary" onClick={handleRefresh}>🔄 Try Again</button>
                            <Link to="/" className="btn btn-outline-secondary">🏠 Go Home</Link>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default SelectedRestaurants
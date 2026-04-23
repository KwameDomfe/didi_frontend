import { Link } from "react-router-dom";

const Cuisines = ({ popularCuisines = [] }) => {
	return (
        <div className=""
        >
            <h2 className="f1-50">
                🍽️ Popular Cuisines
            </h2>
            <p className="text-muted"
            >
                Explore our most popular cuisines and find your next favorite meal.
            </p>
            <div className=""
            >
                {
                    popularCuisines && popularCuisines.length > 0 ? (
                        popularCuisines.map((cuisine) => (
                            <div className="" key={cuisine.name}
                            >
                                <Link to={`/restaurants?cuisine=${encodeURIComponent(cuisine.name)}`} 
                                    style={
                                        { textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div className="card h-100 shadow-sm text-center mb0-50"
                                    >
                                        <div className="card-body"
                                        >
                                            <span style={{fontSize:'2rem'}} role="img" aria-label={cuisine.name}>
                                            {cuisine.emoji}
                                            </span>
                                            <h6 className="mt-2 mb-0"
                                            >
                                                {cuisine.name}
                                            </h6>
                                            <div className="text-muted">
                                                {cuisine.restaurant_count} restaurants
                                            </div>
                                            {cuisine.avg_rating > 0 && (
                                                <div className="text-warning">
                                                    ⭐ {cuisine.avg_rating}
                                                </div>
                                                )
                                            }
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        )
                    )
                ) : (
                <div className="text-muted">No popular cuisines found.</div>
                )
                }
            </div>
        </div>
    );
};

export default Cuisines
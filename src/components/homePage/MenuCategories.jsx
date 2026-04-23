
import React from 'react';
import { Link } from 'react-router-dom';

const MEAL_PERIOD_LABELS = {
    breakfast: '☀️ Breakfast',
    brunch: '🍳 Brunch',
    lunch: '🍔 Lunch',
    supper: '🌙 Supper',
    dinner: '🍽️ Dinner',
    all_day: '🕑 All Day',
};

const MenuCategories = ({ categories = [] }) => {
    // Group categories by meal period
    const grouped = React.useMemo(
        () => {
            const result = {};
            categories.forEach(
                cat => {
                    const period = cat.meal_period || 'all_day';
                    if (!result[period]) result[period] = [];
                    result[period].push(cat);
                }
            );
            return result;
        }, [categories]
    );

    return (
        <div className="">
            <div className="mb1-00">
                <div>
                    <h2 className="mb1-00 f1-50">🍴 Menu Categories</h2>
                    <p className="text-muted mb1-00"
                    >
                        Browse our menu categories by meal period
                    </p>
                </div>
                <Link to="/menu" className="brown0 b no-underline"
                >
                    View Full Menu →
                </Link>
            </div>
        
            {Object.keys(MEAL_PERIOD_LABELS).map(period => (
                grouped[period] && grouped[period].length > 0 && (
                <div key={period} className="mb2-00 ba flex flex-column br0-25 bg-white" style={{ borderColor: 'rgba(92,61,46,0.15)' }}>
                    <h4 className="mb1-00 f1-25 brown0 pa0-50 bg-light"
                    >
                        {MEAL_PERIOD_LABELS[period]}{' '}
                        <span>
                            {grouped[period].length} categories
                        </span>
                    </h4>
                    <div className=""
                    >
                        {
                            grouped[period].map(
                                (cat, idx) => (
                                    <div className="mb2-00" 
                                        key={cat.id || idx}
                                    >
                                    <Link 
                                        to={`/categories/${cat.slug || encodeURIComponent(cat.name.toLowerCase().replace(/\s+/g, '-'))}`}
                                        className="brown0 no-underline"
                                        style={{ cursor: 'pointer' }}
                                        title={`View ${cat.name} items`}
                                    >
                                        <div className="flex flex-column-m shadow-sm ggap1-00
                                            text-center 
                                            "
                                        >
                                            {
                                                cat.image 
                                                ?   (
                                                        <img 
                                                            src={cat.image} 
                                                            alt={cat.name} 
                                                            className="cover w-100-m w8-00 h6-00"       
                                                        />
                                                    ) 
                                                : 
                                                (
                                                    <div style={
                                                            {
                                                                height:'100px',
                                                                background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                                display:'flex',
                                                                alignItems:'center',
                                                                justifyContent:'center'
                                                            }
                                                        }
                                                    >
                                                    <span role="img" aria-label="category" 
                                                        style={{fontSize:'2rem'}}>🍽️</span>
                                                    </div>
                                                )
                                            }
                                            <div className="card-body">
                                                <h3 className=" text-dark"
                                                >
                                                    {cat.name}
                                                </h3>
                                                {cat.description && (
                                                <div className="">{cat.description}</div>
                                                )}
                                                {cat.item_count !== undefined && (
                                                <div className="badge bg-light text-dark">
                                                    {cat.item_count} {cat.item_count === 1 ? 'item' : 'items'}
                                                </div>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                    </div>
                                )
                            )
                        }
                    </div>
                </div>
                )
            ))}
            
            {categories.length === 0 && (
                <div className="text-center py-5">
                    <div className="text-muted mb-3" style={{fontSize: '3rem'}}>
                        🍽️
                    </div>
                    <p className="text-muted">
                        No menu categories available at the moment.
                    </p>
                    <Link to="/restaurants" className="btn btn-primary mt-2">
                        Browse Restaurants
                    </Link>
                </div>
            )}
            
            <style>{`
                .category-card {
                transition: all 0.3s ease;
                border: 1px solid rgba(0,0,0,0.1);
                }
                .category-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 16px rgba(0,0,0,0.15) !important;
                border-color: #667eea;
                }
                .category-card:hover .card-body h6 {
                color: #667eea !important;
                }
            `}</style>
        </div>
    );
};

export default MenuCategories;

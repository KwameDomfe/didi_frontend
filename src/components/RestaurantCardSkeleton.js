import React from 'react';

const RestaurantCardSkeleton = () => (
  <div className="card mb-3 bg-light placeholder-glow">
    <div className="card-body">
      <div className="card-title placeholder col-6"></div>
      <p className="card-text placeholder col-8"></p>
    </div>
  </div>
);

export default RestaurantCardSkeleton;

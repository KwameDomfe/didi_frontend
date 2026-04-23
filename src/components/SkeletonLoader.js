import React from 'react';
import './SkeletonLoader.css';

// Restaurant Card Skeleton
export const RestaurantCardSkeleton = () => (
  <div className="col-md-6 col-lg-4 mb-4">
    <div className="card h-100 border-0 shadow restaurant-card">
      <div className="skeleton-image-container"></div>
      <div className="card-body d-flex flex-column" style={{ padding: '1.5rem' }}>
        <div className="mb-2">
          <div className="skeleton-title mb-2"></div>
          <div className="skeleton-badge"></div>
        </div>
        <div className="skeleton-text mb-2"></div>
        <div className="skeleton-text-short mb-2"></div>
        <div className="mb-2">
          <div className="skeleton-info mb-1"></div>
          <div className="skeleton-info"></div>
        </div>
        <div className="mt-auto">
          <div className="skeleton-button"></div>
        </div>
      </div>
    </div>
  </div>
);

// Menu Item Skeleton
export const MenuItemSkeleton = () => (
  <div className="col-md-6 col-lg-4 mb-4">
    <div className="card menu-item-card h-100">
      <div className="skeleton-menu-image"></div>
      <div className="card-body">
        <div className="skeleton-title mb-2"></div>
        <div className="skeleton-text mb-2"></div>
        <div className="skeleton-text-short mb-3"></div>
        <div className="d-flex justify-content-between align-items-center">
          <div className="skeleton-price"></div>
          <div className="skeleton-button-small"></div>
        </div>
      </div>
    </div>
  </div>
);

// Hero Section Skeleton
export const HeroSkeleton = () => (
  <div className="jumbotron text-white text-center py-5 mb-4">
    <div className="container">
      <div className="skeleton-hero-title mb-3"></div>
      <div className="skeleton-hero-subtitle mx-auto mb-4"></div>
    </div>
  </div>
);

// Search Filter Skeleton
export const SearchFilterSkeleton = () => (
  <div className="search-filter-container bg-white p-4 mb-4">
    <div className="row g-3">
      <div className="col-md-5">
        <div className="skeleton-input"></div>
      </div>
      <div className="col-md-4">
        <div className="skeleton-input"></div>
      </div>
      <div className="col-md-3">
        <div className="skeleton-input"></div>
      </div>
    </div>
  </div>
);

// Modal Menu Skeleton
export const MenuModalSkeleton = () => (
  <div className="container-fluid py-4">
    <div className="row">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <MenuItemSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Cart Item Skeleton
export const CartItemSkeleton = () => (
  <div className="card mb-3">
    <div className="card-body">
      <div className="row align-items-center">
        <div className="col-3">
          <div className="skeleton-cart-image"></div>
        </div>
        <div className="col-6">
          <div className="skeleton-title mb-2"></div>
          <div className="skeleton-text-short"></div>
        </div>
        <div className="col-3 text-end">
          <div className="skeleton-price"></div>
          <div className="skeleton-quantity mt-2"></div>
        </div>
      </div>
    </div>
  </div>
);

// Order Card Skeleton
export const OrderCardSkeleton = () => (
  <div className="card mb-3">
    <div className="card-body">
      <div className="d-flex justify-content-between mb-3">
        <div className="skeleton-order-id"></div>
        <div className="skeleton-badge"></div>
      </div>
      <div className="skeleton-text mb-2"></div>
      <div className="skeleton-text-short mb-3"></div>
      <div className="d-flex justify-content-between">
        <div className="skeleton-price"></div>
        <div className="skeleton-button-small"></div>
      </div>
    </div>
  </div>
);

// Profile Section Skeleton
export const ProfileSkeleton = () => (
  <div className="card">
    <div className="card-body">
      <div className="text-center mb-4">
        <div className="skeleton-avatar mx-auto mb-3"></div>
        <div className="skeleton-title mb-2"></div>
        <div className="skeleton-text-short mx-auto"></div>
      </div>
      <div className="mb-3">
        <div className="skeleton-label mb-2"></div>
        <div className="skeleton-input"></div>
      </div>
      <div className="mb-3">
        <div className="skeleton-label mb-2"></div>
        <div className="skeleton-input"></div>
      </div>
      <div className="mb-3">
        <div className="skeleton-label mb-2"></div>
        <div className="skeleton-input"></div>
      </div>
      <div className="skeleton-button"></div>
    </div>
  </div>
);

// Full Page Skeleton
export const FullPageSkeleton = ({ type = 'restaurants' }) => {
  switch (type) {
    case 'restaurants':
      return (
        <div className="container mt-4">
          <HeroSkeleton />
          <SearchFilterSkeleton />
          <div className="row">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <RestaurantCardSkeleton key={i} />
            ))}
          </div>
        </div>
      );
    case 'cart':
      return (
        <div className="container mt-4">
          <div className="skeleton-page-title mb-4"></div>
          {[1, 2, 3].map(i => (
            <CartItemSkeleton key={i} />
          ))}
        </div>
      );
    case 'orders':
      return (
        <div className="container mt-4">
          <div className="skeleton-page-title mb-4"></div>
          {[1, 2, 3, 4].map(i => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      );
    case 'profile':
      return (
        <div className="container mt-4">
          <div className="skeleton-page-title mb-4"></div>
          <ProfileSkeleton />
        </div>
      );
    default:
      return (
        <div className="container mt-4">
          <div className="skeleton-page-title mb-4"></div>
          <div className="skeleton-text mb-2"></div>
          <div className="skeleton-text mb-2"></div>
          <div className="skeleton-text-short"></div>
        </div>
      );
  }
};

const Skeletons = {
  RestaurantCardSkeleton,
  MenuItemSkeleton,
  HeroSkeleton,
  SearchFilterSkeleton,
  MenuModalSkeleton,
  CartItemSkeleton,
  OrderCardSkeleton,
  ProfileSkeleton,
  FullPageSkeleton
};

export default Skeletons;

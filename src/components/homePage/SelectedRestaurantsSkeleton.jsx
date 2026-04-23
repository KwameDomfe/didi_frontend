import RestaurantCardSkeleton from '../RestaurantCardSkeleton';

const SelectedRestaurantsSkeleton = () => (
  <div className="row">
    {[...Array(6)].map((_, i) => (
      <RestaurantCardSkeleton key={i} />
    ))}
  </div>
);

export default SelectedRestaurantsSkeleton;

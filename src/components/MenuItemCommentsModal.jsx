import React from 'react';
import RestaurantCommentsModal from './RestaurantCommentsModal';

// Simple wrapper for menu item comments, can be extended for menu-specific logic
export default function MenuItemCommentsModal(props) {
  // If item is passed, use its image and name for the modal header
  const { item, ...rest } = props;
  const coverImage = item?.image || undefined;
  const name = item?.name || undefined;
  // Pass a pseudo-restaurant object with image and name to the modal
  return (
    <RestaurantCommentsModal
      {...rest}
      restaurant={{ name, image: coverImage }}
    />
  );
}

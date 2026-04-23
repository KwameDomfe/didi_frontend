import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaShoppingCart } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import formatCurrency from '../utils/formatCurrency';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300&h=150&fit=crop';

export default function CartSuggestionsModal({ show, onHide, addedItem, suggestions, loading }) {
  const { addToCart, cart } = useCart();
  const navigate = useNavigate();
  const [addedIds, setAddedIds] = useState(new Set());

  const cartIds = new Set(cart.map((ci) => ci.id));
  const availableSuggestions = suggestions.filter((s) => !cartIds.has(s.id));

  const handleAddSuggestion = (suggestion) => {
    addToCart(suggestion);
    setAddedIds((prev) => new Set(prev).add(suggestion.id));
  };

  const handleViewCart = () => {
    onHide();
    navigate('/cart');
  };

  if (!show) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onHide(); }}
    >
      <div
        className="bg-white br0-25 shadow-4"
        style={{ width: '100%', maxWidth: '640px', margin: '1rem', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <header className="flex justify-between items-center pa1-00 bg-brown0 gold0" style={{ borderRadius: '0.25rem 0.25rem 0 0', flexShrink: 0 }}>
          <div>
            <h5 className="mb0-00 gold0 f1-25">Added to your cart!</h5>
            {addedItem?.name && (
              <div className="f0-85 gold0" style={{ opacity: 0.85 }}>{addedItem.name} is ready in your cart</div>
            )}
          </div>
          <button
            type="button"
            className="ba pa0-25 br0-25 bg-transparent gold0 b--gold0 pointer"
            onClick={onHide}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </header>

        {/* Body */}
        <main className="pa1-00 brown0" style={{ overflowY: 'auto', flexGrow: 1 }}>
          {loading ? (
            <div className="tc pa2-00 brown0">
              <p className="f0-85">Finding items you might enjoy…</p>
            </div>
          ) : availableSuggestions.length > 0 ? (
            <>
              <p className="f0-85 mb1-00">
                You might also enjoy these from{' '}
                <strong>{addedItem?.restaurant_name || 'this restaurant'}</strong>:
              </p>
              <div className="grid gtc1 gtc3-m ggap1-00">
                {availableSuggestions.map((suggestion) => {
                  const alreadyAdded = addedIds.has(suggestion.id);
                  return (
                    <div key={suggestion.id} className="flex flex-column min-w-0 br0-50 shadow-4">
                      <figure className="grid gtc mb0-00">
                        <img
                          src={suggestion.image || FALLBACK_IMAGE}
                          alt={suggestion.name}
                          className="gc1s6 gr1s6 cover"
                          style={{ height: '120px' }}
                          onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
                        />
                        <figcaption className="ba pa0-25 bg-brown0 br0-25 gc5s2 gr1s1 ma0-50 b gold0 tr f0-75">
                          {formatCurrency(suggestion.price)}
                        </figcaption>
                      </figure>
                      <div className="pa0-50 bg-white brown0" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <div className="b f0-90 mb0-25" style={{ flexGrow: 1 }}>{suggestion.name}</div>
                        {suggestion.description && (
                          <p
                            className="f0-75 brown0 mb0-50"
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}
                          >
                            {suggestion.description}
                          </p>
                        )}
                        <button
                          className={`w-100 tc pa0-25 br0-25 ba pointer b${alreadyAdded ? ' bg-brown0 gold0 b--brown0' : ' bg-transparent brown0 b--brown0'}`}
                          onClick={() => handleAddSuggestion(suggestion)}
                          disabled={alreadyAdded}
                        >
                          {alreadyAdded ? '✓ Added' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="tc pa2-00 brown0">
              <p className="mb0-00 f0-85">No additional items available from this restaurant right now.</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="flex justify-between items-center pa1-00 bt" style={{ flexShrink: 0 }}>
          <button className="ba pa0-50 br0-25 bg-transparent brown0 b--brown0 pointer" onClick={onHide}>
            Continue Shopping
          </button>
          <button className="ba pa0-50 br0-25 bg-brown0 gold0 b--brown0 pointer b flex items-center ggap0-50" onClick={handleViewCart}>
            <FaShoppingCart /> View Cart
          </button>
        </footer>

      </div>
    </div>
  );
}

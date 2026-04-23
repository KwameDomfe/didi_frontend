import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../App';
import MenuItemFormModal from '../../components/MenuItemFormModal';
import MenuItemOptionsModal from '../../components/MenuItemOptionsModal';
import CartSuggestionsModal from '../../components/CartSuggestionsModal';
import axios from 'axios';
import { FaEdit, FaTrash, FaHeart, FaRegHeart, FaShareAlt, FaCommentDots } from 'react-icons/fa';
import MenuItemCommentsModal from '../../components/MenuItemCommentsModal';


// Enhanced Menu Item Card Component
const MenuItemCard = ({ item, onUpdate }) => {
    const { user, API_BASE_URL, showToast } = useApp();
    const navigate = useNavigate();
    const [showEditModal, setShowEditModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    // Options-before-cart modal
    const [showOptions, setShowOptions] = useState(false);
    // Suggestions shown after item is added
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [likesCount, setLikesCount] = useState(
        Number(item.likes_count ?? item.total_likes ?? item.likes ?? 0)
    );
    const [commentsCount, setCommentsCount] = useState(
        Number(item.comments_count ?? item.total_comments ?? 0)
    );
    const [isLiked, setIsLiked] = useState(Boolean(item.is_liked ?? item.liked_by_user));
    const [likeLoading, setLikeLoading] = useState(false);
    const [commentLoading, setCommentLoading] = useState(false);
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState(Array.isArray(item.comments) ? item.comments : []);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [showAllComments, setShowAllComments] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // Helper to count all comments and replies
    const countAllComments = (commentsArr) => {
        if (!Array.isArray(commentsArr)) return 0;
        let count = 0;
        for (const c of commentsArr) {
            count += 1;
            if (Array.isArray(c.replies)) count += c.replies.length;
        }
        return count;
    };

    useEffect(() => {
        setLikesCount(Number(item.likes_count ?? item.total_likes ?? item.likes ?? 0));
        setIsLiked(Boolean(item.is_liked ?? item.liked_by_user));
        const arr = Array.isArray(item.comments) ? item.comments : [];
        setComments(arr);
        setCommentsCount(countAllComments(arr));
    }, [item]);

    const menuItemKey = useMemo(() => item.slug || item.id, [item.slug, item.id]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return token ? { Authorization: `Token ${token}` } : {};
    };

    const requireAuth = () => {
        if (user) return true;
        showToast('Please log in to like, comment, and share menu items.', 'info');
        navigate('/login');
        return false;
    };

    const callFirstAvailable = async (method, endpoints, data) => {
        const headers = getAuthHeaders();
        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                const config = { method, url: endpoint, headers };
                if (data !== undefined) {
                    config.data = data;
                }
                return await axios(config);
            } catch (error) {
                lastError = error;
                const status = error?.response?.status;
                if (status && status !== 404 && status !== 405) {
                    throw error;
                }
            }
        }

        if (lastError) throw lastError;
        throw new Error('No endpoint available');
    };

    const handleToggleLike = async () => {
        if (!requireAuth() || likeLoading) return;

        const previousLiked = isLiked;
        const previousCount = likesCount;
        const nextLiked = !previousLiked;
        setIsLiked(nextLiked);
        setLikesCount(Math.max(0, previousCount + (nextLiked ? 1 : -1)));
        setLikeLoading(true);

        const likeEndpoints = [
            `${API_BASE_URL}/menu-items/${menuItemKey}/like/`,
            `${API_BASE_URL}/menu-items/${menuItemKey}/likes/`,
            `${API_BASE_URL}/menu-item-likes/`
        ];

        try {
            if (nextLiked) {
                await callFirstAvailable('post', likeEndpoints, { menu_item: item.id });
            } else {
                // Try DELETE first; fall back to POST toggle if the endpoint doesn't support DELETE
                try {
                    await callFirstAvailable('delete', likeEndpoints);
                } catch {
                    await callFirstAvailable('post', likeEndpoints, { menu_item: item.id });
                }
            }
        } catch (error) {
            console.error('[Like] Failed:', error?.response?.status, error?.response?.data ?? error.message);
            setIsLiked(previousLiked);
            setLikesCount(previousCount);
            showToast(
                error?.response?.data?.detail || error?.response?.data?.error || 'Could not update like — please try again.',
                'error'
            );
        } finally {
            setLikeLoading(false);
        }
    };

    const handleSubmitComment = async (event) => {
        event.preventDefault();
        if (!requireAuth() || commentLoading) return;

        const message = commentText.trim();
        if (!message) return;

        setCommentLoading(true);
        const previousComments = comments;
        const optimistic = {
            id: `temp-${Date.now()}`,
            comment: message,
            author_name: user?.first_name || user?.username || 'You',
            author_image: user?.profile_picture || user?.profile_image || user?.avatar || ''
        };
        setComments((prev) => [optimistic, ...prev]);
        setCommentsCount((prev) => prev + 1);
        setCommentText('');

        const commentEndpoints = [
            `${API_BASE_URL}/menu-items/${menuItemKey}/comments/`,
            `${API_BASE_URL}/menu-item-comments/`
        ];

        try {
            const response = await callFirstAvailable('post', commentEndpoints, {
                menu_item: item.id,
                comment: message,
                content: message,
                text: message
            });
            const created = response?.data;
            if (created && typeof created === 'object') {
                setComments((prev) => [created, ...prev.filter((c) => c.id !== optimistic.id)]);
            }
        } catch (error) {
            console.error('[Comment] Failed:', error?.response?.status, error?.response?.data ?? error.message);
            setComments(previousComments);
            setCommentsCount((prev) => Math.max(0, prev - 1));
            setCommentText(message);
            showToast(
                error?.response?.data?.detail || error?.response?.data?.error || 'Could not post comment — please try again.',
                'error'
            );
        } finally {
            setCommentLoading(false);
        }
    };

    const handleShare = async () => {
        if (shareLoading) return;

        setShareLoading(true);
        const url = `${window.location.origin}/menu-items/${item.slug}`;
        const shareData = {
            title: item.name,
            text: `Check out ${item.name}`,
            url
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                showToast('Shared successfully!', 'success');
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
                showToast('Link copied to clipboard!', 'success');
            } else {
                window.prompt('Copy this link:', url);
            }
            // Fire-and-forget server tracking — only when logged in
            if (user) {
                axios.post(
                    `${API_BASE_URL}/menu-items/${menuItemKey}/share/`,
                    { menu_item: item.id },
                    { headers: getAuthHeaders() }
                ).catch(() => {});
            }
        } catch (error) {
            if (error?.name !== 'AbortError') {
                console.error('[Share] Failed:', error.message);
                showToast('Unable to share this item right now.', 'error');
            }
        } finally {
            setShareLoading(false);
        }
    };


    const handleStartEditComment = (commentId, currentText) => {
        setEditingCommentId(commentId);
        setEditingCommentText(currentText);
    };

    const handleCancelEditComment = () => {
        setEditingCommentId(null);
        setEditingCommentText('');
    };

    const handleSaveEditComment = async (commentId) => {
        if (!editingCommentText.trim()) {
            showToast('Comment cannot be empty.', 'error');
            return;
        }

        setEditLoading(true);
        const previousComments = comments;
        
        // Optimistic update
        setComments((prev) =>
            prev.map((c) => (c.id === commentId ? { ...c, comment: editingCommentText } : c))
        );

        const headers = getAuthHeaders();
        const endpoints = [
            `${API_BASE_URL}/menu-items/${menuItemKey}/comments/${commentId}/`,
            `${API_BASE_URL}/menu-item-comments/${commentId}/`,
        ];

        for (const url of endpoints) {
            try {
                await axios.patch(url, { comment: editingCommentText }, { headers });
                setEditingCommentId(null);
                setEditingCommentText('');
                setEditLoading(false);
                showToast('Comment updated!', 'success');
                return;
            } catch (e) {
                const status = e?.response?.status;
                if (status && status !== 404 && status !== 405) {
                    setComments(previousComments);
                    console.error('[EditComment] Failed:', e?.response?.status, e?.response?.data ?? e.message);
                    showToast(e?.response?.data?.detail || 'Could not edit comment.', 'error');
                    setEditLoading(false);
                    return;
                }
            }
        }
        setComments(previousComments);
        showToast('Could not edit comment.', 'error');
        setEditLoading(false);
    };

    // Called by options modal after the item has been added to cart
    const handleAfterAdd = async () => {
        const restaurantId = item.restaurant?.id ?? (typeof item.restaurant === 'number' ? item.restaurant : null);
        setSuggestions([]);
        setSuggestionsLoading(Boolean(restaurantId));
        setShowSuggestions(true);

        if (!restaurantId) return;

        try {
            const response = await axios.get(
                `${API_BASE_URL}/menu-items/?restaurant=${restaurantId}`
            );
            const all =
                response.data?.results ?? (Array.isArray(response.data) ? response.data : []);
            setSuggestions(all.filter((s) => s.id !== item.id && s.is_available).slice(0, 6));
            } catch {
            setSuggestions([]);
            } finally {
            setSuggestionsLoading(false);
        }
    };

    // Fetch live comments and like status from the server whenever the item key changes
    useEffect(() => {
        let mounted = true;
        const token = localStorage.getItem('authToken');
        const headers = token ? { Authorization: `Token ${token}` } : {};

        const fetchComments = async () => {
            const endpoints = [
                `${API_BASE_URL}/menu-items/${menuItemKey}/comments/`,
                `${API_BASE_URL}/menu-item-comments/?menu_item=${item.id}`,
            ];
            for (const url of endpoints) {
                try {
                    const res = await axios.get(url, { headers });
                    if (!mounted) return;
                    const results = res.data?.results ?? (Array.isArray(res.data) ? res.data : []);
                    setComments(results);
                    setCommentsCount(countAllComments(results));
                    break;
                } catch (e) {
                    const status = e?.response?.status;
                    if (status && status !== 404 && status !== 405) break;
                }
            }
            if (mounted) setCommentsLoading(false);
        };

        const fetchLikeStatus = async () => {
            if (!token) return;
            try {
                const res = await axios.get(`${API_BASE_URL}/menu-items/${menuItemKey}/`, { headers });
                if (!mounted) return;
                if (res.data?.likes_count !== undefined) setLikesCount(Number(res.data.likes_count));
                if (res.data?.is_liked !== undefined) setIsLiked(Boolean(res.data.is_liked));
            } catch {
                // fall back to prop values already in state
            }
        };

        setCommentsLoading(true);
        fetchComments();
        fetchLikeStatus();
        return () => { mounted = false; };
    }, [menuItemKey, API_BASE_URL, item.id]);

    // Check if user can edit (owns the restaurant or is admin)
    const canEdit = user && (
        (item.restaurant && item.restaurant.owner === user.id) ||
        user.user_type === 'platform_admin'
    );
    const getSpiceLevel = (level) => {
        const spices = ['🌶️', '🌶️🌶️', '🌶️🌶️🌶️', '🌶️🌶️🌶️🌶️'];
        return level > 0 ? spices[level - 1] || '🌶️🌶️🌶️🌶️' : '';
    };

    const getDietaryTags = (item) => {
        const tags = [];
        if (item.is_vegetarian) tags.push({ label: '🌱 Vegetarian', class: 'success' });
        if (item.is_vegan) tags.push({ label: '🌿 Vegan', class: 'success' });
        if (item.is_gluten_free) tags.push({ label: '🌾 Gluten-Free', class: 'info' });
        return tags;
    };

    const getCommentAuthorName = (comment) =>
        comment?.author_name
        || comment?.author?.username
        || comment?.author_username
        || comment?.user?.username
        || comment?.author
        || 'User';

    const getCommentAuthorImage = (comment) => {
        const candidate =
            comment?.author_image
            || comment?.author_profile_picture
            || comment?.profile_picture
            || comment?.author?.profile_picture
            || comment?.author?.avatar
            || comment?.user?.profile_picture
            || comment?.user?.avatar
            || '';

        if (!candidate) return '';

        const isAbsolute = /^(https?:)?\/\//i.test(candidate)
            || candidate.startsWith('data:')
            || candidate.startsWith('blob:');

        if (isAbsolute) return candidate;

        const origin = (API_BASE_URL || '').replace(/\/api\/?$/, '');
        return `${origin}${candidate.startsWith('/') ? candidate : `/${candidate}`}`;
    };

    const getMenuItemImage = (item) => {
        if (item.image) return item.image;
        
        // Default food images based on name/ingredients
        const itemName = item.name.toLowerCase();
        if (itemName.includes('pasta') || itemName.includes('spaghetti') || itemName.includes('penne')) {
            return 'https://images.unsplash.com/photo-1563379091339-03246963d96c?w=300&h=200&fit=crop';
        }
        if (itemName.includes('sushi') || itemName.includes('roll')) {
            return 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=300&h=200&fit=crop';
        }
        if (itemName.includes('bowl') || itemName.includes('buddha')) {
            return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop';
        }
        if (itemName.includes('smoothie') || itemName.includes('juice')) {
            return 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=300&h=200&fit=crop';
        }
        if (itemName.includes('bruschetta') || itemName.includes('calamari')) {
            return 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop';
        }
            return 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=300&h=200&fit=crop';
    };

    const backendOrigin = useMemo(
        () => (API_BASE_URL || '').replace(/\/api\/?$/, ''),
        [API_BASE_URL]
    );

    const resolvedImageSrc = useMemo(() => {
        const source = getMenuItemImage(item);
        if (!source) {
        return source;
        }

        const isAbsolute = /^(https?:)?\/\//i.test(source) 
            || source.startsWith('data:') 
            || source.startsWith('blob:');
        const normalized = isAbsolute
            ? source
            : `${backendOrigin}${source.startsWith('/') ? source : `/${source}`}`;

        const cacheKey = item.updated_at || item.updatedAt || item.image_updated_at || item.imageUpdatedAt;
        if (!cacheKey) {
            return normalized;
        }

        const separator = normalized.includes('?') ? '&' : '?';
            return `${normalized}${separator}v=${encodeURIComponent(String(cacheKey))}`;
    }, [backendOrigin, item]);

    useEffect(
        () => {
            setImageFailed(false);
        }, [resolvedImageSrc]
    );

    return (
        <div className="flex flex-column min-w-0 br0-50 shadow-4">
            <header className="flex justify-end items-start pa0-50">
                {/* Edit/Delete buttons for owners/admins */}
                {canEdit && (
                    <div className="flex ggap0-50">
                        <button
                            className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer hover-brown0"
                            onClick={() => setShowEditModal(true)}
                        >
                            <FaEdit className="mr0-25" /> Edit
                        </button>
                        <button
                            className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer hover-brown0"
                            onClick={async () => {
                                if (!window.confirm('Delete this menu item?')) return;
                                setDeleting(true);
                                try {
                                    const token = localStorage.getItem('authToken');
                                    await axios.delete(`${API_BASE_URL}/menu-items/${item.slug}/`, {
                                        headers: { 'Authorization': `Token ${token}` }
                                    });
                                    if (onUpdate) onUpdate();
                                } catch (err) {
                                    alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
                                } finally {
                                    setDeleting(false);
                                }
                            }}
                            disabled={deleting}
                        >
                            <FaTrash className="mr0-25" /> {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                )}
            </header>

            <div className="w-100">
                <figure className="grid gtc">
                    <img
                        src={imageFailed ? getMenuItemImage({ ...item, image: null }) : resolvedImageSrc}
                        alt={item.name}
                        className="gc1s6 gr1s6 h12-00 cover"
                        onError={() => setImageFailed(true)}
                    />
                    <figcaption className="ba pa0-25 bg-brown0 br0-25 gc5s2 gr1s1 ma1-00 b gold0 tr">
                        {item.restaurant_name || ''}
                    </figcaption>
                </figure>

                <div className="pa0-50 bg-white brown0">
                    <div className="flex justify-between b h4-00">
                        <h5 className="f1-75">{item.name}</h5>
                    </div>

                    <p className="h6-00 lh-copy">{item.description}</p>

                    {/* Info panel */}
                    <div className="flex justify-between items-center 
                        mb1-50 shadow-4 h5-00 pa0-50 bg-gold5 br0-25">
                        <div>
                            <div className="mb0-50">Price:</div>
                            <span className="gold1 f1-25 b">GHC {parseFloat(item.price).toFixed(2)}</span>
                        </div>
                        <div className="tr">
                            {item.prep_time > 0 && <div className="mb0-25">⏱️ {item.prep_time}m prep</div>}
                            {item.spice_level > 0 && <div className="mb0-25">{getSpiceLevel(item.spice_level)}</div>}
                            <div className="mb0-25">{item.is_available ? '✅ Available' : '❌ Unavailable'}</div>
                        </div>
                    </div>

                    {/* Dietary tags */}
                    {getDietaryTags(item).length > 0 && (
                        <div className="mb1-00">
                            {getDietaryTags(item).map((tag, i) => (
                                <span key={i} className={`badge bg-${tag.class} mb0-25`}>
                                    {tag.label}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Add to Cart */}
                    <div className="flex ggap1-00 mt1-00">
                        <button
                            className={`flex-grow-1 tc pa0-50 br0-25 ba pointer b ${
                                item.is_available
                                    ? 'bg-brown0 gold0 b--brown0'
                                    : 'bg-transparent b--black-30 black-30'
                            }`}
                            onClick={() => setShowOptions(true)}
                            disabled={!item.is_available}
                        >
                            {item.is_available ? '🛒 Add to Cart' : 'Unavailable'}
                        </button>
                    </div>
                </div>
            </div>

            <footer>
                <div className="flex pa0-50">
                    <div className="flex justify-center items-center ggap0-50 pa0-50">
                        <button
                            type="button"
                            className={`pa0-25 br0-25 ba pointer ${
                                isLiked
                                    ? 'bg-brown0 gold0 b--brown0'
                                    : 'bg-transparent brown0 b--brown0 hover-brown0'
                            }`}
                            onClick={handleToggleLike}
                            disabled={likeLoading}
                        >
                            {isLiked ? <FaHeart className="mr0-25" /> : <FaRegHeart className="mr0-25" />}
                            Like ({likesCount})
                        </button>

                        <button
                            type="button"
                            className="pa0-25 br0-25 ba b--brown0 bg-transparent brown0 pointer hover-brown0"
                            onClick={handleShare}
                            disabled={shareLoading}
                        >
                            <FaShareAlt className="mr0-25" />
                            Share
                        </button>

                        <button
                            type="button"
                            className="pa0-25 br0-25 ba pointer bg-transparent brown0 b--brown0 hover-brown0"
                            onClick={() => {
                                setShowCommentsModal(true);
                            }}
                        >
                            <FaCommentDots className="mr0-25" />
                            Comment ({commentsCount})
                        </button>
                    </div>
                </div>

                {/* Comments are now shown in a modal */}
                <MenuItemCommentsModal
                    isOpen={showCommentsModal}
                    onClose={() => setShowCommentsModal(false)}
                    item={item}
                    user={user}
                    comments={comments}
                    commentsLoading={commentsLoading}
                    commentsCount={commentsCount}
                    commentText={commentText}
                    setCommentText={setCommentText}
                    commentLoading={commentLoading}
                    handleAddComment={handleSubmitComment}
                    showAllComments={showAllComments}
                    setShowAllComments={setShowAllComments}
                    editingCommentId={editingCommentId}
                    editingCommentText={editingCommentText}
                    setEditingCommentText={setEditingCommentText}
                    editLoading={editLoading}
                    handleStartEditComment={handleStartEditComment}
                    handleCancelEditComment={handleCancelEditComment}
                    handleSaveEditComment={handleSaveEditComment}
                    setDeleteCommentId={() => {}}
                    getCommentAuthorName={getCommentAuthorName}
                    getCommentAuthorImage={getCommentAuthorImage}
                />
            </footer>

        <MenuItemFormModal
            show={showEditModal}
            onHide={() => setShowEditModal(false)}
            menuItem={item}
            restaurantId={item.restaurant?.id || item.restaurant}
            onSuccess={() => {
            setShowEditModal(false);
            if (onUpdate) onUpdate();
            }}
        />
        <MenuItemOptionsModal
            show={showOptions}
            onHide={() => setShowOptions(false)}
            item={item}
            onAfterAdd={handleAfterAdd}
        />
        <CartSuggestionsModal
            show={showSuggestions}
            onHide={() => setShowSuggestions(false)}
            addedItem={item}
            suggestions={suggestions}
            loading={suggestionsLoading}
        />
        </div>
    );
};

export default MenuItemCard;
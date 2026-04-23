import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApp } from '../App';
import RestaurantFormModal from './RestaurantFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import RestaurantCommentsModal from './RestaurantCommentsModal';
import axios from 'axios';
import { FaEdit, FaTrash, FaHeart, FaRegHeart, FaShareAlt, FaCommentDots, FaCheckCircle, FaLock } from 'react-icons/fa';
import { checkIsOpenNow, renderStars } from '../utils/restaurantUtils';

const RestaurantCard = ({ restaurant, onUpdate, showMenu = true }) => {
  const { user, API_BASE_URL, showToast } = useApp();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

    const socialStorageKey = `didi_restaurant_social_v1_${restaurant.id}`;

    const loadSocialState = () => {
        const fallbackLikeCount = Number(restaurant.likes_count || 0);
        try {
            const raw = localStorage.getItem(socialStorageKey);
            const parsed = raw ? JSON.parse(raw) : null;
            if (user) {
                // Authenticated: API is the source of truth for liked state
                return {
                    liked: Boolean(restaurant.is_liked),
                    likeCount: fallbackLikeCount,
                    comments: [],
                };
            } else {
                // Unauthenticated: localStorage is the source of truth
                return {
                    liked: Boolean(parsed?.liked),
                    likeCount: fallbackLikeCount,
                    comments: [],
                };
            }
        } catch {
            return { liked: user ? Boolean(restaurant.is_liked) : false, likeCount: fallbackLikeCount, comments: [] };
        }
    };

    const [socialState, setSocialState] = useState(loadSocialState);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [shareFeedback, setShareFeedback] = useState('');

    // Comment state (separate from socialState, mirrors MenuItemCard)
    const [comments, setComments] = useState([]);
    const [commentsCount, setCommentsCount] = useState(0);
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
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentLoading, setCommentLoading] = useState(false);
    const [showAllComments, setShowAllComments] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [editingCommentParentId, setEditingCommentParentId] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [deleteCommentId, setDeleteCommentId] = useState(null);
    const [replyingToId, setReplyingToId] = useState(null);   // comment id being replied to
    const [replyLoading, setReplyLoading] = useState(false);

    const canEdit = restaurant.is_owner || (user && user.user_type === 'platform_admin');

    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return token ? { Authorization: `Token ${token}` } : {};
    };

    const requireAuth = () => {
        if (user) return true;
        if (showToast) showToast('Please log in to like, comment, and share.', 'info');
        navigate('/login');
        return false;
    };

    const getCommentAuthorName = (c) =>
        c?.author_name || c?.author?.username || c?.author_username || c?.user?.username || c?.author || 'User';

    const getCommentAuthorImage = (c) => {
        const candidate = c?.author_image || c?.author?.profile_picture || c?.user?.profile_picture || '';
        if (!candidate) return '';
        if (/^(https?:)?\/\//i.test(candidate) || candidate.startsWith('data:')) return candidate;
        const origin = (API_BASE_URL || '').replace(/\/api\/?$/, '');
        return `${origin}${candidate.startsWith('/') ? candidate : `/${candidate}`}`;
    };
    useEffect(() => {
        if (user) {
            setSocialState(prev => ({
                ...prev,
                liked: Boolean(restaurant.is_liked),
                likeCount: Number(restaurant.likes_count || prev.likeCount),
            }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurant.is_liked, restaurant.likes_count]);

    useEffect(() => {
        try {
            localStorage.setItem(socialStorageKey, JSON.stringify({
                liked: socialState.liked,
                likeCount: socialState.likeCount,
            }));
        } catch {
            // Ignore storage limits/privacy mode failures.
        }
    }, [socialState.liked, socialState.likeCount, socialStorageKey]);

    // Fetch comments from API on mount (mirrors MenuItemCard)
    useEffect(() => {
        let mounted = true;
        setCommentsLoading(true);
        const token = localStorage.getItem('authToken');
        const headers = token ? { Authorization: `Token ${token}` } : {};
        const endpoints = [
            `${API_BASE_URL}/restaurants/${restaurant.slug}/comments/`,
            `${API_BASE_URL}/restaurant-comments/?restaurant=${restaurant.id}`,
        ];
        (async () => {
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
        })();
        return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurant.slug]);
  
    // // Debug: log restaurant data to console
    // console.log('Restaurant data:', restaurant);



    const imageSrc = restaurant.image 
        || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop&crop=center';

    const handleDelete = async () => {
        setDeleting(true);
        try {
        const token = localStorage.getItem('authToken');
        await axios.delete(
            `${API_BASE_URL}/restaurants/${restaurant.slug}/`,
            {
            headers: {
                'Authorization': `Token ${token}`
            }
            }
        );
        if (onUpdate) onUpdate();
        } catch (err) {
        alert('Failed to delete restaurant: ' + (err.response?.data?.detail || err.message));
        } finally {
        setDeleting(false);
        setShowDeleteModal(false);
        }
    };

    const handleToggleLike = async () => {
        if (!requireAuth()) return;
        // Optimistic update
        const wasLiked = socialState.liked;
        setSocialState((prev) => ({
            ...prev,
            liked: !prev.liked,
            likeCount: Math.max(0, (prev.likeCount || 0) + (prev.liked ? -1 : 1)),
        }));

        if (user) {
            try {
                const token = localStorage.getItem('authToken');
                const res = await axios.post(
                    `${API_BASE_URL}/restaurants/${restaurant.slug}/like/`,
                    {},
                    { headers: { Authorization: `Token ${token}` } }
                );
                setSocialState((prev) => ({
                    ...prev,
                    liked: res.data.liked,
                    likeCount: res.data.likes_count,
                }));
            } catch {
                // Revert optimistic update
                setSocialState((prev) => ({
                    ...prev,
                    liked: wasLiked,
                    likeCount: Math.max(0, (prev.likeCount || 0) + (wasLiked ? 1 : -1)),
                }));
            }
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/restaurants/${restaurant.slug}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: restaurant.name,
                    text: `Check out ${restaurant.name} on Didi Food`,
                    url: shareUrl,
                });
                setShareFeedback('Shared');
            } else {
                await navigator.clipboard.writeText(shareUrl);
                setShareFeedback('Link copied');
            }
        } catch {
            setShareFeedback('Unable to share');
        } finally {
            setTimeout(() => setShareFeedback(''), 1800);
        }
    };

    const handleAddComment = async (e) => {
        if (e) e.preventDefault();
        if (!requireAuth() || commentLoading) return;
        const trimmedComment = commentText.trim();
        if (!trimmedComment) return;

        setCommentLoading(true);
        const previousComments = comments;
        const optimistic = {
            id: `temp-${Date.now()}`,
            author: user?.username || 'You',
            text: trimmedComment,
            created_at: new Date().toISOString(),
        };
        setComments(prev => [...prev, optimistic]);
        setCommentsCount(countAllComments([...comments, optimistic]));
        setCommentText('');

        const endpoints = [
            `${API_BASE_URL}/restaurants/${restaurant.slug}/comments/`,
            `${API_BASE_URL}/restaurant-comments/`,
        ];
        const payloads = [
            { text: trimmedComment },
            { restaurant: restaurant.id, text: trimmedComment },
        ];
        let succeeded = false;
        for (let i = 0; i < endpoints.length; i++) {
            try {
                const res = await axios.post(endpoints[i], payloads[i], { headers: getAuthHeaders() });
                setComments(prev => {
                    const updated = [...prev.filter(c => c.id !== optimistic.id), res.data];
                    setCommentsCount(countAllComments(updated));
                    return updated;
                });
                succeeded = true;
                break;
            } catch (err) {
                const status = err?.response?.status;
                if (status && status !== 404 && status !== 405) {
                    setComments(previousComments);
                    setCommentsCount(prev => Math.max(0, prev - 1));
                    setCommentText(trimmedComment);
                    if (showToast) showToast(err?.response?.data?.detail || 'Could not post comment — please try again.', 'error');
                    setCommentLoading(false);
                    return;
                }
            }
        }
        if (!succeeded) {
            setComments(previousComments);
            setCommentsCount(prev => Math.max(0, prev - 1));
            setCommentText(trimmedComment);
            if (showToast) showToast('Could not post comment — please try again.', 'error');
        }
        setCommentLoading(false);
    };

    const handleDeleteComment = async (commentId) => {
        if (!user || String(commentId).startsWith('temp-')) return;
        const previousComments = comments;
        const previousCount = commentsCount;
        setComments(prev => {
            const updated = prev.filter(c => c.id !== commentId);
            setCommentsCount(countAllComments(updated));
            return updated;
        });
        try {
            await axios.delete(
                `${API_BASE_URL}/restaurant-comments/${commentId}/`,
                { headers: getAuthHeaders() }
            );
        } catch (e) {
            const status = e?.response?.status;
            if (status === 404) return; // already deleted — fine
            setComments(previousComments);
            setCommentsCount(previousCount);
            if (showToast) showToast(e?.response?.data?.detail || 'Could not delete comment.', 'error');
        }
    };

    const handleStartEditComment = (commentId, currentText, parentId = null) => {
        setEditingCommentId(commentId);
        setEditingCommentText(currentText);
        setEditingCommentParentId(parentId);
    };

    const handleCancelEditComment = () => {
        setEditingCommentId(null);
        setEditingCommentText('');
        setEditingCommentParentId(null);
    };

    const handleSaveEditComment = async (commentId) => {
        if (!editingCommentText.trim()) {
            if (showToast) showToast('Comment cannot be empty.', 'error');
            return;
        }
        setEditLoading(true);
        const previousComments = comments;
        setComments(prev => {
            const updated = prev.map(c => {
                if (c.id === commentId) return { ...c, text: editingCommentText };
                if (c.replies?.some(r => r.id === commentId)) {
                    return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, text: editingCommentText } : r) };
                }
                return c;
            });
            setCommentsCount(countAllComments(updated));
            return updated;
        });
        const parentId = editingCommentParentId;
        const editEndpoints = [
            { url: `${API_BASE_URL}/restaurant-comments/${commentId}/`, payload: { text: editingCommentText } },
            { url: `${API_BASE_URL}/restaurant-comments/${commentId}/`, payload: { comment: editingCommentText } },
            { url: `${API_BASE_URL}/restaurants/${restaurant.slug}/comments/${commentId}/`, payload: { text: editingCommentText } },
            ...(parentId ? [
                { url: `${API_BASE_URL}/restaurant-comments/${parentId}/replies/${commentId}/`, payload: { text: editingCommentText } },
                { url: `${API_BASE_URL}/restaurants/${restaurant.slug}/comments/${parentId}/replies/${commentId}/`, payload: { text: editingCommentText } },
            ] : []),
        ];
        let editSucceeded = false;
        let lastEditErr = null;
        for (const ep of editEndpoints) {
            try {
                await axios.patch(ep.url, ep.payload, { headers: getAuthHeaders() });
                editSucceeded = true;
                break;
            } catch (e) {
                const status = e?.response?.status;
                if (status && status !== 404 && status !== 405) { lastEditErr = e; break; }
                lastEditErr = e;
            }
        }
        if (editSucceeded) {
            setEditingCommentId(null);
            setEditingCommentText('');
            if (showToast) showToast('Comment updated!', 'success');
        } else {
            setComments(previousComments);
            if (showToast) showToast(lastEditErr?.response?.data?.detail || 'Could not edit comment.', 'error');
        }
        setEditLoading(false);
    };

    const handleAddReply = async (e, parentId, text, onSuccess, onError) => {
        if (e) e.preventDefault();
        if (!requireAuth() || replyLoading) return;
        const trimmed = text.trim();
        if (!trimmed) return;
        setReplyLoading(true);
        const optimistic = {
            id: `temp-reply-${Date.now()}`,
            author: user?.username || 'You',
            text: trimmed,
            created_at: new Date().toISOString(),
            parent: parentId,
        };
        // Optimistically insert reply inside the parent comment
        setComments(prev => {
            const updated = prev.map(c =>
                c.id === parentId
                    ? { ...c, replies: [...(c.replies || []), optimistic] }
                    : c
            );
            setCommentsCount(countAllComments(updated));
            return updated;
        });
        onSuccess?.();
        setReplyingToId(null);
        const replyEndpoints = [
            {
                url: `${API_BASE_URL}/restaurants/${restaurant.slug}/comments/`,
                payload: { parent: parentId, text: trimmed },
            },
            {
                url: `${API_BASE_URL}/restaurant-comments/`,
                payload: { parent: parentId, text: trimmed, restaurant: restaurant.id },
            },
            {
                url: `${API_BASE_URL}/restaurant-comments/`,
                payload: { parent_id: parentId, text: trimmed, restaurant: restaurant.id },
            },
        ];
        let replySucceeded = false;
        let lastErr = null;
        for (const ep of replyEndpoints) {
            try {
                const res = await axios.post(ep.url, ep.payload, { headers: getAuthHeaders() });
                setComments(prev => {
                    const updated = prev.map(c =>
                        c.id === parentId
                            ? { ...c, replies: (c.replies || []).map(r => r.id === optimistic.id ? res.data : r) }
                            : c
                    );
                    setCommentsCount(countAllComments(updated));
                    return updated;
                });
                replySucceeded = true;
                break;
            } catch (err) {
                const status = err?.response?.status;
                if (status && status !== 404 && status !== 405) {
                    lastErr = err;
                    break;
                }
                lastErr = err;
            }
        }
        if (!replySucceeded) {
            setComments(prev => {
                const updated = prev.map(c =>
                    c.id === parentId
                        ? { ...c, replies: (c.replies || []).filter(r => r.id !== optimistic.id) }
                        : c
                );
                setCommentsCount(countAllComments(updated));
                return updated;
            });
            onError?.(trimmed);
            setReplyingToId(parentId);
            if (showToast) showToast(lastErr?.response?.data?.detail || 'Could not post reply.', 'error');
        }
        setReplyLoading(false);
    };

    const handleDeleteReply = async (parentId, replyId) => {
        if (!user || String(replyId).startsWith('temp-')) return;
        const previousComments = comments;
        setComments(prev => {
            const updated = prev.map(c =>
                c.id === parentId
                    ? { ...c, replies: (c.replies || []).filter(r => r.id !== replyId) }
                    : c
            );
            setCommentsCount(countAllComments(updated));
            return updated;
        });
        try {
            await axios.delete(
                `${API_BASE_URL}/restaurant-comments/${replyId}/`,
                { headers: getAuthHeaders() }
            );
        } catch (err) {
            if (err?.response?.status === 404) return;
            setComments(previousComments);
            if (showToast) showToast(err?.response?.data?.detail || 'Could not delete reply.', 'error');
        }
    };

    
    return (
        
        <div className="
            flex flex-column min-w-0
            br0-50 shadow-4 mb2-00"
        >
            <header className="flex justify-end items-start pa0-50"
            >
                {canEdit && (
                    <div className="flex ggap0-50"
                    >
                        <button
                            className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer hover-brown0"
                            onClick={() => setShowEditModal(true)}
                        >
                            <FaEdit className="mr0-25" /> Edit
                        </button>
                        <button
                            className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer hover-brown0"
                            onClick={() => setShowDeleteModal(true)}
                            disabled={deleting}
                        >
                            <FaTrash className="mr0-25" /> {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                    )
                    }
            </header>

            <div className="w-100">
                <figure className="grid gtc">
                    <img src={imageSrc}
                        alt={restaurant.name}
                        className="gc1s6 gr1s6 h12-00 cover"
                    />
                    <figcaption className="ba pa0-25 
                        bg-brown0 br0-25 gc5s2 gr1s1 ma1-00 b gold0 tr">
                        {restaurant.cuisine?.name || ''}
                    </figcaption>
                </figure>
                
                <div className="pa0-50 bg-white brown0"
                >
                    <div className="flex justify-between b h4-00">
                        <h5 className="f1-75"
                        >
                        {restaurant.name}
                        </h5>  
                    </div>
                    
                    <p className="h6-00 lh-copy"
                    >
                        
                    {restaurant.description}
                    </p>
                    <div className="flex justify-between items-center 
                        mb2-00 shadow-4 pa1-00 bg-gold5 br0-25">
                        <div className="mb-2"
                        >
                            <div className="mb0-50">Price Range:</div>
                            <span className="gold1"
                            >
                                {
                                    {   '$': 'Budget', 
                                        '$$': 'Moderate', 
                                        '$$$': 'Expensive', 
                                        '$$$$': 'Fine Dining' 
                                    }[restaurant.price_range] || restaurant.price_range}
                            </span>
                        </div>
                        <div className="flex items-center" style={{ gap: '0.35rem' }}>
                            {renderStars(Number(restaurant.average_rating ?? restaurant.rating ?? 0))}
                            <span className="gold1" style={{ fontSize: '0.88rem' }}>
                                {Number(restaurant.average_rating ?? restaurant.rating ?? 0).toFixed(1)}
                            </span>
                            {(restaurant.total_reviews > 0) && (
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                                    ({restaurant.total_reviews})
                                </span>
                            )}
                        </div>
                    </div> 
                    <div className="flex items-center justify-center pb1-00 br0-25">
                        {
                            checkIsOpenNow(restaurant)
                            ? (
                                <div className="b bb bt bw2 pa0-50"
                                >
                                <FaCheckCircle className="mr0-25 " /> Currently <span className="bg-brown0 gold0 ph0-25 ba bw2 b--gold0">Open</span> to Customers
                                </div>
                            ) 
                            : (
                                <div className="b bb bt bw2 pa0-50 gray0"
                                >
                                <FaLock className="mr0-25 " /> Currently <span className="bg-brown0 gold0 ph0-25 ba bw2 b--gold0">Closed</span> to Customers
                                </div>
                            )
                        }
                    </div>
                    <div className="flex ggap1-00 mt1-00">
                        <Link to={`/restaurants/${restaurant.slug}`} 
                            className="flex-grow-1 
                                tc 
                                pa0-50  
                                brown0 
                                br0-25 ba b--brown0 
                                no-underline hover-brown0 b"
                        >
                            View Details
                        </Link>
                        {showMenu && (
                            <Link to={`/restaurants/${restaurant.slug}/menu`} 
                                className="flex-grow-1 tc pa0-50 br0-25 ba b--brown0 bg-brown0 gold0 no-underline hover-brown0 b"
                            >
                                View Menu
                            </Link>
                        )}
                    </div>

                    
                    
                    
                </div>

                <RestaurantFormModal
                    show={showEditModal}
                    onHide={() => setShowEditModal(false)}
                    restaurant={restaurant}
                    onSuccess={() => {
                        setShowEditModal(false);
                        if (onUpdate) onUpdate();
                    }}
                />
                <DeleteConfirmModal
                    isOpen={showDeleteModal}
                    itemName={restaurant.name}
                    onCancel={() => setShowDeleteModal(false)}
                    onConfirm={handleDelete}
                />
                <DeleteConfirmModal
                    isOpen={!!deleteCommentId}
                    itemName="this comment"
                    onCancel={() => setDeleteCommentId(null)}
                    onConfirm={() => { handleDeleteComment(deleteCommentId); setDeleteCommentId(null); }}
                />
            </div>

            <footer>
                <div className="flexpa0-50">
                    <div className="flex justify-center items-center ggap0-50 
                        pa0-50"
                    >
                        <button
                            type="button"
                            className={`pa0-25 br0-25 ba pointer ${
                                socialState.liked
                                    ? 'bg-brown0 gold0 b--brown0'
                                    : 'bg-transparent brown0 b--brown0 hover-brown0'
                            }`}
                            onClick={handleToggleLike}
                        >
                            {   
                                socialState.liked 
                                ? <FaHeart className="mr0-25" /> 
                                : <FaRegHeart className="mr0-25" />
                            }
                            Like ({socialState.likeCount || 0})
                        </button>

                        <button
                            type="button"
                            className="pa0-25 br0-25 ba b--brown0 bg-transparent brown0 pointer hover-brown0"
                            onClick={handleShare}
                        >
                            <FaShareAlt className="mr0-25" />
                            Share
                        </button>

                        <button
                            type="button"
                            className="pa0-25 br0-25 ba pointer bg-transparent brown0 b--brown0 hover-brown0"
                            onClick={() => setCommentModalOpen(true)}
                        >
                            <FaCommentDots className="mr0-25" />
                            Comment ({commentsCount})
                        </button>
                    </div>

                    {shareFeedback && (
                        <div className="small text-muted mt-1">{shareFeedback}</div>
                    )}

                    <RestaurantCommentsModal
                        isOpen={commentModalOpen}
                        onClose={() => setCommentModalOpen(false)}
                        restaurant={restaurant}
                        user={user}
                        comments={comments}
                        commentsLoading={commentsLoading}
                        commentsCount={commentsCount}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        commentLoading={commentLoading}
                        handleAddComment={handleAddComment}
                        showAllComments={showAllComments}
                        setShowAllComments={setShowAllComments}
                        editingCommentId={editingCommentId}
                        editingCommentText={editingCommentText}
                        setEditingCommentText={setEditingCommentText}
                        editLoading={editLoading}
                        handleStartEditComment={handleStartEditComment}
                        handleCancelEditComment={handleCancelEditComment}
                        handleSaveEditComment={handleSaveEditComment}
                        setDeleteCommentId={setDeleteCommentId}
                        getCommentAuthorName={getCommentAuthorName}
                        getCommentAuthorImage={getCommentAuthorImage}
                        replyingToId={replyingToId}
                        setReplyingToId={setReplyingToId}
                        replyLoading={replyLoading}
                        handleAddReply={handleAddReply}
                        handleDeleteReply={handleDeleteReply}
                    />
                </div>
            </footer>
        </div>
    );
};

export default RestaurantCard;

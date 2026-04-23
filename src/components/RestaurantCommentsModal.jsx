import { useState } from 'react';
import { FaTimes, FaReply } from 'react-icons/fa';

const CommentAvatar = ({ src, name, size = 32 }) => {
    const [failed, setFailed] = useState(false);
    const initial = (name || 'U').charAt(0).toUpperCase();
    if (src && !failed) {
        return (
            <img src={src} alt={name}
                style={
                    { width: size, 
                        height: size, 
                        borderRadius: '50%', 
                        objectFit: 'cover', 
                        flexShrink: 0 
                    }
                }
                onError={() => setFailed(true)}
            />
        );
    }
    return (
        <div style={
            {
                width: size, 
                height: size, 
                borderRadius: '50%',
                background: '#5c3d2e', 
                color: '#f5a623', 
                fontWeight: 700,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0, 
                fontSize: size * 0.35,
            }
        }
        >{initial}</div>
    );
};

const RestaurantCommentsModal = ({
    isOpen, onClose, restaurant, user,
    comments, commentsLoading,
    commentText, setCommentText, commentLoading, handleAddComment,
    showAllComments, setShowAllComments,
    editingCommentId, editingCommentText, setEditingCommentText, editLoading,
    handleStartEditComment, handleCancelEditComment, handleSaveEditComment,
    setDeleteCommentId,
    getCommentAuthorName, getCommentAuthorImage,
    replyingToId, setReplyingToId, replyLoading, handleAddReply,
    handleDeleteReply,
}) => {
    const [replyText, setReplyText] = useState('');
    if (!isOpen) return null;

    const coverImage = restaurant?.image
        || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=200&fit=crop&crop=center';

    const renderComment = (c, isReply = false) => {
        const authorName = getCommentAuthorName(c);
        const authorImage = getCommentAuthorImage(c);
        const commentBody = c.text || c.comment || c.content || '';
        const timestamp = c.created_at || '';
        const isOwn = user && (c.user === user.id || c.user_id === user.id || c.author === user.username);
        const isEditing = editingCommentId === c.id;

        return (
            <div key={c.id} style={{ display: 'flex', gap: isReply ? '8px' : '10px', alignItems: 'flex-start' }}>
                <CommentAvatar src={authorImage} 
                    name={authorName} 
                    size={isReply ? 26 : 32} 
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 12px' }}>
                            <textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                style={
                                    { width: '100%', 
                                        padding: '4px', 
                                        borderRadius: '4px', 
                                        border: '1px solid #ccc', 
                                        resize: 'none', 
                                        minHeight: '56px', 
                                        fontSize: '0.85rem' 
                                    }
                                }
                            />
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                <button type="button" onClick={() => handleSaveEditComment(c.id)} disabled={editLoading}
                                    style={{ padding: '4px 12px', background: '#f5a623', color: '#3d1f0d', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                                    {editLoading ? 'Saving' : 'Save'}
                                </button>
                                <button type="button" onClick={handleCancelEditComment} disabled={editLoading}
                                    style={{ padding: '4px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: isReply ? '6px 10px' : '8px 12px' }}>
                            <strong className="gold1" style={{ fontSize: isReply ? '0.75rem' : '0.78rem' }}>
                                {authorName}
                            </strong>
                            <div className="" 
                                style={
                                    { fontSize: isReply 
                                        ? '0.82rem' 
                                        : '0.88rem', 
                                    marginTop: '2px' 
                                    }
                                }
                            >
                                {commentBody}
                            </div>
                        </div>
                    )}

                    {/* Timestamp + actions row */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '0.7rem', color: '#aaa', paddingLeft: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {timestamp && (
                            <span>
                                {
                                    new Date(timestamp).toLocaleDateString(
                                        undefined, { 
                                            month: 'short', 
                                            day: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        }
                                    )
                                }
                            </span>
                        )}
                        {/* Reply button â€” only for top-level comments, only when logged in */}
                        {!isReply && user && (
                            <button type="button"
                                onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                                style={{ background: 'none', border: 'none', padding: 0, color: replyingToId === c.id ? '#f5a623' : '#aaa', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <FaReply style={{ fontSize: '0.65rem' }} /> Reply
                            </button>
                        )}
                        {isOwn && !String(c.id).startsWith('temp-') && (
                            <>
                                <button type="button"
                                    onClick={() => isReply ? handleDeleteReply(c.parent, c.id) : setDeleteCommentId(c.id)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: '#aaa', cursor: 'pointer', fontSize: '0.7rem' }}>
                                    Delete
                                </button>
                                <button type="button" onClick={() => handleStartEditComment(c.id, commentBody, isReply ? c.parent : null)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: '#aaa', cursor: 'pointer', fontSize: '0.7rem' }}>
                                    Edit
                                </button>
                            </>
                        )}
                    </div>

                    {/* Inline reply form */}
                    {!isReply && replyingToId === c.id && (
                        <form onSubmit={(e) => handleAddReply(e, c.id, replyText, () => setReplyText(''), (t) => setReplyText(t))}
                            style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                            <CommentAvatar
                                src={user?.profile_picture || user?.profile_image || user?.avatar || ''}
                                name={user?.first_name || user?.username || ''}
                                size={24}
                            />
                            <input
                                type="text"
                                className="br0-25 b--none pa0-25"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Reply to ${authorName}…`}
                                disabled={replyLoading}
                                style={{ flex: 1, fontSize: '0.82rem' }}
                                autoFocus
                            />
                            <button type="submit"
                                className="pa0-25 br0-25 ba b--gold0 bg-gold0 brown0 b pointer"
                                disabled={replyLoading || !replyText.trim()}
                                style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                {replyLoading ? 'â€¦' : 'Reply'}
                            </button>
                        </form>
                    )}

                    {/* Nested replies */}
                    {
                        !isReply && c.replies && c.replies.length > 0 && (
                            <div style={
                                    { 
                                        marginTop: '8px', 
                                        paddingLeft: '4px', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '8px', 
                                        borderLeft: '2px solid rgba(245,166,35,0.25)' 
                                    }
                                }
                            >
                                {c.replies.map(reply => renderComment({ ...reply, parent: c.id }, true))}
                            </div>
                        )
                    }
                </div>
            </div>
        );
    };

    return (
        <div
            className="flex items-center justify-center
                fixed top-0 left-0
                w-100 h-100 "
            style={{ background: 'rgba(0,0,0,0.6)', zIndex: 2000 }}
            onClick={onClose}
            role="presentation"
        >
            <div
                className="bg-white flex flex-column"
                style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={`Comments for ${restaurant?.name}`}
            >
                {/* Header */}
                <div style={
                    { position: 'relative', 
                        height: '120px', 
                        flexShrink: 0
                    }
                    }
                >
                    <img src={coverImage} 
                        alt={restaurant?.name}
                        style={
                            { width: '100%', 
                            height: '100%', 
                            objectFit: 'cover', 
                            display: 'block' }} 
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.65))', display: 'flex', alignItems: 'flex-end', padding: '12px 16px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.2 }}
                            >
                                {restaurant?.name}
                            </h2>
                            <p  style={{ margin: 0, color: '#f5a623', fontSize: '0.78rem' }}>
                                {/* Count all comments and replies for display */}
                                {(() => {
                                    const countAll = (arr) => {
                                        if (!Array.isArray(arr)) return 0;
                                        let count = 0;
                                        for (const c of arr) {
                                            count += 1;
                                            if (Array.isArray(c.replies)) count += c.replies.length;
                                        }
                                        return count;
                                    };
                                    const total = countAll(comments);
                                    return `${total} comment${total !== 1 ? 's' : ''}`;
                                })()}
                            </p>
                        </div>
                        <button type="button" 
                            onClick={onClose} 
                            aria-label="Close"
                            style={{ background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', color: '#fff', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Comment list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}
                >
                    {commentsLoading ? (
                        <div className="tc pa1-00 brown1">Loading comments</div>
                    ) : comments.length === 0 ? (
                        <div className="tc pa1-00 gold0" 
                        >
                            No comments yet. Be the first!
                        </div>
                    ) : (
                        <div className="flex flex-column" 
                            style={{ gap: '14px' }}
                        >
                            {
                                (showAllComments 
                                ? comments 
                                : comments.slice(0, 10)).map(c => renderComment(c))
                            }
                            {comments.length > 10 && (
                                <button type="button"
                                    style={
                                        {   background: 'none', 
                                            border: 'none', 
                                            color: '#f5a623', 
                                            cursor: 'pointer', 
                                            fontSize: '0.8rem', 
                                            padding: '4px 0' 
                                        }
                                    }
                                    onClick={() => setShowAllComments(p => !p)}>
                                    {showAllComments 
                                        ? 'Show less' 
                                        : `View all ${comments.length} comments`}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Comment form */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', flexShrink: 0 }}>
                    <form className="flex w-100" style={{ gap: '8px', alignItems: 'center' }} onSubmit={handleAddComment}>
                        <CommentAvatar
                            src={user?.profile_picture || user?.profile_image || user?.avatar || ''}
                            name={user?.first_name || user?.username || ''}
                        />
                        <input
                            type="text"
                            className="w-100 br0-25 b--none pa0-25"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={user ? 'Write a comment' : 'Log in to comment'}
                            disabled={!user || commentLoading}
                            style={{ flex: 1 }}
                        />
                        <button type="submit"
                            className="pa0-25 br0-25 ba b--gold0 bg-gold0 brown0 b pointer"
                            disabled={!user || commentLoading || !commentText.trim()}
                        >
                            {commentLoading ? '…' : 'Post'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RestaurantCommentsModal;

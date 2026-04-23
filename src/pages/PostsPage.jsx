import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useApp } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaImage, FaVideo, FaGlobeAmericas, FaLock, FaUser, FaHeart, FaRegHeart, FaComment, FaShare, FaReply, FaChartBar, FaNewspaper, FaEye, FaEyeSlash, FaUtensils, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

// ─── helpers ────────────────────────────────────────────────────────────────

const API_POSTS    = (base) => `${base}/posts/posts/`;
const API_POST     = (base, id) => `${base}/posts/posts/${id}/`;
const API_LIKE     = (base, id) => `${base}/posts/posts/${id}/like/`;
const API_COMMENTS = (base, id) => `${base}/posts/posts/${id}/comments/`;
const API_COMMENT  = (base, postId, commentId) => `${base}/posts/posts/${postId}/comments/${commentId}/`;
const API_SHARE    = (base, id) => `${base}/posts/posts/${id}/share/`;
const API_MY_RESTAURANTS = (base) => `${base}/restaurants/my-restaurants/`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Token ${token}` } : {};
};

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const getImageUrl = (img) => {
  if (!img) return null;
  if (/^https?:/i.test(img) || img.startsWith('data:')) return img;
  const origin = (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api')
    .replace(/\/api\/?$/, '');
  return `${origin}${img.startsWith('/') ? img : `/${img}`}`;
};

const getAuthorName = (post) =>
  post?.restaurant_detail?.name || post?.user?.username || post?.user?.first_name || 'Unknown';

const getAuthorInitial = (post) =>
  (getAuthorName(post) || 'U').charAt(0).toUpperCase();

// ─── ImageLightbox ──────────────────────────────────────────────────────────

const ImageLightbox = ({ images, startIndex, onClose }) => {
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % images.length);
      if (e.key === 'ArrowLeft') setCurrent(c => (c - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          color: '#fff', width: 40, height: 40, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
        }}
        aria-label="Close"
      >
        <FaTimes />
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setCurrent(c => (c - 1 + images.length) % images.length); }}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            color: '#fff', width: 44, height: 44, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
          }}
          aria-label="Previous image"
        >
          <FaChevronLeft />
        </button>
      )}

      {/* Image */}
      <img
        src={images[current]}
        alt={`${current + 1} of ${images.length}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '88vh',
          objectFit: 'contain', borderRadius: 4,
          boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
          userSelect: 'none',
        }}
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setCurrent(c => (c + 1) % images.length); }}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
            color: '#fff', width: 44, height: 44, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
          }}
          aria-label="Next image"
        >
          <FaChevronRight />
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', letterSpacing: '0.05em',
        }}>
          {current + 1} / {images.length}
        </div>
      )}
    </div>
  );
};

// ─── sub-components ─────────────────────────────────────────────────────────

const AuthorAvatar = ({ post }) => {
  const [failed, setFailed] = useState(false);
  const src = getImageUrl(post?.user?.profile_picture);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={getAuthorName(post)}
        onError={() => setFailed(true)}
        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: 36, height: 36, borderRadius: '50%',
        background: '#5c3d2e', color: '#f5a623', fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: '0.95rem',
      }}
      aria-label={getAuthorName(post)}
    >
      {getAuthorInitial(post)}
    </div>
  );
};

// ─── PostsAside ──────────────────────────────────────────────────────────────

const PostsAside = ({ user, posts, API_BASE_URL }) => {
  const avatarSrc = user?.profile_picture
    ? (user.profile_picture.startsWith('http') ? user.profile_picture : `${API_BASE_URL.replace(/\/api\/?$/, '')}${user.profile_picture}`)
    : null;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  const myPosts  = posts.filter(p => p.user?.id === user?.id || p.user?.username === user?.username);
  const totalLikes    = myPosts.reduce((s, p) => s + (p.likes_count ?? 0), 0);
  const totalComments = myPosts.reduce((s, p) => s + (p.comments_count ?? 0), 0);
  const published     = myPosts.filter(p => p.is_published).length;
  const drafts        = myPosts.filter(p => !p.is_published).length;

  const statCard = (icon, label, value, color) => (
    <div style={{ background: '#fdfaf6', borderRadius: 8, padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <span style={{ color, fontSize: '1.1rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#5c3d2e', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: '#888', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <aside style={{ position: 'sticky', top: '5rem' }}>
      {/* User card */}
      <div className="shadow-4 br0-25 mb2-00" style={{ overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #5c3d2e 0%, #c8860a 100%)', height: 48 }} />
        <div style={{ padding: '0 1rem 1rem', marginTop: -24 }}>
          {avatarSrc && !avatarFailed ? (
            <img src={avatarSrc} alt={displayName} onError={() => setAvatarFailed(true)}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff', display: 'block' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#5c3d2e', color: '#f5a623', fontWeight: 700, fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff' }}>
              {initial}
            </div>
          )}
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ fontWeight: 700, color: '#5c3d2e', fontSize: '0.95rem' }}>{displayName}</div>
            {user?.username && <div style={{ fontSize: '0.78rem', color: '#888' }}>@{user.username}</div>}
            {user?.email && <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: 2 }}>{user.email}</div>}
            {user?.user_type && (
              <span style={{ display: 'inline-block', marginTop: 6, fontSize: '0.7rem', background: '#f3ece3', color: '#5c3d2e', borderRadius: 4, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {user.user_type.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Analytics card */}
      <div className="shadow-4 br0-25 pa1-25 mb2-00">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
          <FaChartBar style={{ color: '#c8860a' }} />
          <span style={{ fontWeight: 700, color: '#5c3d2e', fontSize: '0.9rem' }}>My Posts Analytics</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {statCard(<FaNewspaper />, 'Total posts',    myPosts.length,   '#5c3d2e')}
          {statCard(<FaHeart />,     'Total likes',    totalLikes,       '#e74c3c')}
          {statCard(<FaComment />,   'Total comments', totalComments,    '#3498db')}
          {statCard(<FaEye />,       'Published',      published,        '#27ae60')}
          {statCard(<FaEyeSlash />,  'Drafts',         drafts,           '#888')}
          {statCard(<FaShare />,     'Engagement',     totalLikes + totalComments, '#c8860a')}
        </div>
      </div>
    </aside>
  );
};

// ─── PostForm (create / edit) ────────────────────────────────────────────────

const EMPTY_FORM = { title: '', content: '', image: null, video: null, is_published: true };

// Determine the initial media tab when editing an existing post
const getInitialMediaType = (initial) => {
  if (!initial) return 'text';
  if (initial.video) return 'video';
  if (initial.images?.length > 0 || initial.image) return 'image';
  return 'text';
};

const PostForm = ({ initial, onSave, onCancel, saving, API_BASE_URL, currentUser }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [mediaType, setMediaType] = useState(() => getInitialMediaType(initial));
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState(new Set());
  const [videoPreview, setVideoPreview] = useState(null);
  const [restaurantId, setRestaurantId] = useState(initial?.restaurant ?? '');
  const [myRestaurants, setMyRestaurants] = useState([]);
  const imageRef = useRef();
  const videoRef = useRef();

  // Fetch restaurants owned by this user for the picker
  useEffect(() => {
    if (!API_BASE_URL || !currentUser) return;
    axios.get(API_MY_RESTAURANTS(API_BASE_URL), { headers: getAuthHeaders() })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setMyRestaurants(list);
      })
      .catch(() => {});
  }, [API_BASE_URL, currentUser]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const switchMediaType = (type) => {
    // Clear any pending media when switching tabs
    if (type !== 'image') {
      setImageFiles([]);
      setImagePreviews([]);
      setRemovedImageIds(new Set());
      if (imageRef.current) imageRef.current.value = '';
    }
    if (type !== 'video') {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
      setForm(prev => ({ ...prev, video: null }));
      if (videoRef.current) videoRef.current.value = '';
    }
    setMediaType(type);
  };

  const handleImageFiles = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
    setImageFiles(prev => [...prev, ...files]);
    if (imageRef.current) imageRef.current.value = '';
  };

  const removeNewImage = (idx) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = (id) => {
    setRemovedImageIds(prev => new Set([...prev, id]));
  };

  const handleVideoFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(prev => ({ ...prev, video: file }));
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
    setForm(prev => ({ ...prev, video: null }));
    if (videoRef.current) videoRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    const data = new FormData();
    data.append('title', form.title.trim());
    data.append('content', form.content.trim());
    data.append('is_published', form.is_published);
    if (restaurantId) data.append('restaurant', restaurantId);
    if (mediaType === 'image') {
      imageFiles.forEach(file => data.append('images', file));
      removedImageIds.forEach(id => data.append('remove_image_ids', id));
    }
    if (mediaType === 'video' && form.video instanceof File) data.append('video', form.video);
    onSave(data);
  };

  const existingImages = initial?.images || [];
  const existingVideo = initial ? getImageUrl(initial.video) : null;

  const tabStyle = (active) => ({
    flex: 1,
    padding: '0.45rem 0',
    border: 'none',
    borderBottom: active ? '2px solid #c8860a' : '2px solid transparent',
    background: 'transparent',
    color: active ? '#5c3d2e' : '#888',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    fontSize: '0.88rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    transition: 'color 0.15s, border-color 0.15s',
  });

  return (
    <form onSubmit={handleSubmit} className="bg-white pa2-00 br0-25 shadow-4 mb3-00">
      <div className="mb2-00">
        <label className="db fw6 mb0-50 brown0">Title</label>
        <input
          name="title"
          className="form-control"
          placeholder="Post title…"
          value={form.title}
          onChange={handleChange}
          maxLength={200}
          required
        />
      </div>

      <div className="mb2-00">
        <label className="db fw6 mb0-50 brown0">Content</label>
        <textarea
          name="content"
          className="form-control"
          placeholder="What's on your mind?"
          rows={4}
          value={form.content}
          onChange={handleChange}
          required
        />
      </div>

      {/* Media type selector */}
      <div className="mb1-50" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <div className="flex">
          <button type="button" style={tabStyle(mediaType === 'text')} onClick={() => switchMediaType('text')}>
            Text only
          </button>
          <button type="button" style={tabStyle(mediaType === 'image')} onClick={() => switchMediaType('image')}>
            <FaImage /> Image
          </button>
          <button type="button" style={tabStyle(mediaType === 'video')} onClick={() => switchMediaType('video')}>
            <FaVideo /> Video
          </button>
        </div>
      </div>

      {/* Image panel */}
      {mediaType === 'image' && (
        <div className="mb2-00">
          {(existingImages.filter(img => !removedImageIds.has(img.id)).length > 0 || imagePreviews.length > 0) ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {existingImages
                .filter(img => !removedImageIds.has(img.id))
                .map(img => (
                  <div key={img.id} style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                    <img src={getImageUrl(img.image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    <button type="button"
                      style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(220,53,69,0.9)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      onClick={() => removeExistingImage(img.id)} aria-label="Remove image">
                      <FaTimes style={{ fontSize: '0.6rem' }} />
                    </button>
                  </div>
                ))}
              {imagePreviews.map((src, idx) => (
                <div key={idx} style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  <button type="button"
                    style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(220,53,69,0.9)', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    onClick={() => removeNewImage(idx)} aria-label="Remove image">
                    <FaTimes style={{ fontSize: '0.6rem' }} />
                  </button>
                </div>
              ))}
              <div
                onClick={() => imageRef.current?.click()}
                style={{ width: 90, height: 90, border: '2px dashed #c8860a', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#c8860a', gap: '0.2rem', background: '#fdfaf6', flexShrink: 0 }}
              >
                <FaPlus />
                <span style={{ fontSize: '0.72rem' }}>Add more</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => imageRef.current?.click()}
              style={{ border: '2px dashed #c8860a', borderRadius: 8, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', color: '#888', background: '#fdfaf6', marginBottom: '0.5rem' }}
            >
              <FaImage style={{ fontSize: '2rem', marginBottom: '0.4rem', color: '#c8860a' }} />
              <div style={{ fontSize: '0.88rem' }}>Click to choose images</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>JPG, PNG, GIF, WebP… (select multiple)</div>
            </div>
          )}
          <input ref={imageRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageFiles} />
        </div>
      )}

      {/* Video panel */}
      {mediaType === 'video' && (
        <div className="mb2-00">
          {(videoPreview || existingVideo) ? (
            <div className="mb1-00 relative" style={{ maxWidth: 360 }}>
              <video
                src={videoPreview || existingVideo}
                controls
                style={{ width: '100%', borderRadius: 8, maxHeight: 200, background: '#000' }}
              />
              <button type="button" className="btn btn-sm btn-danger position-absolute"
                style={{ top: 4, right: 4 }} onClick={removeVideo} aria-label="Remove video">
                <FaTimes />
              </button>
            </div>
          ) : (
            <div
              onClick={() => videoRef.current?.click()}
              style={{
                border: '2px dashed #c8860a', borderRadius: 8, padding: '1.5rem',
                textAlign: 'center', cursor: 'pointer', color: '#888', background: '#fdfaf6',
              }}
            >
              <FaVideo style={{ fontSize: '2rem', marginBottom: '0.4rem', color: '#c8860a' }} />
              <div style={{ fontSize: '0.88rem' }}>Click to choose a video</div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>MP4, WebM, MOV…</div>
            </div>
          )}
          <input ref={videoRef} type="file" accept="video/*" className="d-none" onChange={handleVideoFile} />
          {(videoPreview || existingVideo) && (
            <button type="button" className="btn btn-outline-secondary btn-sm mt0-50"
              onClick={() => videoRef.current?.click()}>
              <FaVideo className="mr0-25" /> Change Video
            </button>
          )}
        </div>
      )}

      <div className="mb2-00 flex items-center gap-2">
        <input
          type="checkbox"
          id="is_published"
          name="is_published"
          checked={form.is_published}
          onChange={handleChange}
          className="form-check-input"
        />
        <label htmlFor="is_published" className="form-check-label brown0">
          {form.is_published ? <><FaGlobeAmericas className="mr0-25 text-success" /> Published</> : <><FaLock className="mr0-25 text-muted" /> Draft</>}
        </label>
      </div>

      {/* Post as restaurant */}
      {myRestaurants.length > 0 && (
        <div className="mb2-00">
          <label className="db fw6 mb0-50 brown0">
            <FaUtensils style={{ marginRight: '0.3rem' }} /> Post on behalf of
          </label>
          <select
            className="form-control"
            value={restaurantId}
            onChange={e => setRestaurantId(e.target.value)}
          >
            <option value="">Myself (personal post)</option>
            {myRestaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex ggap0-50">
        <button type="submit" className="btn btn-warning" disabled={saving}>
          {saving ? 'Saving…' : (initial ? 'Save Changes' : 'Post')}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
};

// ─── CommentItem ─────────────────────────────────────────────────────────────

const CommentItem = ({ comment, currentUser, onDelete, onReply }) => {
  const isOwner = currentUser && (
    currentUser.id === comment?.user?.id ||
    currentUser.username === comment?.user?.username
  );
  const [showReplies, setShowReplies] = useState(false);
  const avatarSrc = getImageUrl(comment?.user?.profile_picture);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const initial = (comment?.user?.username || 'U').charAt(0).toUpperCase();

  const avatar = avatarSrc && !avatarFailed ? (
    <img src={avatarSrc} alt={comment?.user?.username} onError={() => setAvatarFailed(true)}
      style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', background: '#5c3d2e',
      color: '#f5a623', fontWeight: 700, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, fontSize: '0.78rem',
    }}>{initial}</div>
  );

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div className="flex ggap0-50 items-start">
        {avatar}
        <div style={{ flex: 1, background: '#f8f4f0', borderRadius: 8, padding: '0.4rem 0.6rem' }}>
          <div className="flex justify-between items-center">
            <span className="fw6 brown0" style={{ fontSize: '0.82rem' }}>{comment?.user?.username || 'User'}</span>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>{formatDate(comment.created_at)}</span>
          </div>
          <p className="mb0-00 brown0" style={{ fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>{comment.content}</p>
        </div>
        <div className="flex ggap0-25 items-center" style={{ flexShrink: 0 }}>
          {onReply && (
            <button type="button" className="btn btn-sm btn-link text-muted p-0"
              style={{ fontSize: '0.78rem' }} onClick={() => onReply(comment)}>
              <FaReply />
            </button>
          )}
          {isOwner && (
            <button type="button" className="btn btn-sm btn-link text-danger p-0"
              style={{ fontSize: '0.78rem' }} onClick={() => onDelete(comment.id)}>
              <FaTrash />
            </button>
          )}
        </div>
      </div>
      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div style={{ marginLeft: '2rem', marginTop: '0.4rem' }}>
          <button type="button" className="btn btn-link btn-sm text-muted p-0" style={{ fontSize: '0.78rem' }}
            onClick={() => setShowReplies(v => !v)}>
            {showReplies ? 'Hide' : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
          </button>
          {showReplies && comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} currentUser={currentUser}
              onDelete={onDelete} onReply={null} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── CommentsPanel ────────────────────────────────────────────────────────────

const CommentsPanel = ({ postId, currentUser, API_BASE_URL, showToast, onCommentAdded, onCommentDeleted }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios.get(API_COMMENTS(API_BASE_URL, postId), { headers: getAuthHeaders() })
      .then(res => { if (mounted) setComments(res.data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [postId, API_BASE_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const payload = { content: text.trim() };
      if (replyTo) payload.parent = replyTo.id;
      const res = await axios.post(API_COMMENTS(API_BASE_URL, postId), payload, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      if (replyTo) {
        setComments(prev => prev.map(c =>
          c.id === replyTo.id
            ? { ...c, replies: [...(c.replies || []), res.data] }
            : c
        ));
      } else {
        setComments(prev => [res.data, ...prev]);
      }
      if (onCommentAdded) onCommentAdded();
      setText('');
      setReplyTo(null);
    } catch {
      if (showToast) showToast('Could not post comment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await axios.delete(API_COMMENT(API_BASE_URL, postId, commentId), { headers: getAuthHeaders() });
      setComments(prev => prev
        .filter(c => c.id !== commentId)
        .map(c => ({ ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }))
      );
      if (onCommentDeleted) onCommentDeleted();
    } catch {
      if (showToast) showToast('Could not delete comment.', 'error');
    }
  };

  return (
    <div style={{ borderTop: '1px solid #e8e0d8', paddingTop: '0.75rem' }}>
      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex ggap0-50 mb1-50 items-start">
        <div style={{ flex: 1 }}>
          {replyTo && (
            <div className="flex items-center ggap0-25 mb0-50" style={{ fontSize: '0.78rem', color: '#888' }}>
              <FaReply /> Replying to <strong>{replyTo.user?.username}</strong>
              <button type="button" className="btn btn-link btn-sm text-muted p-0 ms-1" onClick={() => setReplyTo(null)}>
                <FaTimes />
              </button>
            </div>
          )}
          <textarea
            className="form-control"
            rows={2}
            placeholder={replyTo ? `Reply to ${replyTo.user?.username}…` : 'Write a comment…'}
            value={text}
            onChange={e => setText(e.target.value)}
            style={{ fontSize: '0.88rem', resize: 'none' }}
          />
        </div>
        <button type="submit" className="btn btn-warning btn-sm" disabled={submitting || !text.trim()}>
          {submitting ? '…' : 'Post'}
        </button>
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="text-muted" style={{ fontSize: '0.82rem' }}>Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="text-muted" style={{ fontSize: '0.82rem' }}>No comments yet. Be the first!</div>
      ) : (
        comments.map(comment => (
          <CommentItem key={comment.id} comment={comment} currentUser={currentUser}
            onDelete={handleDelete} onReply={setReplyTo} />
        ))
      )}
    </div>
  );
};

// ─── PostCard ────────────────────────────────────────────────────────────────

const PostCard = ({ post, currentUser, onEdit, onDelete, API_BASE_URL, showToast, onLikeToggle }) => {
  const isOwner = currentUser && (currentUser.id === post?.user?.id || currentUser.username === post?.user?.username);
  const allImages = post.images?.length > 0
    ? post.images.map(img => getImageUrl(img.image))
    : (post.image ? [getImageUrl(post.image)] : []);
  const videoUrl = getImageUrl(post.video);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [liked, setLiked] = useState(post.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
  const [liking, setLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count ?? 0);
  const [copied, setCopied] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    // Optimistic update
    setLiked(!wasLiked);
    setLikesCount(c => wasLiked ? c - 1 : c + 1);
    try {
      if (wasLiked) {
        await axios.delete(API_LIKE(API_BASE_URL, post.id), { headers: getAuthHeaders() });
      } else {
        await axios.post(API_LIKE(API_BASE_URL, post.id), {}, { headers: getAuthHeaders() });
      }
      if (onLikeToggle) onLikeToggle(post.id, !wasLiked);
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setLikesCount(c => wasLiked ? c + 1 : c - 1);
      if (showToast) showToast('Could not update like.', 'error');
    } finally {
      setLiking(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/posts#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Notify the post owner (fire-and-forget)
      axios.post(API_SHARE(API_BASE_URL, post.id), {}, { headers: getAuthHeaders() }).catch(() => {});
    } catch {
      if (showToast) showToast('Could not copy link.', 'error');
    }
  };

  const handleToggleComments = () => {
    setShowComments(v => !v);
  };

  return (
    <article id={`post-${post.id}`} className="bg-white br0-25 shadow-4 mb3-00 overflow-hidden">
      {lightboxIndex !== null && (
        <ImageLightbox images={allImages} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
      {/* header row */}
        <div className="flex justify-between items-start mb1-00">
          <div className="flex items-center ggap0-50">
            <AuthorAvatar post={post} />
            <div>
              <div className="fw6 brown0" style={{ fontSize: '0.95rem' }}>
                {post.restaurant_detail ? (
                  <span style={{ color: '#c8860a' }}>
                    <FaUtensils style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
                    {post.restaurant_detail.name}
                  </span>
                ) : (
                  getAuthorName(post)
                )}
              </div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                {formatDate(post.created_at)}
                {new Date(post.updated_at).getTime() !== new Date(post.created_at).getTime() && <span className="ms-1 fst-italic"> · edited</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center ggap0-50">
            <span className={`badge ${post.is_published ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '0.72rem' }}>
              {post.is_published ? <><FaGlobeAmericas /> Published</> : <><FaLock /> Draft</>}
            </span>
            {isOwner && (
              <div className="flex ggap0-25">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => onEdit(post)} aria-label="Edit post"><FaEdit /></button>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => onDelete(post.id)} aria-label="Delete post"><FaTrash /></button>
              </div>
            )}
          </div>
        </div>
        <h2 className="f1-25 fw7 brown0 mb0-50">{post.title}</h2>
        <p className="brown0 lh-copy mb1-00" style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>

      {allImages.length === 1 && (
        <img src={allImages[0]} alt={post.title} onClick={() => setLightboxIndex(0)}
          style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} />
      )}
      {allImages.length === 2 && (
        <div style={{ display: 'flex', height: 240, gap: 2 }}>
          {allImages.map((src, i) => (
            <div key={i} onClick={() => setLightboxIndex(i)} style={{ flex: '1 1 50%', position: 'relative', overflow: 'hidden', minWidth: 0, cursor: 'zoom-in' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
        </div>
      )}
      {allImages.length === 3 && (
        <div style={{ display: 'flex', height: 260, gap: 2 }}>
          <div onClick={() => setLightboxIndex(0)} style={{ flex: '2 1 0', overflow: 'hidden', minWidth: 0, cursor: 'zoom-in' }}>
            <img src={allImages[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            {allImages.slice(1).map((src, i) => (
              <div key={i} onClick={() => setLightboxIndex(i + 1)} style={{ flex: 1, overflow: 'hidden', cursor: 'zoom-in' }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        </div>
      )}
      {allImages.length >= 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: 280, gap: 2 }}>
          {allImages.slice(0, 4).map((src, i) => (
            <div key={i} onClick={() => setLightboxIndex(i)} style={{ position: 'relative', overflow: 'hidden', cursor: 'zoom-in' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {i === 3 && allImages.length > 4 && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.5rem', cursor: 'zoom-in' }}>
                  +{allImages.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {videoUrl && (
        <video
          src={videoUrl}
          controls
          style={{ width: '100%', maxHeight: 360, display: 'block', background: '#000' }}
        />
      )}
      <div className="pa2-00">
        

        
        {/* Action bar: like / comment / share */}
        <div className="flex items-center ggap0-75" style={{ borderTop: '1px solid #e8e0d8', paddingTop: '0.6rem', marginTop: '0.25rem' }}>
          {/* Like */}
          <button
            type="button"
            className="btn btn-sm btn-link p-0 flex items-center ggap0-25"
            style={{ color: liked ? '#e74c3c' : '#888', textDecoration: 'none', fontWeight: liked ? 700 : 400 }}
            onClick={handleLike}
            disabled={liking}
            aria-label={liked ? 'Unlike post' : 'Like post'}
          >
            {liked ? <FaHeart /> : <FaRegHeart />}
            <span style={{ fontSize: '0.85rem' }}>Like{likesCount > 0 ? ` (${likesCount})` : ''}</span>
          </button>

          {/* Comment */}
          <button
            type="button"
            className="btn btn-sm btn-link p-0 flex items-center ggap0-25"
            style={{ color: showComments ? '#5c3d2e' : '#888', textDecoration: 'none' }}
            onClick={handleToggleComments}
            aria-label="Toggle comments"
          >
            <FaComment />
            <span style={{ fontSize: '0.85rem' }}>Comment{commentsCount > 0 ? ` (${commentsCount})` : ''}</span>
          </button>

          {/* Share (copy link) */}
          <button
            type="button"
            className="btn btn-sm btn-link p-0 flex items-center ggap0-25"
            style={{ color: copied ? '#27ae60' : '#888', textDecoration: 'none' }}
            onClick={handleShare}
            aria-label="Copy link to post"
          >
            <FaShare />
            <span style={{ fontSize: '0.85rem' }}>{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Comments panel */}
        {showComments && (
          <div className="mt1-00">
            <CommentsPanel
              postId={post.id}
              currentUser={currentUser}
              API_BASE_URL={API_BASE_URL}
              showToast={showToast}
              onCommentAdded={() => setCommentsCount(c => c + 1)}
              onCommentDeleted={() => setCommentsCount(c => Math.max(0, c - 1))}
            />
          </div>
        )}
      </div>
    </article>
  );
};

// ─── PostsPage ───────────────────────────────────────────────────────────────

const PostsPage = () => {
    const { user, API_BASE_URL, showToast, authLoading } = useApp();
    const navigate = useNavigate();
    const location = useLocation();

    // Read ?filter=mine from URL to pre-activate my-posts filter
    const filterParam = new URLSearchParams(location.search).get('filter');

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextUrl, setNextUrl] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // my posts filter — sync with ?filter=mine query param
    const [myPostsOnly, setMyPostsOnly] = useState(filterParam === 'mine');

    useEffect(() => {
        setMyPostsOnly(filterParam === 'mine');
    }, [filterParam]);

    // create / edit form
    const [showCreate, setShowCreate] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [saving, setSaving] = useState(false);

    // delete confirm
    const [deletingId, setDeletingId] = useState(null);

    // redirect guests — wait until auth restore finishes
    useEffect(() => {
        if (!authLoading && user === null) navigate('/login');
    }, [authLoading, user, navigate]);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
        const params = myPostsOnly && user ? { user: user.id } : {};
        const res = await axios.get(API_POSTS(API_BASE_URL), {
            headers: getAuthHeaders(),
            params,
        });
        const data = res.data;
        if (Array.isArray(data)) {
            setPosts(data);
            setNextUrl(null);
        } else {
            setPosts(data.results || []);
            setNextUrl(data.next || null);
        }
        } catch (err) {
        setError('Failed to load posts. Please try again.');
        } finally {
        setLoading(false);
        }
    }, [API_BASE_URL, myPostsOnly, user]);

    useEffect(() => { if (!authLoading) fetchPosts(); }, [fetchPosts, authLoading]);

    const loadMore = async () => {
        if (!nextUrl || loadingMore) return;
        setLoadingMore(true);
        try {
        const res = await axios.get(nextUrl, { headers: getAuthHeaders() });
        const data = res.data;
        setPosts(prev => [...prev, ...(Array.isArray(data) ? data : data.results || [])]);
        setNextUrl(Array.isArray(data) ? null : data.next || null);
        } catch {
        if (showToast) showToast('Failed to load more posts.', 'error');
        } finally {
        setLoadingMore(false);
        }
    };

    const handleCreate = async (formData) => {
        setSaving(true);
        try {
        const res = await axios.post(API_POSTS(API_BASE_URL), formData, {
            headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
        });
        setPosts(prev => [res.data, ...prev]);
        setShowCreate(false);
        if (showToast) showToast('Post created!', 'success');
        } catch (err) {
        if (showToast) showToast(err?.response?.data?.detail || 'Could not create post.', 'error');
        } finally {
        setSaving(false);
        }
    };

    const handleEdit = async (formData) => {
        if (!editingPost) return;
        setSaving(true);
        try {
        const res = await axios.patch(API_POST(API_BASE_URL, editingPost.id), formData, {
            headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
        });
        setPosts(prev => prev.map(p => p.id === editingPost.id ? res.data : p));
        setEditingPost(null);
        if (showToast) showToast('Post updated!', 'success');
        } catch (err) {
        if (showToast) showToast(err?.response?.data?.detail || 'Could not update post.', 'error');
        } finally {
        setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
        await axios.delete(API_POST(API_BASE_URL, id), { headers: getAuthHeaders() });
        setPosts(prev => prev.filter(p => p.id !== id));
        if (showToast) showToast('Post deleted.', 'success');
        } catch (err) {
        if (showToast) showToast(err?.response?.data?.detail || 'Could not delete post.', 'error');
        } finally {
        setDeletingId(null);
        }
    };

    // skeleton cards while loading
    if (loading) {
        return (
        <div className="container container90 mt-4" style={{ maxWidth: 720 }}>
            <div className="skeleton-page-title mb-3" style={{ width: '40%' }} />
            {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white br0-25 shadow-4 mb3-00 pa2-00">
                <div className="skeleton-title mb-2" />
                <div className="skeleton-text mb-1" />
                <div className="skeleton-text mb-1" />
                <div className="skeleton-text-short" />
            </div>
            ))}
        </div>
        );
    }

    return (
        <div className="grid gtc4 container container90" 
        >
            {/* Page header */}
            <div className="gc1s4 
                flex justify-between items-center flex-wrap ggap0-50 
                mv2-00 pa1-00
                bg-brown0
                b"
            >
                <h1 className="mv0-00 gold0">
                Posts
                </h1>
                <button
                type="button"
                className="btn btn-warning"
                onClick={() => { setShowCreate(true); setEditingPost(null); }}
                >
                <FaPlus className="mr0-25" /> New Post
                </button>
            </div> 
            
            <div className="gc1s1 w-100">
                <PostsAside user={user} 
                    posts={posts} 
                    API_BASE_URL={API_BASE_URL}
                />
            </div>
            <div className="gc2s3 w-100 grid gtc3"
            >
                <div className="gc1s2">
                    {/* Filter: my posts */}
                    <div className="flex items-center ggap0-50 mb3-00">
                        <button
                        type="button"
                        className={`btn btn-sm ${!myPostsOnly ? 'btn-warning' : 'btn-outline-secondary'}`}
                        onClick={() => setMyPostsOnly(false)}
                        >
                        All Posts
                        </button>
                        <button
                        type="button"
                        className={`btn btn-sm ${myPostsOnly ? 'btn-warning' : 'btn-outline-secondary'}`}
                        onClick={() => setMyPostsOnly(true)}
                        >
                        <FaUser className="mr0-25" /> My Posts
                        </button>
                    </div>

                    {/* Create post modal */}
                    {showCreate && (
                        <div
                            role="dialog"
                            aria-modal="true"
                            style={{
                                position: 'fixed', inset: 0, zIndex: 1000,
                                background: 'rgba(0,0,0,0.45)',
                                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                                padding: '2rem 1rem',
                                overflowY: 'auto',
                            }}
                            onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
                            onKeyDown={(e) => { if (e.key === 'Escape') setShowCreate(false); }}
                        >
                            <div style={{ width: '100%', maxWidth: 680, background: '#fff', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #e8e0d8' }}>
                                    <h5 style={{ margin: 0, fontWeight: 700, color: '#5c3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <FaPlus /> New Post
                                    </h5>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        disabled={saving}
                                        aria-label="Close"
                                        style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#888', lineHeight: 1 }}
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                                <div style={{ padding: '1.25rem' }}>
                                    <PostForm
                                        onSave={handleCreate}
                                        onCancel={() => setShowCreate(false)}
                                        saving={saving}
                                        API_BASE_URL={API_BASE_URL}
                                        currentUser={user}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="alert alert-danger alert-dismissible" role="alert">
                        {error}
                        <button type="button" className="btn-close" onClick={() => { setError(null); fetchPosts(); }} aria-label="Retry" />
                        </div>
                    )}

                    {/* Post list */}
                    {
                        posts.length === 0 && !error ? (
                            <div className="text-center py-5 text-muted">
                            <p className="fs-5">No posts yet.</p>
                                {myPostsOnly && (
                                <p>
                                    You haven't published anything. Hit <strong>New Post</strong> to get started.
                                </p>
                            )}
                            </div>
                        ) : (
                                posts.map(post => (
                                    editingPost?.id === post.id ? (
                                        <PostForm
                                            key={post.id}
                                            initial={editingPost}
                                            onSave={handleEdit}
                                            onCancel={() => setEditingPost(null)}
                                            saving={saving}
                                            API_BASE_URL={API_BASE_URL}
                                            currentUser={user}
                                        />
                                    ) : (
                                        <PostCard
                                        key={post.id}
                                        post={post}
                                        currentUser={user}
                                        onEdit={(p) => { setEditingPost(p); setShowCreate(false); }}
                                        onDelete={(id) => { if (deletingId !== id) handleDelete(id); }}
                                        API_BASE_URL={API_BASE_URL}
                                        showToast={showToast}
                                        />
                                    )
                                )
                            )
                        )
                    }

                    {/* Load more */}
                    {
                        nextUrl && (
                            <div className="tc mb3-00"
                            >
                                <button
                                    type="button"
                                    className=""
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? 'Loading…' : 'Load more'}
                                </button>
                            </div>
                        )
                    }
                </div>
                <aside className="gc3s1 ml1-00">
                    <div className="ba min-h-10 mb1-00">

                    </div>
                    <div className="ba min-h-10 mb1-00">

                    </div>
                    <div className="ba min-h-10">

                    </div>
                </aside>
            </div>
        </div>
    );
};

export default PostsPage;

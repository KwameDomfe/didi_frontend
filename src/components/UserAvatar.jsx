import { useEffect, useState } from 'react';

const UserAvatar = ({ src, name, initials, sizePx = '40px', marginClass = 'mr0-50', fallbackBg = 'bg-blue0', fallbackText = 'white' }) => {
    const [hasImageError, setHasImageError] = useState(false);
    const sizeStyle = { width: sizePx, height: sizePx, objectFit: 'cover' };
    const normalizedInitials = (initials || '').trim();
    const normalizedName = (name || '').trim();
    const fallbackInitial = normalizedName ? normalizedName.charAt(0).toUpperCase() : 'U';
    const displayInitials = normalizedInitials || fallbackInitial;

    useEffect(() => {
        setHasImageError(false);
    }, [src]);

    if (src && !hasImageError) {
        return (
            <img
                src={src}
                alt={name || 'User'}
                className={`br0-25 ${marginClass}`}
                style={sizeStyle}
                onError={() => setHasImageError(true)}
            />
        );
    }

    return (
        <div
            className={`flex items-center justify-center white
                    br-100 ${fallbackBg} ${fallbackText} ${marginClass} 
                    b pa0-50 
                    f2-00`}
        >
            {displayInitials}
        </div>
    );
};

export default UserAvatar;

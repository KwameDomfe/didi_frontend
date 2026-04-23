import UserAvatar from './UserAvatar';

const UserInfoBlock = ({ src, name, email, initials, sizePx = '40px', marginClass = 'mr0-50', fallbackBg = 'bg-blue0', fallbackText = 'white' }) => (
    <div className="flex items-center">
        <UserAvatar
            src={src}
            name={name}
            initials={initials}
            sizePx={sizePx}
            marginClass={marginClass}
            fallbackBg={fallbackBg}
            fallbackText={fallbackText}
        />
        <div className="ml0-50 flex flex-column justify-center gold0">
            <div className="fw-bold">{name}</div>
            <small className="text-muted">{email}</small>
        </div>
    </div>
);

export default UserInfoBlock;

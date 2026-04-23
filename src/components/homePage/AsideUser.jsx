
import { Link } from "react-router-dom"
import { useApp } from '../../App';

const AsideUser = ({
    loadAnalyticsCounts,
    analyticsLoading,
    analyticsStatusClass,
    analyticsStatusLabel,
    analyticsHint,
    socialAnalyticsHint,
    userAnalytics
}) => {
    const { user } = useApp();
    return (
        <aside className="gc1s1">
            <div className="shadow-4 pa0-50 mb1-00 br0-25 ba bg-white brown0 b--gold0">
                {
                    user 
                    ?   (
                        <div>
                            {user.profile_picture && (
                                <img
                                    src={user.profile_picture}
                                    alt="Profile"
                                    className="rounded-circle mb-2"
                                    style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                                />
                            )}
                            {!user.profile_picture && (
                                <div
                                    className="rounded-circle bg-brown0 gold0 d-flex align-items-center justify-content-center mb-2"
                                    style={{ width: '56px', height: '56px', fontSize: '1.4rem', fontWeight: 600 }}
                                >
                                    {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                                </div>
                            )}
                            <div className="fw-bold">
                                {user.first_name || user.last_name
                                    ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                                    : user.username || 'User'}
                            </div>
                            <div className="text-muted small">{user.email}</div>
                            {user.phone_number && (
                                <div className="text-muted small">{user.phone_number}</div>
                            )}
                            {user.user_type && (
                                <span className=" mt-1 ttu text-muted small d-inline-block bg-black-10
                                pa0-25" 
                                    >
                                    {user.user_type.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>
                    ) 
                    : 
                        (
                        <div className="tc"
                        >
                            Not logged in
                        </div>
                    )
                }
            </div>

            <div className="shadow-4 pa0-50 mb1-00 br0-25 ba bg-white brown0 b--gold0">
                <div className="d-flex justify-content-between align-items-center mb0-50">
                    <div className="fw-bold">
                        Analytics
                    </div>
                    <button
                        type="button"
                        className="ba pa0-25 br0-25 bg-transparent brown0 b--brown0 pointer"
                        onClick={loadAnalyticsCounts}
                        disabled={analyticsLoading}
                        aria-label="Refresh analytics"
                    >
                        {analyticsLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
                <div className="small text-muted mb0-50">
                    Live data snapshot
                </div>
                <div className={`small mb0-50 ${analyticsStatusClass}`}>
                    {analyticsStatusLabel}
                </div>
                <div className="small text-muted mb0-50">
                    {analyticsHint}
                </div>
                <div className="small text-muted mb0-50">
                    {socialAnalyticsHint}
                </div>
                <div
                    className="grid"
                    style={{
                        gap: '0.5rem',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))'
                    }}
                >
                    {userAnalytics.map((metric) => (
                    <Link
                        key={metric.label}
                        to={metric.to}
                        className="flex flex-column items-center 
                            bg-gold5 brown0 ba b--gold0 br0-25 
                            pa0-50 
                            no-underline"
                        aria-label={`${metric.label}: ${metric.value}`}
                    >
                        <div className="flex justify-between items-center w-100 mb0-50">
                            <span className="">{metric.label}</span>
                            <span className="b f1-25" style={{ lineHeight: 1.2 }}
                            >
                                {metric.value}
                            </span>  
                        </div>
                        <span className="ba pa0-25 br0-25 bg-brown0 gold0">{metric.helper}</span>
                    </Link>
                    ))}
                </div>
            </div>
            
            <div className="shadow-4 pa0-50 mb2-00 br0-25">
                Subscriptions
            </div>

        </aside>
    )
}

export default AsideUser
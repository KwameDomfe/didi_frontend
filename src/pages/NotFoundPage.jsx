import { Link, useLocation } from 'react-router-dom';

const NotFoundPage = () => {
    const location = useLocation();

    return (
        <div className="container container90 pv4-00 tc blue0"
        >
            <div className="f6-00 b" aria-hidden="true">
                404
            </div>
            <h1 className="mb-2">
                Page not found
            </h1>
            <p className="lead text-muted mb-3">
                We could not find the page you requested.
            </p>
            <p className="small text-muted mb-4">
                Requested path: <span className="red">{location.pathname}</span>
            </p>
            <div className="flex justify-center ggap2-00">
                <Link to="/" className="blue0 b ba br0-25 pa0-25">Go Home</Link>
                <Link to="/restaurants" className="blue0 b ba br0-25 pa0-25">Browse Restaurants</Link>
                <Link to="/menu" className="blue0 b ba br0-25 pa0-25">View Menu</Link>
            </div>
        </div>
    );
};

export default NotFoundPage;

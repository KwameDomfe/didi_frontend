const LogoutConfirmModal = ({ isOpen, onCancel, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed top-0 left-0 w-100 h-100 flex items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.45)', zIndex: 3000 }}
            onClick={onCancel}
            role="presentation"
        >
            <div
                className="bg-brown0 white pa1-00 br0-50 shadow-5 w-100"
                style={{ maxWidth: '24rem' }}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-confirm-title"
                aria-describedby="logout-confirm-description"
            >
                <h3 id="logout-confirm-title" className="ma0 mb0-50 f1-00">
                    Confirm Logout
                </h3>
                <p id="logout-confirm-description" className="ma0 mb1-00 white-80 lh-copy">
                    Are you sure you want to log out?
                </p>
                <div className="flex justify-end" style={{ gap: '0.5rem' }}>
                    <button
                        type="button"
                        className="pa0-50 br0-25 ba b--gold0 bg-transparent gold0 pointer"
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="pa0-50 br0-25 brown0
                            ba b--gold0 bg-gold0 b 
                            pointer"
                        onClick={onConfirm}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirmModal;

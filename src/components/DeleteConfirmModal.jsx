const DeleteConfirmModal = ({ isOpen, onCancel, onConfirm, itemName }) => {
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
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-confirm-title"
                aria-describedby="delete-confirm-description"
            >
                <h3 id="delete-confirm-title" className="ma0 mb0-50 f1-00">
                    Delete {itemName || 'this item'}?
                </h3>
                <p id="delete-confirm-description" className="ma0 mb1-00 white-80 lh-copy">
                    This action cannot be undone.
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
                        className="pa0-50 br0-25 ba b--red0 bg-red0 red b pointer"
                        onClick={onConfirm}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;

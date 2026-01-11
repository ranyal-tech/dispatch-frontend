import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  const showNotification = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);
    }
  }, []);

  const confirm = useCallback((message, onConfirm, title = 'Confirm Action') => {
    return new Promise((resolve) => {
      setConfirmModal({
        title,
        message,
        onConfirm: () => {
          setConfirmModal(null);
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          setConfirmModal(null);
          resolve(false);
        },
      });
    });
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, confirm }}>
      {children}
      
      {/* Notifications Overlay */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none w-80">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 transition-all animate-slide-in ${
              n.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-900 shadow-emerald-500/10' :
              n.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-900 shadow-red-500/10' :
              n.type === 'warning' ? 'bg-amber-50/90 border-amber-100 text-amber-900 shadow-amber-500/10' :
              'bg-indigo-50/90 border-indigo-100 text-indigo-900 shadow-indigo-500/10'
            }`}
          >
            <div className={`mt-0.5 rounded-full p-1 ${
              n.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
              n.type === 'error' ? 'bg-red-100 text-red-600' :
              n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
              'bg-indigo-100 text-indigo-600'
            }`}>
              {n.type === 'success' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
              {n.type === 'error' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {n.type === 'warning' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
              {n.type === 'info' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight">{n.message}</p>
            </div>
            <button 
              onClick={() => removeNotification(n.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal Overlay */}
      {confirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in" 
            onClick={confirmModal.onCancel}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden animate-zoom-in">
            <div className="p-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="bg-gray-50 border-t border-gray-100 p-4 flex gap-3 justify-end">
              <button
                onClick={confirmModal.onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 rounded-lg transition-all active:scale-95"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

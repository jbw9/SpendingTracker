import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, installApp, dismissInstallPrompt } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Show banner after 30 seconds if installable
    if (isInstallable) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await installApp();
    if (success) {
      setShowBanner(false);
    }
    setIsInstalling(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    dismissInstallPrompt();
  };

  if (!showBanner || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  Install Spending Tracker
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Install our app for a better experience with offline access and faster loading
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-3 mt-4">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Also export a minimal install button that can be used in the app header or settings
export const PWAInstallButton: React.FC = () => {
  const { isInstallable, installApp } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    await installApp();
    setIsInstalling(false);
  };

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4 mr-1.5" />
      {isInstalling ? 'Installing...' : 'Install App'}
    </button>
  );
};
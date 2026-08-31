'use client';

import { useEffect, useState } from 'react';

export default function PWADebug() {
  const [debugInfo, setDebugInfo] = useState<{
    manifest: object | null | { error: string };
    serviceWorker: object | null;
    https: boolean;
    standalone: boolean;
    installable: boolean;
    installPromptSupported?: boolean;
  }>({
    manifest: null,
    serviceWorker: null,
    https: false,
    standalone: false,
    installable: false,
  });

  useEffect(() => {
    const checkPWA = async () => {
      const info: {
        manifest?: object | null | { error: string };
        serviceWorker?: object | null;
        https?: boolean;
        standalone?: boolean;
        installable?: boolean;
        installPromptSupported?: boolean;
      } = {};
      info.https = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          info.serviceWorker = { supported: true, registrations: registrations.length, active: registrations.some(reg => reg.active) };
        } catch (e) {
          info.serviceWorker = { error: e instanceof Error ? e.message : 'Unknown error' };
        }
      } else {
        info.serviceWorker = { supported: false };
      }
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        try {
          const response = await fetch(manifestLink.getAttribute('href') || '');
          const manifest = await response.json();
          info.manifest = manifest;
        } catch (e) {
          info.manifest = { error: e instanceof Error ? e.message : 'Unknown error' };
        }
      } else {
        info.manifest = { error: 'No manifest link found' };
      }
      info.standalone = window.matchMedia('(display-mode: standalone)').matches;
      info.installPromptSupported = 'onbeforeinstallprompt' in window;
      setDebugInfo({
        manifest: info.manifest || null,
        serviceWorker: info.serviceWorker || null,
        https: info.https || false,
        standalone: info.standalone || false,
        installable: info.installable || false,
        installPromptSupported: info.installPromptSupported,
      });
    };
    checkPWA();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PWA Debug Info</h1>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Basic Checks</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${debugInfo.https ? 'bg-green-500' : 'bg-red-500'}`}></span>
                HTTPS: {debugInfo.https ? 'Yes' : 'No'}
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${debugInfo.serviceWorker ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Service Worker: {JSON.stringify(debugInfo.serviceWorker, null, 2)}
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${debugInfo.standalone ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                Standalone: {debugInfo.standalone ? 'Yes' : 'No'}
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${debugInfo.installPromptSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Install Prompt: {debugInfo.installPromptSupported ? 'Supported' : 'Not Supported'}
              </li>
            </ul>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Manifest</h2>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
              {JSON.stringify(debugInfo.manifest, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

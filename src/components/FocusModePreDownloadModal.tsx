'use client';

import React from 'react';
import { MappedPixel } from '../utils/pixelation';
import { ColorSystem } from '../utils/colorSystemUtils';
import { exportCsvData } from '../utils/imageDownloader';
import { useTranslations } from 'next-intl';

interface FocusModePreDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedWithoutDownload: () => void;
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  selectedColorSystem: ColorSystem;
}

const FocusModePreDownloadModal: React.FC<FocusModePreDownloadModalProps> = ({
  isOpen,
  onClose,
  onProceedWithoutDownload,
  mappedPixelData,
  gridDimensions,
  selectedColorSystem
}) => {
  const t = useTranslations('focusPreDownload');
  if (!isOpen) return null;

  const handleDownloadAndProceed = () => {
    // 下载CSV数据文件
    exportCsvData({
      mappedPixelData,
      gridDimensions,
      selectedColorSystem
    });
    
    // 稍等一下让下载开始，然后进入专心拼豆模式
    setTimeout(() => {
      onProceedWithoutDownload();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
        {/* 标题 */}
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h3>
        </div>

        {/* 提醒内容 */}
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">{t('importantReminder')}</p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  {t('warningText')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p>{t('features')}</p>
            <ul className="text-xs space-y-1 text-gray-500 dark:text-gray-400">
              <li>• {t('feature1')}</li>
              <li>• {t('feature2')}</li>
              <li>• {t('feature3')}</li>
              <li>• {t('feature4')}</li>
            </ul>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col space-y-2 pt-4">
          <button
            onClick={handleDownloadAndProceed}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{t('downloadAndEnter')}</span>
          </button>
          
          <button
            onClick={onProceedWithoutDownload}
            className="w-full py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-all duration-200"
          >
            {t('enterDirectly')}
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusModePreDownloadModal; 
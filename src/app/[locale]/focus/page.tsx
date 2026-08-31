'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MappedPixel } from '../../../utils/pixelation';
import { 
  getAllConnectedRegions, 
  isRegionCompleted, 
  getRegionCenter, 
  sortRegionsByDistance, 
  sortRegionsBySize,
  getConnectedRegion
} from '../../../utils/floodFillUtils';
import FocusCanvas from '../../../components/FocusCanvas';
import ColorStatusBar from '../../../components/ColorStatusBar';
import ProgressBar from '../../../components/ProgressBar';
import ToolBar from '../../../components/ToolBar';
import ColorPanel from '../../../components/ColorPanel';
import SettingsPanel from '../../../components/SettingsPanel';
import CelebrationAnimation from '../../../components/CelebrationAnimation';
import CompletionCard from '../../../components/CompletionCard';
import { getColorKeyByHex, ColorSystem } from '../../../utils/colorSystemUtils';

interface FocusModeState {
  currentColor: string;
  selectedCell: { row: number; col: number } | null;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  completedCells: Set<string>;
  colorProgress: Record<string, { completed: number; total: number }>;
  recommendedRegion: { row: number; col: number }[] | null;
  recommendedCell: { row: number; col: number } | null;
  guidanceMode: 'nearest' | 'largest' | 'edge-first';
  showColorPanel: boolean;
  showSettingsPanel: boolean;
  isPaused: boolean;
  startTime: number;
  totalElapsedTime: number;
  lastResumeTime: number;
  gridSectionInterval: number;
  showSectionLines: boolean;
  sectionLineColor: string;
  enableCelebration: boolean;
  showCelebration: boolean;
  showCompletionCard: boolean;
}

export default function FocusMode() {
  const [mappedPixelData, setMappedPixelData] = useState<MappedPixel[][] | null>(null);
  const [gridDimensions, setGridDimensions] = useState<{ N: number; M: number } | null>(null);
  const [focusState, setFocusState] = useState<FocusModeState>({
    currentColor: '',
    selectedCell: null,
    canvasScale: 1,
    canvasOffset: { x: 0, y: 0 },
    completedCells: new Set<string>(),
    colorProgress: {},
    recommendedRegion: null,
    recommendedCell: null,
    guidanceMode: 'nearest',
    showColorPanel: false,
    showSettingsPanel: false,
    isPaused: false,
    startTime: Date.now(),
    totalElapsedTime: 0,
    lastResumeTime: Date.now(),
    gridSectionInterval: 10,
    showSectionLines: true,
    sectionLineColor: '#007acc',
    enableCelebration: true,
    showCelebration: false,
    showCompletionCard: false
  });
  const [availableColors, setAvailableColors] = useState<Array<{
    color: string;
    name: string;
    total: number;
    completed: number;
  }>>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (!focusState.isPaused) {
      interval = setInterval(() => {
        setFocusState(prev => {
          const now = Date.now();
          const elapsed = Math.floor((now - prev.lastResumeTime) / 1000);
          return { ...prev, totalElapsedTime: prev.totalElapsedTime + elapsed, lastResumeTime: now };
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [focusState.isPaused]);

  useEffect(() => {
    const savedPixelData = localStorage.getItem('focusMode_pixelData');
    const savedGridDimensions = localStorage.getItem('focusMode_gridDimensions');
    const savedColorCounts = localStorage.getItem('focusMode_colorCounts');
    const savedColorSystem = localStorage.getItem('focusMode_selectedColorSystem');
    if (savedPixelData && savedGridDimensions && savedColorCounts) {
      try {
        const pixelData = JSON.parse(savedPixelData);
        const dimensions = JSON.parse(savedGridDimensions);
        const colorCounts = JSON.parse(savedColorCounts);
        setMappedPixelData(pixelData);
        setGridDimensions(dimensions);
        const colors = Object.entries(colorCounts).map(([, colorData]) => {
          const data = colorData as { color: string; count: number };
          const displayKey = getColorKeyByHex(data.color, savedColorSystem as ColorSystem || 'MARD');
          return { color: data.color, name: displayKey, total: data.count, completed: 0 };
        });
        setAvailableColors(colors);
        if (colors.length > 0) {
          setFocusState(prev => ({
            ...prev,
            currentColor: colors[0].color,
            colorProgress: colors.reduce((acc, color) => ({ ...acc, [color.color]: { completed: 0, total: color.total } }), {})
          }));
        }
      } catch (error) {
        console.error('Failed to load focus mode data:', error);
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  }, []);

  const calculateRecommendedRegion = useCallback(() => {
    if (!mappedPixelData || !focusState.currentColor) return { region: null, cell: null };
    const allRegions = getAllConnectedRegions(mappedPixelData, focusState.currentColor);
    const incompleteRegions = allRegions.filter(region => !isRegionCompleted(region, focusState.completedCells));
    if (incompleteRegions.length === 0) return { region: null, cell: null };
    let selectedRegion: { row: number; col: number }[];
    switch (focusState.guidanceMode) {
      case 'nearest': {
        const referencePoint = focusState.selectedCell ?? { row: Math.floor(mappedPixelData.length / 2), col: Math.floor(mappedPixelData[0].length / 2) };
        const sortedByDistance = sortRegionsByDistance(incompleteRegions, referencePoint);
        selectedRegion = sortedByDistance[0];
        break;
      }
      case 'largest': {
        const sortedBySize = sortRegionsBySize(incompleteRegions);
        selectedRegion = sortedBySize[0];
        break;
      }
      case 'edge-first': {
        const M = mappedPixelData.length;
        const N = mappedPixelData[0].length;
        const edgeRegions = incompleteRegions.filter(region => region.some(cell => cell.row === 0 || cell.row === M - 1 || cell.col === 0 || cell.col === N - 1));
        selectedRegion = edgeRegions.length > 0 ? edgeRegions[0] : incompleteRegions[0];
        break;
      }
      default:
        selectedRegion = incompleteRegions[0];
    }
    const centerCell = getRegionCenter(selectedRegion);
    return { region: selectedRegion, cell: centerCell };
  }, [mappedPixelData, focusState.currentColor, focusState.completedCells, focusState.selectedCell, focusState.guidanceMode]);

  useEffect(() => {
    const { region, cell } = calculateRecommendedRegion();
    setFocusState(prev => ({ ...prev, recommendedRegion: region, recommendedCell: cell }));
  }, [calculateRecommendedRegion]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!mappedPixelData) return;
    const cellColor = mappedPixelData[row][col].color;
    if (cellColor === focusState.currentColor) {
      const region = getConnectedRegion(mappedPixelData, row, col, focusState.currentColor);
      if (region.length === 0) return;
      const newCompletedCells = new Set(focusState.completedCells);
      const isCurrentlyCompleted = isRegionCompleted(region, focusState.completedCells);
      if (isCurrentlyCompleted) {
        region.forEach(({ row: r, col: c }) => { newCompletedCells.delete(`${r},${c}`); });
      } else {
        region.forEach(({ row: r, col: c }) => { newCompletedCells.add(`${r},${c}`); });
      }
      const newColorProgress = { ...focusState.colorProgress };
      let colorJustCompleted = false;
      if (newColorProgress[focusState.currentColor]) {
        const oldCompleted = newColorProgress[focusState.currentColor].completed;
        const newCompleted = Array.from(newCompletedCells).filter(key => { const [r, c] = key.split(',').map(Number); return mappedPixelData[r]?.[c]?.color === focusState.currentColor; }).length;
        newColorProgress[focusState.currentColor].completed = newCompleted;
        const total = newColorProgress[focusState.currentColor].total;
        if (oldCompleted < total && newCompleted === total && focusState.enableCelebration) colorJustCompleted = true;
      }
      const allColorsCompleted = Object.values(newColorProgress).every(progress => progress.completed >= progress.total);
      setFocusState(prev => {
        const now = Date.now();
        let newState = { ...prev, completedCells: newCompletedCells, selectedCell: { row, col }, colorProgress: newColorProgress, showCelebration: colorJustCompleted };
        if (allColorsCompleted && !prev.isPaused) {
          const elapsed = Math.floor((now - prev.lastResumeTime) / 1000);
          newState = { ...newState, isPaused: true, totalElapsedTime: prev.totalElapsedTime + elapsed };
        }
        return newState;
      });
      setAvailableColors(prev => prev.map(color => {
        if (color.color === focusState.currentColor) return { ...color, completed: newColorProgress[focusState.currentColor]?.completed || 0 };
        return color;
      }));
    }
  }, [mappedPixelData, focusState.currentColor, focusState.completedCells, focusState.colorProgress, focusState.enableCelebration]);

  const handleColorChange = useCallback((color: string) => {
    setFocusState(prev => ({ ...prev, currentColor: color, showColorPanel: false }));
  }, []);

  const handleLocateRecommended = useCallback(() => {
    if (!focusState.recommendedCell || !gridDimensions) return;
    const { row, col } = focusState.recommendedCell;
    const cellSize = Math.max(15, Math.min(40, 300 / Math.max(gridDimensions.N, gridDimensions.M)));
    const targetX = (col + 0.5) * cellSize;
    const targetY = (row + 0.5) * cellSize;
    const canvasWidth = gridDimensions.N * cellSize;
    const canvasHeight = gridDimensions.M * cellSize;
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;
    const offsetX = canvasCenterX - targetX;
    const offsetY = canvasCenterY - targetY;
    setFocusState(prev => ({ ...prev, canvasOffset: { x: offsetX, y: offsetY } }));
  }, [focusState.recommendedCell, gridDimensions]);

  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePauseToggle = useCallback(() => {
    setFocusState(prev => {
      const now = Date.now();
      if (prev.isPaused) return { ...prev, isPaused: false, lastResumeTime: now };
      const elapsed = Math.floor((now - prev.lastResumeTime) / 1000);
      return { ...prev, isPaused: true, totalElapsedTime: prev.totalElapsedTime + elapsed };
    });
  }, []);

  const handleCelebrationComplete = useCallback(() => {
    setFocusState(prev => ({ ...prev, showCelebration: false }));
    const allCompleted = availableColors.every(color => color.completed >= color.total);
    if (allCompleted) {
      setFocusState(prev => ({ ...prev, showCompletionCard: true }));
    } else {
      const currentIndex = availableColors.findIndex(color => color.color === focusState.currentColor);
      if (currentIndex !== -1) {
        for (let i = 1; i < availableColors.length; i++) {
          const nextIndex = (currentIndex + i) % availableColors.length;
          const nextColor = availableColors[nextIndex];
          if (nextColor.completed < nextColor.total) {
            setFocusState(prev => ({ ...prev, currentColor: nextColor.color }));
            break;
          }
        }
      }
    }
  }, [availableColors, focusState.currentColor]);

  const handleCompletionCardClose = useCallback(() => {
    setFocusState(prev => ({ ...prev, showCompletionCard: false }));
  }, []);

  if (!mappedPixelData || !gridDimensions) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  const currentColorInfo = availableColors.find(c => c.color === focusState.currentColor);
  const progressPercentage = currentColorInfo ? Math.round((currentColorInfo.completed / currentColorInfo.total) * 100) : 0;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="h-15 bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="flex items-center text-gray-600 hover:text-gray-800">
          <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 className="text-lg font-medium text-gray-800">专心拼豆（AlphaTest）</h1>
        <button onClick={() => setFocusState(prev => ({ ...prev, showSettingsPanel: true }))} className="text-gray-600 hover:text-gray-800">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>
      <ColorStatusBar currentColor={focusState.currentColor} colorInfo={currentColorInfo} progressPercentage={progressPercentage} />
      <div className="flex-1 relative overflow-hidden">
        <FocusCanvas mappedPixelData={mappedPixelData} gridDimensions={gridDimensions} currentColor={focusState.currentColor} completedCells={focusState.completedCells} recommendedCell={focusState.recommendedCell} recommendedRegion={focusState.recommendedRegion} canvasScale={focusState.canvasScale} canvasOffset={focusState.canvasOffset} gridSectionInterval={focusState.gridSectionInterval} showSectionLines={focusState.showSectionLines} sectionLineColor={focusState.sectionLineColor} onCellClick={handleCellClick} onScaleChange={(scale: number) => setFocusState(prev => ({ ...prev, canvasScale: scale }))} onOffsetChange={(offset: { x: number; y: number }) => setFocusState(prev => ({ ...prev, canvasOffset: offset }))} />
      </div>
      <ProgressBar progressPercentage={progressPercentage} recommendedCell={focusState.recommendedCell} colorInfo={currentColorInfo} />
      <ToolBar onColorSelect={() => setFocusState(prev => ({ ...prev, showColorPanel: true }))} onLocate={handleLocateRecommended} onPause={handlePauseToggle} isPaused={focusState.isPaused} elapsedTime={formatTime(focusState.totalElapsedTime)} />
      {focusState.showColorPanel && <ColorPanel colors={availableColors} currentColor={focusState.currentColor} onColorSelect={handleColorChange} onClose={() => setFocusState(prev => ({ ...prev, showColorPanel: false }))} />}
      {focusState.showSettingsPanel && <SettingsPanel guidanceMode={focusState.guidanceMode} onGuidanceModeChange={(mode: 'nearest' | 'largest' | 'edge-first') => setFocusState(prev => ({ ...prev, guidanceMode: mode }))} gridSectionInterval={focusState.gridSectionInterval} onGridSectionIntervalChange={(interval: number) => setFocusState(prev => ({ ...prev, gridSectionInterval: interval }))} showSectionLines={focusState.showSectionLines} onShowSectionLinesChange={(show: boolean) => setFocusState(prev => ({ ...prev, showSectionLines: show }))} sectionLineColor={focusState.sectionLineColor} onSectionLineColorChange={(color: string) => setFocusState(prev => ({ ...prev, sectionLineColor: color }))} enableCelebration={focusState.enableCelebration} onEnableCelebrationChange={(enable: boolean) => setFocusState(prev => ({ ...prev, enableCelebration: enable }))} onClose={() => setFocusState(prev => ({ ...prev, showSettingsPanel: false }))} />}
      <CelebrationAnimation isVisible={focusState.showCelebration} onComplete={handleCelebrationComplete} />
      <CompletionCard isVisible={focusState.showCompletionCard} mappedPixelData={mappedPixelData} gridDimensions={gridDimensions} totalElapsedTime={focusState.totalElapsedTime} onClose={handleCompletionCardClose} />
    </div>
  );
}

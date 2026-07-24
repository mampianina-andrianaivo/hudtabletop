/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { Home } from './pages/Home';
import { PlayerView } from './pages/PlayerView';
import { GMView } from './pages/GMView';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'player' | 'gm'>(() => {
    return (localStorage.getItem('tt_currentView') as 'home' | 'player' | 'gm') || 'home';
  });

  useEffect(() => {
    localStorage.setItem('tt_currentView', currentView);
  }, [currentView]);

  return (
    <>
      {currentView === 'home' && <Home onSelectRole={setCurrentView} />}
      {currentView === 'player' && <PlayerView onGoHome={() => setCurrentView('home')} onSwitchToGM={() => setCurrentView('gm')} />}
      {currentView === 'gm' && <GMView onGoHome={() => setCurrentView('home')} onSwitchToPlayer={() => setCurrentView('player')} />}
    </>
  );
}

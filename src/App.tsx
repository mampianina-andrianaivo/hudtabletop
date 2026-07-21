/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Home } from './pages/Home';
import { PlayerView } from './pages/PlayerView';
import { GMView } from './pages/GMView';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'player' | 'gm'>('home');

  return (
    <>
      {currentView === 'home' && <Home onSelectRole={setCurrentView} />}
      {currentView === 'player' && <PlayerView onGoHome={() => setCurrentView('home')} />}
      {currentView === 'gm' && <GMView onGoHome={() => setCurrentView('home')} />}
    </>
  );
}

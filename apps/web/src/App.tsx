import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Loading } from './components/common/Loading';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Devices } from './pages/Devices';
import { Rooms } from './pages/Rooms';
import { Settings } from './pages/Settings';
import { PlaceholderPage } from './pages/PlaceholderPage';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavItemKey>('overview');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1020] flex items-center justify-center">
        <Loading message="正在连接 HomeCore 本地数字中枢..." className="h-64" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return <Overview onNavigate={setCurrentTab} />;
      case 'devices':
        return <Devices />;
      case 'rooms':
        return <Rooms />;
      case 'settings':
        return <Settings />;
      default:
        return <PlaceholderPage tabKey={currentTab} onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0B1020] text-[#F8FAFC] overflow-hidden">
      {/* 240px Desktop Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header currentTab={currentTab} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;

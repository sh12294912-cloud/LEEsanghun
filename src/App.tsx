import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppStoreProvider } from './store/AppStore';
import { SyncProvider } from './sync/SyncProvider';
import NavBar from './components/NavBar';
import Dashboard from './pages/Dashboard';
import Workout from './pages/Workout';
import Diet from './pages/Diet';
import Body from './pages/Body';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AppStoreProvider>
      <SyncProvider>
      <HashRouter>
        <main className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/diet" element={<Diet />} />
            <Route path="/body" element={<Body />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <NavBar />
      </HashRouter>
      </SyncProvider>
    </AppStoreProvider>
  );
}

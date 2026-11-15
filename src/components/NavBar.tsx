import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: '홈', icon: '🏠' },
  { to: '/workout', label: '운동', icon: '🏋️' },
  { to: '/diet', label: '식단', icon: '🥗' },
  { to: '/body', label: '신체', icon: '⚖️' },
  { to: '/settings', label: '설정', icon: '⚙️' },
];

export default function NavBar() {
  return (
    <nav className="navbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className="nav-item">
          <span className="nav-icon" aria-hidden>{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

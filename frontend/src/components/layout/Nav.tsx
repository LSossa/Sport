import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, PenLine, Settings } from 'lucide-react';

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/log', icon: PenLine, label: 'Log' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Nav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 safe-bottom z-50">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 px-4 min-w-[60px] transition-colors ${
                isActive ? 'text-green-400' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}


import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Repeat,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet,
  FileText,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { path: '/entries', name: 'Lançamento', icon: PlusCircle },
  { path: '/accounts', name: 'Contas Bancárias', icon: Wallet },
  { path: '/reports', name: 'Relatórios', icon: FileText },
  { path: '/transfers', name: 'Transferências', icon: Repeat },
  { path: '/settings', name: 'Configurações', icon: Settings },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="mobile-toggle"
        onClick={toggleSidebar}
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <Wallet size={32} color="var(--primary)" />
            <span className="logo-text">FinanceApp</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }: { isActive: boolean }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.user_metadata?.full_name || 'Usuário'}</span>
              <span className="user-email">{user?.email}</span>
            </div>
          </div>
          <button onClick={() => signOut()} className="logout-button">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <nav className="bottom-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }: { isActive: boolean }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={22} />
            <span>
              {item.name === 'Contas Bancárias' ? 'Contas' :
                item.name === 'Relatórios' ? 'Relat.' :
                  item.name === 'Configurações' ? 'Config.' :
                    item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: var(--sidebar-bg);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }

        .sidebar-header {
          padding: 2rem 1.5rem;
          display: flex;
          justify-content: center;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.02em;
          display: var(--sidebar-display, block);
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          justify-content: var(--sidebar-justify, flex-start);
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.925rem;
          transition: all 0.2s ease;
        }

        .nav-item span {
          display: var(--sidebar-display, block);
          white-space: nowrap;
        }

        .nav-item:hover {
          background: rgba(0, 230, 118, 0.05);
          color: var(--primary);
        }

        .nav-item.active {
          background: rgba(0, 230, 118, 0.1);
          color: var(--primary);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid var(--border);
        }

        .user-profile {
          display: flex;
          align-items: center;
          justify-content: var(--sidebar-justify, flex-start);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .user-info {
          display: var(--sidebar-display, flex);
          flex-direction: column;
          overflow: hidden;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .logout-button {
          width: 100%;
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          color: var(--error);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .logout-button span {
           display: var(--sidebar-display, block);
        }

        .logout-button:hover {
          background: rgba(239, 68, 68, 0.15);
        }

        /* Adjustment for Tablet Sidebar */
        @media (min-width: 769px) and (max-width: 1024px) {
          :root {
            --sidebar-display: none;
            --sidebar-justify: center;
          }
          .sidebar-header {
             padding: 1.5rem 0.5rem;
          }
           .nav-item {
             padding: 0.75rem;
          }
          .sidebar-footer {
             padding: 1rem 0.5rem;
          }
          .user-profile {
             margin-bottom: 0.5rem;
          }
          .logout-button {
             padding: 0.75rem 0;
          }
        }

        .mobile-toggle {
          display: none;
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 1100;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0.5rem;
          color: var(--text-main);
          cursor: pointer;
          box-shadow: var(--shadow-sm);
        }

        /* Bottom Nav Styles */
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          height: 70px;
          background: var(--bg-secondary);
          display: none;
          justify-content: space-around;
          align-items: center;
          border-top: 1px solid var(--border-color);
          z-index: 1001;
          padding: 0 1rem;
          padding-bottom: env(safe-area-inset-bottom);
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-muted);
          text-decoration: none;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bottom-nav-item span {
          font-size: 0.625rem;
          font-weight: 600;
        }

        .bottom-nav-item.active {
          color: var(--primary);
        }

        @media (max-width: 1024px) {
          .mobile-toggle, .sidebar-overlay, .sidebar {
            display: none !important;
          }

          .bottom-nav {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}

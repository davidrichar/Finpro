
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
        {menuItems.slice(0, 3).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }: { isActive: boolean }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={22} />
            <span>{item.name === 'Contas Bancárias' ? 'Contas' : item.name === 'Relatórios' ? 'Relat.' : item.name}</span>
          </NavLink>
        ))}
        <button className="bottom-nav-item" onClick={toggleSidebar}>
          <Menu size={22} />
          <span>Mais</span>
        </button>
      </nav>

      <style>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background: #ffffff;
          border-right: 1px solid rgba(16, 185, 129, 0.1);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          transition: transform 0.3s ease;
        }

        .sidebar-header {
          padding: 2rem 1.5rem;
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
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.925rem;
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          background: rgba(16, 185, 129, 0.05);
          color: var(--primary);
        }

        .nav-item.active {
          background: rgba(16, 185, 129, 0.1);
          color: var(--primary);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid #f1f5f9;
        }

        .user-profile {
          display: flex;
          align-items: center;
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
        }

        .user-info {
          display: flex;
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
          background: #fef2f2;
          color: #ef4444;
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

        .logout-button:hover {
          background: #fee2e2;
        }

        .mobile-toggle {
          display: none;
          position: fixed;
          top: 1rem;
          left: 1rem;
          z-index: 1100;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5rem;
          color: var(--text-main);
          cursor: pointer;
          box-shadow: var(--shadow);
        }

        /* Bottom Nav Styles */
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #F1F5F9;
          display: none;
          grid-template-columns: repeat(5, 1fr);
          padding: 0.5rem 0.25rem 1.25rem 0.25rem;
          z-index: 1001;
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.05);
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          color: #94A3B8;
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

        @media (max-width: 768px) {
          .mobile-toggle {
            display: none; /* Hidden, using Bottom Nav "Mais" */
          }

          .bottom-nav {
            display: grid;
          }

          .sidebar {
            transform: translateX(-100%);
            width: 85%;
            max-width: 300px;
            box-shadow: 10px 0 20px rgba(0,0,0,0.1);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(2px);
            z-index: 999;
          }
        }
      `}</style>
    </>
  );
}

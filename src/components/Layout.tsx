
import { type ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="layout-container">
            <Sidebar />
            <main className="main-content">
                {/* O container deve ficar vazio para ser preenchido pelas páginas */}
                {children}
            </main>
        </div>
    );
}

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppContainerProps {
    children: React.ReactNode;
    title?: string;
}

const AppContainer: React.FC<AppContainerProps> = ({ children, title }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden max-w-full overflow-x-hidden bg-[#f6f7f8] text-slate-900">
            {/* Sidebar */}
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <TopBar onMenuClick={() => setSidebarOpen(true)} title={title} />

                {/* Content */}
                <main className="flex-1 overflow-y-auto w-full min-w-0 max-w-full overflow-x-hidden">
                    <div className="p-3 md:p-8 space-y-4 md:space-y-6 mx-auto w-full min-w-0 max-w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppContainer;

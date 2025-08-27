
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSecondarySidebar } from '@/context/SecondarySidebarContext';

// Import pages from their new locations
import Dashboard from './deep-research-framework/Dashboard';
import Topics from './deep-research-framework/Topics';
import Runs from './deep-research-framework/Runs';
import Glossary from './deep-research-framework/Glossary';
import Settings from './deep-research-framework/Settings';

// Import deep-research-framework's layout component
import DeepResearchFrameworkLayout from '@/components/deep-research-framework/DeepResearchFrameworkLayout';

const DeepResearchFrameworkPage: React.FC = () => {
  const { setSecondarySidebarContent, setSecondarySidebarWidth } = useSecondarySidebar();

  useEffect(() => {
    // This useEffect is for the SecondarySidebar, which is part of the main Layout.
    // It should probably be moved to DeepResearchFrameworkLayout if it's specific to DRF.
    // For now, keep it here, but note the potential for refactoring.
    setSecondarySidebarContent(
      <>
        {/* The Sidebar for DRF is now part of DeepResearchFrameworkLayout */}
        {/* This content will be passed to the SecondarySidebarProvider in Layout */}
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">DRF Navigation</h3>
          <nav>
            <Link to="/deep-research-framework/dashboard" className="block py-2 px-3 rounded hover:bg-gray-200">Dashboard</Link>
            <Link to="/deep-research-framework/topics" className="block py-2 px-3 rounded hover:bg-gray-200">Topics</Link>
            <Link to="/deep-research-framework/runs" className="block py-2 px-3 rounded hover:bg-gray-200">Runs</Link>
            <Link to="/deep-research-framework/glossary" className="block py-2 px-3 rounded hover:bg-gray-200">Glossary</Link>
            <Link to="/deep-research-framework/settings" className="block py-2 px-3 rounded hover:bg-gray-200">Settings</Link>
          </nav>
        </div>
      </>
    );
    setSecondarySidebarWidth(256); // Approximate width of md:w-64 (16rem * 16px/rem)

    return () => {
      setSecondarySidebarContent(null);
      setSecondarySidebarWidth(0);
    };
  }, [setSecondarySidebarContent, setSecondarySidebarWidth]);

  return (
    <DeepResearchFrameworkLayout> {/* Use the dedicated layout component */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/topics" element={<Topics />} />
        <Route path="/runs" element={<Runs />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </DeepResearchFrameworkLayout>
  );
};

export default DeepResearchFrameworkPage;

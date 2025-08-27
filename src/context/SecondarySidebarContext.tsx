
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SecondarySidebarContextType {
  secondarySidebarContent: ReactNode | null;
  setSecondarySidebarContent: (content: ReactNode | null) => void;
  secondarySidebarWidth: number;
  setSecondarySidebarWidth: (width: number) => void;
}

const SecondarySidebarContext = createContext<SecondarySidebarContextType | undefined>(undefined);

export const SecondarySidebarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [secondarySidebarContent, setSecondarySidebarContent] = useState<ReactNode | null>(null);
  const [secondarySidebarWidth, setSecondarySidebarWidth] = useState(0);

  return (
    <SecondarySidebarContext.Provider 
      value={{
        secondarySidebarContent,
        setSecondarySidebarContent,
        secondarySidebarWidth,
        setSecondarySidebarWidth,
      }}
    >
      {children}
    </SecondarySidebarContext.Provider>
  );
};

export const useSecondarySidebar = () => {
  const context = useContext(SecondarySidebarContext);
  if (context === undefined) {
    throw new Error('useSecondarySidebar must be used within a SecondarySidebarProvider');
  }
  return context;
};

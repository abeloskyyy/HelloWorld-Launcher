import React, { createContext, useContext, useState } from 'react';

export type SectionType = 'play' | 'installations' | 'skins' | 'social' | 'workshop' | 'settings';

interface NavigationContextType {
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<SectionType>('play');

  return (
    <NavigationContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

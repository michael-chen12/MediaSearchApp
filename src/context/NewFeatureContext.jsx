import { createContext, useContext, useState } from 'react';

const NewFeatureContext = createContext();

export function NewFeatureProvider({ children }) {
  const [state, setState] = useState({});

  const updateState = (newData) => {
    setState(prev => ({ ...prev, ...newData }));
  };

  return (
    <NewFeatureContext.Provider value={{ state, updateState }}>
      {children}
    </NewFeatureContext.Provider>
  );
}

export function useNewFeature() {
  const context = useContext(NewFeatureContext);
  if (!context) {
    throw new Error('useNewFeature must be used within NewFeatureProvider');
  }
  return context;
}

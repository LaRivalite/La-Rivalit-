import { createContext, useContext, useState } from "react";

const SheetContext = createContext();

export function SheetProvider({ children }) {

  const [sheet, setSheet] = useState({
    open: false,
    type: null,
    step: null,
    data: {},
  });

  function openSheet(type, step = "start") {
    setSheet({
      open: true,
      type,
      step,
      data: {},
    });
  }

  function nextStep(step, data = {}) {
    setSheet(prev => ({
      ...prev,
      step,
      data: {
        ...prev.data,
        ...data,
      },
    }));
  }

  function closeSheet() {
    setSheet({
      open: false,
      type: null,
      step: null,
      data: {},
    });
  }

  return (
    <SheetContext.Provider
      value={{
        sheet,
        openSheet,
        nextStep,
        closeSheet,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
}

export function useSheet() {
  return useContext(SheetContext);
}
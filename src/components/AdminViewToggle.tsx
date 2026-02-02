import { useState, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Shield } from 'lucide-react';

interface ViewContextType {
  isClientView: boolean;
  toggleView: () => void;
}

const ViewContext = createContext<ViewContextType>({
  isClientView: false,
  toggleView: () => {},
});

export function useViewMode() {
  return useContext(ViewContext);
}

export function ViewModeProvider({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  const [isClientView, setIsClientView] = useState(false);

  const toggleView = () => {
    setIsClientView(prev => !prev);
  };

  // If not admin, always show client view
  const effectiveClientView = !isAdmin || isClientView;

  return (
    <ViewContext.Provider value={{ isClientView: effectiveClientView, toggleView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function AdminViewToggle() {
  const { isClientView, toggleView } = useViewMode();

  return (
    <div className="fixed top-20 right-4 z-50">
      <Button
        onClick={toggleView}
        variant="outline"
        size="sm"
        className="gap-2 shadow-lg bg-background"
      >
        {isClientView ? (
          <>
            <Eye className="h-4 w-4" />
            Viewing as Client
          </>
        ) : (
          <>
            <Shield className="h-4 w-4" />
            Admin View
          </>
        )}
      </Button>
    </div>
  );
}

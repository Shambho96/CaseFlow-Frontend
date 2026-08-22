import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from '@/routes/AppRouter';
import { UIProvider } from '@/store/uiStore';
import { CaseProvider } from '@/store/caseStore';
import { ClientProvider } from '@/store/clientStore';
import { TaskProvider } from '@/store/taskStore';
import { TooltipProvider } from '@/components/ui/tooltip';
import '@/styles/globals.css';

function App() {
  return (
    <BrowserRouter>
      <UIProvider>
        <CaseProvider>
          <ClientProvider>
            <TaskProvider>
              <TooltipProvider>
                <AppRouter />
              </TooltipProvider>
            </TaskProvider>
          </ClientProvider>
        </CaseProvider>
      </UIProvider>
    </BrowserRouter>
  );
}

export default App;

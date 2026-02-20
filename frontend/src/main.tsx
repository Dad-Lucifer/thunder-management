import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(

    <BrowserRouter>
        <AuthProvider>
            <ToastProvider>
                <App />
            </ToastProvider>
        </AuthProvider>
    </BrowserRouter>
)

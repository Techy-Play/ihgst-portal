import AuthProvider from '@/components/AuthProvider';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

export const metadata = {
  title: 'IHGST Portal — Employee Goal Setting & Performance Tracking',
  description: 'Enterprise goal management platform for setting, tracking, and reviewing employee performance goals with structured approval workflows, quarterly check-ins, and real-time analytics.',
  keywords: 'goal setting, performance tracking, employee goals, KPI, quarterly check-in, HR portal',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'IHGST Portal — Employee Goal Setting & Performance Tracking',
    description: 'A unified platform for managing employee performance goals with approval workflows and analytics.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

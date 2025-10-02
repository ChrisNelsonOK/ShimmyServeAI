import React, { ReactNode } from 'react';
import { Video as LucideIcon } from 'lucide-react';

interface PageLayoutProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  headerClassName?: string;
}

export function PageLayout({ 
  title, 
  subtitle, 
  icon: Icon, 
  children, 
  actions,
  headerClassName = ''
}: PageLayoutProps) {
  return (
    <div className="p-6 space-y-6 bg-dark-950 min-h-full" data-testid={`page-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${headerClassName}`}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-crimson-500 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="page-title">{title}</h1>
            <p className="text-gray-400" data-testid="page-subtitle">{subtitle}</p>
          </div>
        </div>
        {actions && (
          <div className="flex items-center space-x-3" data-testid="page-actions">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      <div data-testid="page-content">
        {children}
      </div>
    </div>
  );
}
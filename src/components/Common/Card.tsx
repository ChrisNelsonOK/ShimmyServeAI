import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  testId?: string;
}

export function Card({ 
  children, 
  className = '', 
  padding = 'md', 
  hover = false,
  testId = 'card'
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <div 
      className={`
        bg-dark-950/95 backdrop-blur-sm border border-dark-700/50 rounded-xl
        ${paddingClasses[padding]}
        ${hover ? 'hover:border-dark-600 transition-colors' : ''}
        ${className}
      `}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  testId?: string;
}

export function CardHeader({ title, subtitle, actions, testId = 'card-header' }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4" data-testid={testId}>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  );
}
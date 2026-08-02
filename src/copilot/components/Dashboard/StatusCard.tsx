import React, { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface StatusCardProps {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'info';
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  disabled?: boolean;
  disabledTitle?: string;
  className?: string;
  iconClassName?: string;
}

const statusColors = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-rose-500',
  info: 'text-blue-400',
};

const StatusCard: React.FC<StatusCardProps> = ({
  icon, title, value, subtitle, status, expandable, expanded, onToggle, children, disabled, className, iconClassName
}) => {
  if (disabled) return null;
  
  const baseClasses = "relative glass-card rounded-2xl shadow-sm py-3 px-3 w-full h-full flex flex-col justify-between transition-all duration-300 hover:shadow-md";
  const finalClasses = className ? `${baseClasses} ${className}` : `${baseClasses} bg-white border border-gray-100 hover:border-harx-200`;

  const baseIconClasses = "w-6 h-6 rounded-lg flex items-center justify-center text-[14px] border transition-all";
  const finalIconClasses = iconClassName ? `${baseIconClasses} ${iconClassName}` : `${baseIconClasses} bg-gray-50 border-gray-100 text-gray-400 group-hover:bg-harx-50 group-hover:border-harx-100 group-hover:text-harx-500`;

  return (
    <div className={finalClasses}>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 text-gray-400">
        <div className={finalIconClasses}>
          {icon}
        </div>
        <span className="font-bold text-[9px] uppercase tracking-widest leading-tight">{title}</span>
      </div>
      {expandable && !disabled && (
        <button className="text-gray-400" onClick={onToggle}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
    </div>
    <div className={`text-lg font-black mt-1.5 leading-none tracking-tight ${status ? statusColors[status] : 'text-gray-900'}`}>{value}</div>
    {subtitle && (
      <div className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{subtitle}</div>
    )}
    {children && expanded && !disabled && (
      <div className="mt-2 text-xs text-gray-500">{children}</div>
    )}
    </div>
  );
};

export default StatusCard; 

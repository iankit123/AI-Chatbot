import type { RoleType } from '@/lib/constants';

interface RoleAvatarProps {
  role: RoleType;
  className?: string;
}

export function RoleAvatar({ role, className = "w-10 h-10" }: RoleAvatarProps) {
  const baseClasses = `${className} rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white`;
  
  switch (role) {
    case 'doctor':
      return (
        <div className={`${baseClasses} bg-blue-500`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {/* Medical cross */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      );
    
    case 'kundli':
      return (
        <div className={`${baseClasses} bg-orange-500`}>
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            {/* Swastik symbol - traditional Hindu symbol with four arms */}
            {/* Center cross */}
            <rect x="10" y="2" width="4" height="6" />
            <rect x="10" y="16" width="4" height="6" />
            <rect x="2" y="10" width="6" height="4" />
            <rect x="16" y="10" width="6" height="4" />
            {/* Top right arm */}
            <rect x="16" y="2" width="4" height="4" />
            {/* Bottom right arm */}
            <rect x="20" y="16" width="4" height="4" />
            {/* Bottom left arm */}
            <rect x="2" y="18" width="4" height="4" />
            {/* Top left arm */}
            <rect x="2" y="2" width="4" height="4" />
          </svg>
        </div>
      );
    
    case 'parenting':
      return (
        <div className={`${baseClasses} bg-pink-500`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {/* Baby/person icon */}
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            <circle cx="10" cy="7" r="1" fill="currentColor"/>
            <circle cx="14" cy="7" r="1" fill="currentColor"/>
          </svg>
        </div>
      );
    
    case 'finance':
      return (
        <div className={`${baseClasses} bg-green-500`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    
    case 'career':
      return (
        <div className={`${baseClasses} bg-indigo-500`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      );

    case 'krishna':
      return (
        <div className={`${baseClasses} bg-blue-500`}>
          <span className="text-xl text-white">🪷</span>
        </div>
      );

    case 'english':
      return (
        <div className={`${baseClasses} bg-orange-500`}>
          <span className="text-xl text-white">A</span>
        </div>
      );
    
    default:
      return (
        <div className={`${baseClasses} bg-gray-400`}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      );
  }
}


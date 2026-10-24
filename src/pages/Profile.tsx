import React, { useState } from 'react'
import Loader from '../components/ui/Loader'
import { useQuery } from 'react-query'
import { 
  UserCircleIcon,
  CogIcon,
  ShieldCheckIcon,
  ClockIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'
import { profileService } from '../services/profileService'
import ProfileInfo from '../components/ProfileInfo'
import ProfileSettings from '../components/ProfileSettings'
import ProfileSecurity from '../components/ProfileSecurity'
import ProfileActivity from '../components/ProfileActivity'
import ProfileSessions from '../components/ProfileSessions'


type TabType = 'info' | 'settings' | 'security' | 'activity' | 'sessions'

const Profile: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('info')

  // Fetch profile data
  const { data: profile, isLoading, error } = useQuery(
    'profile',
    () => profileService.getProfile(),
    {
      retry: 1,
    }
  )

  const tabs = [
    {
      id: 'info' as TabType,
      name: 'Profile Info',
      icon: UserCircleIcon,
      description: 'Personal information and avatar'
    },
    {
      id: 'settings' as TabType,
      name: 'Settings',
      icon: CogIcon,
      description: 'Preferences and notifications'
    },
    {
      id: 'security' as TabType,
      name: 'Security',
      icon: ShieldCheckIcon,
      description: 'Password and 2FA settings'
    },
    {
      id: 'activity' as TabType,
      name: 'Activity',
      icon: ClockIcon,
      description: 'Account activity and logs'
    },
    {
      id: 'sessions' as TabType,
      name: 'Sessions',
      icon: ComputerDesktopIcon,
      description: 'Active sessions and devices'
    }
  ]

  const renderTabContent = () => {
    if (!profile) return null

    switch (activeTab) {
      case 'info':
        return <ProfileInfo profile={profile} />
      case 'settings':
        return <ProfileSettings profile={profile} />
      case 'security':
        return <ProfileSecurity profile={profile} />
      case 'activity':
        return <ProfileActivity />
      case 'sessions':
        return <ProfileSessions />
      default:
        return <ProfileInfo profile={profile} />
    }
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors ${
        false 
          ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900' 
          : 'bg-gradient-to-br from-white via-blue-50/30 to-white'
      }`}>
        <div className={`text-center p-8 rounded-2xl shadow-lg border ${
          false 
            ? 'bg-blue-800/80 border-red-900/50' 
            : 'bg-white border-red-200'
        }`}>
          <ShieldCheckIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className={`text-xl font-semibold mb-2 ${
            false ? 'text-white' : 'text-slate-900'
          }`}>Error Loading Profile</h3>
          <p className={false ? 'text-slate-400' : 'text-slate-600'}>Please check your connection and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-4 transition-colors duration-300 ${
      false 
        ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900' 
        : 'bg-gradient-to-br from-white via-blue-50/30 to-white'
    }`}>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className={`backdrop-blur-xl rounded-xl border shadow-lg p-4 transition-colors ${
          false 
            ? 'bg-blue-800/80 border-blue-700/60' 
            : 'bg-white/80 border-white/60'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center">
                  <UserCircleIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className={`text-lg font-bold transition-colors ${
                  false 
                    ? 'bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent' 
                    : 'bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent'
                }`}>Profile Management</h1>
                <p className={`text-xs font-medium ${
                  false ? 'text-slate-400' : 'text-slate-500'
                }`}>Manage your account settings and preferences</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className={`backdrop-blur-xl rounded-xl border shadow-lg p-3 transition-colors ${
              false 
                ? 'bg-blue-800/80 border-blue-700/60' 
                : 'bg-white/80 border-white/60'
            }`}>
              <nav className="space-y-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? false 
                            ? 'bg-blue-700/50 text-slate-300 border border-blue-600/50' 
                            : 'bg-white text-slate-700 border border-slate-300'
                          : false 
                            ? 'text-slate-300 hover:bg-blue-700/50' 
                            : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{tab.name}</div>
                        <div className={`text-xs truncate ${
                          activeTab === tab.id
                            ? false ? 'text-slate-500' : 'text-slate-700'
                            : false ? 'text-slate-500' : 'text-slate-500'
                        }`}>{tab.description}</div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className={`backdrop-blur-xl rounded-xl border shadow-lg p-8 transition-colors ${
                false 
                  ? 'bg-blue-800/80 border-blue-700/60' 
                  : 'bg-white/80 border-white/60'
              }`}>
                <Loader label="Loading profile..." />
              </div>
            ) : (
              renderTabContent()
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile


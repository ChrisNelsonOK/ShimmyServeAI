import React from 'react';
import { Card, CardHeader, CardContent } from '../Common/Card';
import { Activity, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface SystemOverviewProps {
  uptime: string;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  activeAlerts: number;
  lastUpdate: string;
}

export function SystemOverview({ uptime, systemHealth, activeAlerts, lastUpdate }: SystemOverviewProps) {
  const getHealthIcon = () => {
    switch (systemHealth) {
      case 'excellent': return CheckCircle;
      case 'good': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return XCircle;
      default: return Activity;
    }
  };

  const getHealthColor = () => {
    switch (systemHealth) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const HealthIcon = getHealthIcon();
  const healthColor = getHealthColor();

  return (
    <Card>
      <CardHeader title="System Overview" subtitle="Current system status and health metrics" />
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <HealthIcon className={`w-6 h-6 ${healthColor}`} />
            </div>
            <div>
              <p className="text-sm text-gray-400">System Health</p>
              <p className={`text-lg font-semibold capitalize ${healthColor}`}>{systemHealth}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Uptime</p>
              <p className="text-lg font-semibold text-white">{uptime}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Alerts</p>
              <p className="text-lg font-semibold text-white">{activeAlerts}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Last Update</p>
              <p className="text-lg font-semibold text-white">{lastUpdate}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
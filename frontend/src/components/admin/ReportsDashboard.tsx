import React from 'react';
import { RequestStatus } from '../../types';
import type { VehicleRequest, Division } from '../../types';

interface ReportsDashboardProps {
    requests: VehicleRequest[];
    divisions: Division[];
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ requests, divisions }) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">Requests by Status</h3>
                    <div className="space-y-3">
                        {Object.values(RequestStatus).map(status => {
                            const count = requests.filter(r => r.status === status).length;
                            const percentage = requests.length ? Math.round((count / requests.length) * 100) : 0;
                            return (
                                <div key={status} className="space-y-1">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-slate-600">{status.replace('_', ' ')}</span>
                                        <span className="text-slate-900">{count} ({percentage}%)</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-slate-900 rounded-full transition-all duration-1000"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-4">Division Activity</h3>
                    <div className="space-y-3">
                        {divisions.map(div => {
                            const count = requests.filter(r => r.division_id === div.id).length;
                            const percentage = requests.length ? Math.round((count / requests.length) * 100) : 0;
                            return (
                                <div key={div.id} className="space-y-1">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-slate-600">{div.name}</span>
                                        <span className="text-slate-900">{count} requests</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsDashboard;

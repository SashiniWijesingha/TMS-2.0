import React from 'react';
import { Check, UserCheck, ShieldCheck, Truck, Flag, Crown } from 'lucide-react';
import { RequestStatus } from '../../types';

interface StatusStepperProps {
    currentStatus: RequestStatus;
    isSpecial?: boolean;
}

const normalSteps = [
    { id: 'STAFF',       label: 'You',          icon: Flag },
    { id: 'COORDINATOR', label: 'Coordinator',   icon: UserCheck },
    { id: 'HOD',         label: 'HOD',           icon: ShieldCheck },
    { id: 'TRANSPORT',   label: 'Transport',     icon: Truck },
    { id: 'READY',       label: 'Vehicle Ready', icon: Check },
];

const specialSteps = [
    { id: 'STAFF',     label: 'You',          icon: Flag },
    { id: 'CEO',       label: 'CEO',          icon: Crown },
    { id: 'TRANSPORT', label: 'Transport',    icon: Truck },
    { id: 'READY',     label: 'Vehicle Ready', icon: Check },
];

const StatusStepper: React.FC<StatusStepperProps> = ({ currentStatus, isSpecial }) => {
    const steps = isSpecial ? specialSteps : normalSteps;

    const getStatusIndex = () => {
        if (currentStatus === RequestStatus.COMPLETED) return steps.length;
        if (currentStatus === RequestStatus.ON_GOING) return steps.length - 1;
        if (currentStatus === RequestStatus.ALLOCATED || currentStatus === RequestStatus.VENDOR_ALLOCATED) return isSpecial ? 3 : 4;
        if (currentStatus === RequestStatus.APPROVED) return isSpecial ? 2 : 3;
        if (isSpecial) {
            if (currentStatus === RequestStatus.PENDING_CEO) return 1;
            return 0;
        }
        if (currentStatus === RequestStatus.PENDING_HOD) return 2;
        if (currentStatus === RequestStatus.PENDING_COORDINATOR) return 1;
        return 0;
    };

    const activeIndex = getStatusIndex();
    const isTerminal = [RequestStatus.REJECTED, RequestStatus.RETURNED, RequestStatus.CANCELLED, 'EXPIRED', 'DECLINED'].includes(currentStatus as any);

    return (
        <div className="w-full py-6">
            <div className="flex items-center justify-between relative px-2 sm:px-10">
                {/* Connector Line */}
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0 px-2 sm:px-10">
                    <div
                        className="h-full bg-[#005C2E] transition-all duration-1000 shadow-[0_0_8px_rgba(0,92,46,0.4)]"
                        style={{ width: `${Math.min(100, (activeIndex / (steps.length - 1)) * 100)}%` }}
                    />
                </div>

                {steps.map((step, index) => {
                    const isCompleted = index < activeIndex;
                    const isActive = index === activeIndex;

                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="relative z-10 flex flex-col items-center group">
                            <div className={`
                                w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2
                                ${isCompleted ? 'bg-[#005C2E] border-[#005C2E] text-white shadow-lg shadow-green-900/10' :
                                    isActive ? 'bg-white border-[#005C2E] text-[#005C2E] ring-4 ring-green-50 scale-110 shadow-md' :
                                        'bg-white border-slate-200 text-slate-300'}
                                ${isTerminal && index >= activeIndex ? 'border-red-200 text-red-200' : ''}
                            `}>
                                <Icon size={isActive ? 20 : 16} />
                            </div>
                            <span className={`
                                absolute top-12 whitespace-nowrap text-[10px] sm:text-xs font-black uppercase tracking-tight transition-colors
                                ${isActive ? 'text-[#005C2E]' : 'text-slate-400'}
                                ${isTerminal && index >= activeIndex ? 'text-red-400' : ''}
                            `}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {isTerminal && (
                <div className="mt-12 text-center animate-in fade-in slide-in-from-top-2">
                    <span className="px-4 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-100 uppercase tracking-widest">
                        Process Terminated: {currentStatus.replace('_', ' ')}
                    </span>
                </div>
            )}
        </div>
    );
};

export default StatusStepper;

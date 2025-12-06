import React, { useRef, useEffect } from 'react';
import { LogEntry, LogType } from '../types';
import { Terminal, CheckCircle, XCircle, Info } from 'lucide-react';

interface LoggerProps {
  logs: LogEntry[];
}

const Logger: React.FC<LoggerProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (type: LogType) => {
    switch (type) {
      case LogType.SUCCESS: return <CheckCircle size={14} className="text-green-500" />;
      case LogType.ERROR: return <XCircle size={14} className="text-red-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-inner flex flex-col h-48 w-full">
      <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center gap-2">
        <Terminal size={14} className="text-slate-400" />
        <span className="text-xs font-mono text-slate-400 font-semibold uppercase">시스템 활동 로그</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
        {logs.length === 0 && <span className="text-slate-600 italic">모니터링 준비 완료...</span>}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 opacity-90 hover:opacity-100 transition-opacity">
            <span className="text-slate-500 min-w-[60px]">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second: '2-digit' })}</span>
            <div className="mt-0.5">{getIcon(log.type)}</div>
            <span className={`${log.type === LogType.ERROR ? 'text-red-400' : log.type === LogType.SUCCESS ? 'text-green-400' : 'text-slate-300'}`}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Logger;
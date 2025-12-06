import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, IntelligenceReport, LogEntry, LogType, AnalyzedArticle } from './types';
import { fetchRssFeed } from './services/rssService';
import { generateIntelligenceReport } from './services/geminiService';
import ArticleCard from './components/ArticleCard';
import Logger from './components/Logger';
import { Activity, Clock, RefreshCw, Rss, ShieldAlert, Sparkles, StopCircle, PlayCircle } from 'lucide-react';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default function App() {
  const [state, setState] = useState<AppState>({
    rssUrl: '',
    isMonitoring: false,
    lastUpdated: null,
    nextUpdate: null,
    report: null,
    history: [],
    isLoading: false,
    error: null,
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const timerRef = useRef<number | null>(null);

  const addLog = (message: string, type: LogType = LogType.INFO) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type,
      message
    }].slice(-50)); // Keep last 50 logs
  };

  const processFeed = useCallback(async (url: string, isAuto = false) => {
    if (!url) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    addLog(isAuto ? "예약된 분석 자동 시작 중..." : "수동 분석 요청됨...", LogType.INFO);

    try {
      addLog(`${url} 에서 RSS 피드 가져오는 중...`, LogType.INFO);
      const items = await fetchRssFeed(url);
      
      if (items.length === 0) {
        throw new Error("RSS 피드에서 항목을 찾을 수 없습니다.");
      }
      addLog(`${items.length}개 항목 가져오기 성공. Gemini 분석 요청 중...`, LogType.SUCCESS);

      const report = await generateIntelligenceReport(items);
      addLog("인텔리전스 보고서 생성 완료.", LogType.SUCCESS);

      const now = Date.now();
      setState(prev => ({
        ...prev,
        isLoading: false,
        report,
        lastUpdated: now,
        nextUpdate: prev.isMonitoring ? now + TWO_HOURS_MS : null,
        history: [report, ...prev.history].slice(0, 5) // Keep last 5 reports
      }));

    } catch (err: any) {
      const msg = err.message || "알 수 없는 오류가 발생했습니다";
      setState(prev => ({ ...prev, isLoading: false, error: msg }));
      addLog(`오류: ${msg}`, LogType.ERROR);
    }
  }, []);

  // Monitoring Interval Logic
  useEffect(() => {
    if (state.isMonitoring && state.rssUrl) {
      // Clear any existing timer to avoid duplicates
      if (timerRef.current) clearInterval(timerRef.current);

      // Set up the interval check (runs every minute to check if it's time to update)
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        if (state.nextUpdate && now >= state.nextUpdate && !state.isLoading) {
          processFeed(state.rssUrl, true);
        }
      }, 60000); // Check every minute

      addLog("모니터링 활성화됨. 일정: 2시간마다.", LogType.INFO);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      addLog("모니터링 일시 중지됨.", LogType.INFO);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isMonitoring, state.rssUrl, state.nextUpdate, state.isLoading, processFeed]);

  const handleStart = () => {
    if (!state.rssUrl) {
      addLog("유효한 RSS URL을 입력하세요.", LogType.ERROR);
      return;
    }
    
    // Initial fetch
    processFeed(state.rssUrl);
    
    setState(prev => ({
      ...prev,
      isMonitoring: true,
      nextUpdate: Date.now() + TWO_HOURS_MS
    }));
  };

  const handleStop = () => {
    setState(prev => ({ ...prev, isMonitoring: false, nextUpdate: null }));
  };

  const handleManualRefresh = () => {
    if (state.rssUrl) {
        processFeed(state.rssUrl);
        // Reset timer if monitoring
        if (state.isMonitoring) {
             setState(prev => ({ ...prev, nextUpdate: Date.now() + TWO_HOURS_MS }));
        }
    }
  };

  // Calculate progress for the progress bar
  const getProgress = () => {
    if (!state.lastUpdated || !state.nextUpdate) return 0;
    const total = state.nextUpdate - state.lastUpdated;
    const elapsed = Date.now() - state.lastUpdated;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };
  
  // Use a simple ticker for the progress bar UI update
  const [progress, setProgress] = useState(0);
  useEffect(() => {
      const interval = setInterval(() => {
          setProgress(getProgress());
      }, 1000);
      return () => clearInterval(interval);
  }, [state.lastUpdated, state.nextUpdate]);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">IntelReport</h1>
              <p className="text-xs text-slate-500 font-medium">AI 기반 RSS 분석기</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {state.lastUpdated && (
                <div className="hidden sm:flex flex-col items-end text-xs text-slate-500">
                    <span>최근 업데이트: {new Date(state.lastUpdated).toLocaleTimeString()}</span>
                    {state.isMonitoring && (
                        <span className="text-blue-600 font-medium">다음: {new Date(state.nextUpdate || 0).toLocaleTimeString()}</span>
                    )}
                </div>
             )}
          </div>
        </div>
        {/* Progress Bar for next update */}
        {state.isMonitoring && (
            <div className="h-0.5 w-full bg-slate-100">
                <div className="h-full bg-blue-500 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }}></div>
            </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Control Panel */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="rss-url" className="block text-sm font-medium text-slate-700 mb-1">대상 RSS 피드 URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Rss size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  id="rss-url"
                  placeholder="https://example.com/feed.xml"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all shadow-sm"
                  value={state.rssUrl}
                  onChange={(e) => setState(prev => ({ ...prev, rssUrl: e.target.value }))}
                  disabled={state.isMonitoring}
                />
              </div>
            </div>
            
            <div className="flex items-end gap-3">
              {!state.isMonitoring ? (
                <button
                  onClick={handleStart}
                  disabled={state.isLoading || !state.rssUrl}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg w-full md:w-auto"
                >
                  <PlayCircle size={18} />
                  모니터링 시작
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 border border-red-200 transition-all w-full md:w-auto"
                >
                  <StopCircle size={18} />
                  모니터링 중지
                </button>
              )}
              
              <button
                onClick={handleManualRefresh}
                disabled={state.isLoading || !state.rssUrl}
                className="flex items-center justify-center p-2.5 text-slate-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-all"
                title="강제 새로고침"
              >
                <RefreshCw size={20} className={`${state.isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="mt-6 flex flex-wrap gap-4 items-center text-sm">
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${state.isMonitoring ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                <span className={`w-2 h-2 rounded-full ${state.isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                {state.isMonitoring ? '시스템 가동 중' : '시스템 대기 중'}
             </div>
             {state.isMonitoring && (
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    <Clock size={14} />
                    <span>자동 갱신: 2시간</span>
                 </div>
             )}
          </div>
        </section>

        {/* Console Log */}
        <section>
             <Logger logs={logs} />
        </section>

        {/* Report Display */}
        {state.report ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Executive Summary Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles size={120} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-indigo-300 font-mono text-sm uppercase tracking-wider">
                        <ShieldAlert size={16} />
                        핵심 요약 보고서
                    </div>
                    <p className="text-xl md:text-2xl font-serif leading-relaxed text-indigo-50 mb-8">
                        {state.report.overallSummary}
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-4 border-t border-indigo-800/50 pt-6">
                        {state.report.topTrends.map((trend, i) => (
                            <div key={i} className="bg-white/5 rounded-lg p-4 backdrop-blur-sm">
                                <span className="text-indigo-400 font-bold text-lg mb-1 block">0{i+1}</span>
                                <span className="font-medium text-indigo-100">{trend}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Articles Grid */}
            <div className="grid md:grid-cols-2 gap-6">
               {state.report.articles.map((article, idx) => (
                   <ArticleCard key={idx} article={article} />
               ))}
            </div>

          </div>
        ) : (
            // Empty State
            !state.isLoading && (
                <div className="text-center py-20 text-slate-400">
                    <Rss size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg">RSS URL을 입력하고 모니터링을 시작하여 보고서를 생성하세요.</p>
                </div>
            )
        )}
        
        {state.isLoading && !state.report && (
            <div className="text-center py-20">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-600 animate-pulse">Gemini AI가 피드 내용을 분석 중입니다...</p>
            </div>
        )}

      </main>
    </div>
  );
}
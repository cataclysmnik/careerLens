'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Award,
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  HelpCircle,
} from 'lucide-react';
import type { InterviewMessage, InterviewProject } from '@/lib/interview/engine';

interface InterviewChatProps {
  sessionId: string;
  project: InterviewProject;
  interviewerType: string;
  roleFocus: string;
  initialMessages: InterviewMessage[];
  suggestedFocusAreas?: string[];
  onFinishSession: () => Promise<void>;
  onBackToSelect: () => void;
  isFinishing: boolean;
}

export function InterviewChat({
  sessionId,
  project,
  interviewerType,
  roleFocus,
  initialMessages,
  suggestedFocusAreas = [],
  onFinishSession,
  onBackToSelect,
  isFinishing,
}: InterviewChatProps) {
  const [messages, setMessages] = useState<InterviewMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const candidateTurns = messages.filter((m) => m.role === 'user').length;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isSending || isFinishing) return;

    const userText = input.trim();
    setInput('');
    setError(null);

    // Optimistically add user turn
    const optimisticUserMsg: InterviewMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setIsSending(true);

    try {
      const res = await fetch('/api/interview/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: userText,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to send response');
      }

      if (json.data?.session?.messages) {
        setMessages(json.data.session.messages);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error sending message. Please retry.');
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPersonaBadge = () => {
    switch (interviewerType) {
      case 'bar_raiser':
        return { label: 'FAANG Bar Raiser', color: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800' };
      case 'friendly':
        return { label: 'Senior Mentor', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
      default:
        return { label: 'Pragmatic Tech Lead', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' };
    }
  };

  const personaBadge = getPersonaBadge();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Chat Room Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-950/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToSelect}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            title="Leave Session"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 dark:text-white text-base">
                {project.title}
              </h2>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${personaBadge.color}`}>
                {personaBadge.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                {roleFocus.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {candidateTurns} {candidateTurns === 1 ? 'answer' : 'answers'} recorded
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onFinishSession}
            disabled={isFinishing || candidateTurns === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              candidateTurns >= 2
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/20'
                : 'bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={candidateTurns === 0 ? 'Answer at least one question to generate evaluation' : 'Conclude interview and generate score report & resume rewrites'}
          >
            {isFinishing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Evaluating & Generating Rewrites...
              </>
            ) : (
              <>
                <Award className="w-4 h-4" />
                Conclude & Get Resume Rewrites
              </>
            )}
          </button>
        </div>
      </div>

      {/* Suggested Focus Areas Banner (only in early turns) */}
      {candidateTurns === 0 && suggestedFocusAreas.length > 0 && (
        <div className="px-6 py-2.5 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
          <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="font-semibold">Suggested to cover:</span>
          <div className="flex flex-wrap gap-1.5">
            {suggestedFocusAreas.map((area, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[11px] font-medium"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => {
          const isBot = msg.role === 'assistant';
          return (
            <div
              key={msg.id || idx}
              className={`flex gap-3.5 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  isBot
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-gray-700 to-zinc-900 text-white dark:from-zinc-700 dark:to-zinc-800'
                }`}
              >
                {isBot ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[80%] space-y-2 ${isBot ? 'text-left' : 'text-right'}`}>
                <div
                  className={`inline-block p-4 rounded-2xl text-sm leading-relaxed text-left shadow-sm ${
                    isBot
                      ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 border border-gray-200/60 dark:border-zinc-700/60'
                      : 'bg-blue-600 text-white dark:bg-blue-600'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Inline Coach Feedback on Candidate's response */}
                {isBot && msg.critique && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                    <span>
                      <strong className="font-semibold">Coach Feedback: </strong>
                      {msg.critique}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 rounded-2xl bg-gray-100 dark:bg-zinc-800 border border-gray-200/60 dark:border-zinc-700/60 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span>Analyzing your response & formulating next technical probe...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error notification */}
      {error && (
        <div className="px-6 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs border-t border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {/* Input Box Bar */}
      <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="relative rounded-xl border border-gray-300 dark:border-zinc-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 bg-gray-50/50 dark:bg-zinc-950/50 transition-all">
            <textarea
              ref={textareaRef}
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending || isFinishing}
              placeholder={`Answer the interviewer's question about ${project.title}... (e.g. mention architecture decisions, trade-offs, metrics, or bugs solved)`}
              className="w-full p-3.5 text-sm bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />

            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-zinc-800/80 text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <span>💡 Tip: Press</span>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 font-mono text-[10px] text-gray-600 dark:text-gray-300">
                  Enter
                </kbd>
                <span>to send,</span>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 font-mono text-[10px] text-gray-600 dark:text-gray-300">
                  Shift+Enter
                </kbd>
                <span>for new line</span>
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isSending || isFinishing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Send Response</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

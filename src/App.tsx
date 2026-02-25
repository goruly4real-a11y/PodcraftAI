/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Speaker } from './types';
import SpeakerManager from './components/SpeakerManager';
import PodcastGenerator from './components/PodcastGenerator';
import { Mic, Radio, Settings2, Info } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [selectedSpeakers, setSelectedSpeakers] = useState<Speaker[]>([]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-bottom border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">PodCraft <span className="text-indigo-600">AI</span></h1>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Studio Edition</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors">Dashboard</a>
            <a href="#" className="text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors">Library</a>
            <a href="#" className="text-sm font-medium text-zinc-600 hover:text-indigo-600 transition-colors">Community</a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors">
              <Settings2 className="w-5 h-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-white shadow-sm" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 text-white p-8 md:p-16">
          <div className="relative z-10 max-w-2xl space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              Next-Gen Audio Generation
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold leading-[1.1] tracking-tight"
            >
              Turn any content into a <span className="text-indigo-400 italic font-serif">crafted</span> podcast.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-zinc-400 leading-relaxed"
            >
              Upload PDFs, images, or paste text. Choose your speakers, set their personality, and let AI handle the rest.
            </motion.p>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/20 to-transparent pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        </section>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">How it works:</p>
            <p className="opacity-80">1. Select or create two speakers below. 2. Provide your content. 3. Generate a full conversational podcast script and audio.</p>
          </div>
        </div>

        {/* Speaker Management Section */}
        <section className="space-y-8">
          <SpeakerManager 
            onSelectSpeakers={setSelectedSpeakers} 
            selectedSpeakerIds={selectedSpeakers.map(s => s.id!)} 
          />
        </section>

        {/* Generator Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-[0.3em]">Generation Studio</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          
          <PodcastGenerator selectedSpeakers={selectedSpeakers} />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5 opacity-50 grayscale">
            <Mic className="w-5 h-5" />
            <span className="font-bold tracking-tight">PodCraft AI</span>
          </div>
          <p className="text-sm text-zinc-500">© 2026 PodCraft AI Studio. Powered by Gemini 2.5 Native Audio.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">Privacy</a>
            <a href="#" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">Terms</a>
            <a href="#" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">Support</a>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E4E4E7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D4D4D8;
        }
      `}</style>
    </div>
  );
}

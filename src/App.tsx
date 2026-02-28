/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Speaker } from './types';
import SpeakerManager from './components/SpeakerManager';
import PodcastGenerator from './components/PodcastGenerator';
import FeaturedPodcasts from './components/FeaturedPodcasts';
import TutorialModal from './components/TutorialModal';
import { Mic, Radio, Settings2, Info, LogOut, Crown, Loader2, Download, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './context/AuthContext';
import Auth from './components/Auth';

export default function App() {
  const [selectedSpeakers, setSelectedSpeakers] = useState<Speaker[]>([]);
  const { user, loading, signOut, isPro, upgradeToPro } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Check for first-time visit
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleStartCreating = () => {
    if (user) {
      document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowAuthModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-indigo-100 selection:text-indigo-900 relative">
      <TutorialModal isOpen={showTutorial} onClose={handleCloseTutorial} />
      
      <AnimatePresence>
        {showAuthModal && !user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAuthModal(false);
            }}
          >
            <div className="relative w-full max-w-md my-8">
              <Auth isModal onClose={() => setShowAuthModal(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-zinc-200 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-serif italic">PodCraft</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse`} />
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                  {isPro ? 'Pro Studio' : 'Studio v2.5'}
                </p>
              </div>
            </div>
          </motion.div>
          
          <nav className="hidden md:flex items-center gap-10">
            {['Dashboard', 'Library', 'Community'].map((item) => (
              <a 
                key={item}
                href="#" 
                className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-zinc-900 transition-all group-hover:w-full" />
              </a>
            ))}
            <button 
              onClick={() => setShowTutorial(true)}
              className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              Tutorial
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all"
              >
                <Download className="w-4 h-4" />
                Install App
              </button>
            )}
            {!isPro && user && (
              <button 
                onClick={upgradeToPro}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:scale-105 transition-all"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Pro
              </button>
            )}
            
            <div className="flex items-center gap-2 pl-4 border-l border-zinc-200">
              {user ? (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-zinc-900">{user.email}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{isPro ? 'Pro Plan' : 'Free Plan'}</p>
                  </div>
                  <button 
                    onClick={signOut}
                    className="p-2.5 text-zinc-400 hover:text-red-500 transition-colors hover:bg-red-50 rounded-xl"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Hero Section */}
          <section className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 text-[10px] font-bold uppercase tracking-widest"
                >
                  <Radio className="w-3 h-3 text-indigo-500 animate-pulse" />
                  Next-Gen Audio Synthesis
                </motion.div>
                
                <div className="space-y-4">
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-6xl md:text-8xl font-bold leading-[0.9] tracking-tighter text-zinc-900"
                  >
                    Craft your <br />
                    <span className="text-zinc-400 italic font-serif">narrative.</span>
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-zinc-500 leading-relaxed max-w-lg"
                  >
                    Transform raw content into professional, multi-speaker podcasts with human-like realism and emotional depth.
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-4"
                >
                  <button 
                    onClick={handleStartCreating}
                    className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 hover:shadow-zinc-300 active:scale-95"
                  >
                    Start Creating
                  </button>
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-zinc-200 overflow-hidden">
                        <img src={`https://picsum.photos/seed/${i+10}/100/100`} alt="User" referrerPolicy="no-referrer" />
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                      +2k
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="relative aspect-square"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-[3rem] blur-3xl" />
                <div className="relative h-full w-full bg-white rounded-[3rem] border border-zinc-100 shadow-2xl overflow-hidden p-8">
                  <div className="h-full w-full rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col items-center justify-center space-y-6 text-center p-12">
                    <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center">
                      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                        <Mic className="w-8 h-8 text-indigo-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-zinc-900">Ready to Record</h4>
                      <p className="text-sm text-zinc-400">Select your speakers and provide content to begin the synthesis process.</p>
                    </div>
                    <div className="flex gap-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-12 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <motion.div 
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                            className="w-full h-full bg-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </div>

        <FeaturedPodcasts />

        {/* Main Content Sections */}
        {user && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-32">
            {/* Speaker Management Section */}
            <motion.section 
              id="workspace"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-bold tracking-tight text-zinc-900">Speaker Library</h3>
                <p className="text-zinc-500">Curate your cast with pre-built voices or custom cloned profiles.</p>
              </div>
              <SpeakerManager 
                onSelectSpeakers={setSelectedSpeakers} 
                selectedSpeakerIds={selectedSpeakers.map(s => s.id!)} 
              />
            </motion.section>

            {/* Generator Section */}
            <motion.section 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <div className="space-y-2">
                <h3 className="text-3xl font-bold tracking-tight text-zinc-900">Podcast Generator</h3>
                <p className="text-zinc-500">Synthesize your script into a high-fidelity audio experience.</p>
              </div>
              <PodcastGenerator selectedSpeakers={selectedSpeakers} />
            </motion.section>
          </div>
        )}
      </main>

      <footer className="bg-zinc-50 border-t border-zinc-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-serif italic font-bold text-zinc-900">PodCraft AI</span>
          </div>
          <p className="text-sm text-zinc-400">© 2026 PodCraft Studio. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Support'].map(item => (
              <a key={item} href="#" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Play, Heart, Loader2, Star, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGenerating: boolean;
  type: 'preview' | 'podcast';
}

export default function GenerationModal({ isOpen, onClose, isGenerating, type }: GenerationModalProps) {
  const [showAd, setShowAd] = useState(false);
  const [adTimer, setAdTimer] = useState(15);
  const [adWatched, setAdWatched] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showAd && adTimer > 0) {
      interval = setInterval(() => {
        setAdTimer((prev) => prev - 1);
      }, 1000);
    } else if (adTimer === 0) {
      setAdWatched(true);
    }
    return () => clearInterval(interval);
  }, [showAd, adTimer]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowAd(false);
      setAdTimer(15);
      setAdWatched(false);
    }
  }, [isOpen]);

  // Auto-close when generation finishes (optional, or let user close)
  // We'll let the user close it manually or have the parent handle it, 
  // but typically we want to show the result immediately.
  // For this UX, we might want to keep it open until they close it OR generation finishes.

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  Generating {type === 'preview' ? 'Preview' : 'Podcast'}...
                </>
              ) : (
                <>
                  <Star className="w-5 h-5 text-emerald-400" />
                  Ready!
                </>
              )}
            </h3>
            {!isGenerating && (
              <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {!showAd ? (
              <div className="text-center space-y-4">
                <p className="text-zinc-300">
                  {isGenerating 
                    ? `Your ${type} is being created. This usually takes a few ${type === 'preview' ? 'seconds' : 'moments'}.`
                    : "Generation complete! You can now listen to your audio."}
                </p>
                
                {isGenerating && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                    <h4 className="text-indigo-300 font-medium mb-2 flex items-center justify-center gap-2">
                      <Heart className="w-4 h-4" /> Support PodCraft
                    </h4>
                    <p className="text-sm text-zinc-400 mb-4">
                      While you wait, would you mind watching a short message from our sponsors? It helps keep this tool free!
                    </p>
                    <button
                      onClick={() => setShowAd(true)}
                      className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" /> Watch Short Ad
                    </button>
                  </div>
                )}

                {!isGenerating && (
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                  >
                    Listen Now
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center relative overflow-hidden group">
                  {/* Simulated Ad Content */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col items-center justify-center text-white p-6">
                    <Coffee className="w-12 h-12 mb-4 text-indigo-300" />
                    <h4 className="text-xl font-bold mb-2">PodCraft Pro</h4>
                    <p className="text-sm text-indigo-200 mb-4">Unlock unlimited generations, custom voices, and 1-hour episodes.</p>
                    <div className="text-xs font-mono bg-black/30 px-2 py-1 rounded">
                      ADVERTISEMENT
                    </div>
                  </div>
                  
                  {/* Timer Overlay */}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded-full font-mono">
                    {adWatched ? "Reward Granted" : `Ending in ${adTimer}s`}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-zinc-500">
                    {adWatched ? "Thanks for your support!" : "Video playing..."}
                  </p>
                  {adWatched && (
                    <button
                      onClick={() => setShowAd(false)}
                      className="text-sm text-zinc-400 hover:text-white underline"
                    >
                      Close Ad
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

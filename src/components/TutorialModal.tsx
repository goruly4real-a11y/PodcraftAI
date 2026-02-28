import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Upload, Layout, Zap, Radio, X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Welcome to PodCraft Studio",
    description: "Your personal AI audio production suite. Turn any text, PDF, or image into a professional, multi-speaker podcast in minutes.",
    icon: <Radio className="w-12 h-12 text-indigo-500" />,
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=400"
  },
  {
    title: "1. Curate Your Cast",
    description: "Start by selecting two speakers from our library. You can mix and match personalities (e.g., a Sarcastic Comedian vs. a Serious Professor) for dynamic chemistry.",
    icon: <Mic className="w-12 h-12 text-rose-500" />,
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=400"
  },
  {
    title: "2. Provide Source Material",
    description: "Upload PDFs, images of charts, or paste raw text. Our AI analyzes the content to write a script that sounds natural and human.",
    icon: <Upload className="w-12 h-12 text-amber-500" />,
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=400"
  },
  {
    title: "3. Choose Your Workflow",
    description: "Use 'Quick Mode' for fast results, or 'Scripting Tool' to direct the conversation segment-by-segment (e.g., Intro -> Debate -> Conclusion).",
    icon: <Layout className="w-12 h-12 text-emerald-500" />,
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=400"
  },
  {
    title: "4. Generate & Download",
    description: "Click 'Generate Master Audio'. The AI will write the script, design cover art, and synthesize the voices. You can then download the WAV file.",
    icon: <Zap className="w-12 h-12 text-violet-500" />,
    image: "https://images.unsplash.com/photo-1478737270239-2f02b77ac6d5?auto=format&fit=crop&q=80&w=400"
  }
];

export default function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset step when opening
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
        >
          {/* Image Side */}
          <div className="w-full md:w-1/2 bg-zinc-100 relative h-64 md:h-auto">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentStep}
                src={STEPS[currentStep].image}
                alt={STEPS[currentStep].title}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:bg-gradient-to-r" />
            
            <div className="absolute bottom-6 left-6 text-white md:hidden">
              <div className="flex gap-1 mb-2">
                {STEPS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all ${i === currentStep ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Content Side */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-white relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-8 mt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-zinc-100">
                    {STEPS[currentStep].icon}
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-zinc-900 tracking-tight leading-tight">
                      {STEPS[currentStep].title}
                    </h2>
                    <p className="text-zinc-500 leading-relaxed text-lg">
                      {STEPS[currentStep].description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between mt-12 pt-8 border-t border-zinc-100">
              <div className="hidden md:flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-zinc-900' : 'w-2 bg-zinc-200'}`} 
                  />
                ))}
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                {currentStep > 0 && (
                  <button
                    onClick={handlePrev}
                    className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex-1 md:flex-none px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-200"
                >
                  {currentStep === STEPS.length - 1 ? "Get Started" : "Next"}
                  {currentStep < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

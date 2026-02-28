import React, { useState, useRef, useEffect } from 'react';
import ScriptingTool from './ScriptingTool';
import { Speaker, PodcastScript, PodcastSegment } from '../types';
import { generatePodcastScript, generatePodcastAudio, generatePodcastCover, suggestSegmentNotes } from '../services/geminiService';
import { FileText, Image as ImageIcon, Upload, Play, Pause, Loader2, Music, CheckCircle2, AlertCircle, Download, StickyNote, Layout, Zap, Info, FileJson, Mic, Trash2, Clock, Radio, Lock, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createWavBlob } from '../utils/audioUtils';
import { useAuth } from '../context/AuthContext';
import GenerationModal from './GenerationModal';

interface PodcastGeneratorProps {
  selectedSpeakers: Speaker[];
}

export default function PodcastGenerator({ selectedSpeakers }: PodcastGeneratorProps) {
  const { isPro, upgradeToPro, canGenerate, dailyLimit, profile, incrementGenerations } = useAuth();
  const [inputText, setInputText] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('3 minutes');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: 'pdf' | 'image' }[]>([]);
  const [segments, setSegments] = useState<PodcastSegment[]>([]);
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queue State
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null);

  useEffect(() => {
    if (queuePosition !== null && queuePosition > 0) {
      const timer = setTimeout(() => {
        setQueuePosition(prev => (prev && prev > 1 ? prev - 1 : 0));
        setEstimatedWaitTime(prev => (prev && prev > 0.5 ? prev - 0.5 : 0));
      }, 2000); // Simulate queue movement every 2 seconds
      return () => clearTimeout(timer);
    } else if (queuePosition === 0) {
      // Queue finished, start generation
      setQueuePosition(null);
      setEstimatedWaitTime(null);
      startGeneration();
    }
  }, [queuePosition]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length + uploadedFiles.length > 40) {
      alert("Maximum 40 files allowed in total.");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImages(prev => [...prev, reader.result as string]);
        setUploadedFiles(prev => [...prev, { name: file.name, type: 'image' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length + uploadedFiles.length > 40) {
      alert("Maximum 40 files allowed in total.");
      return;
    }

    if (files.length > 0) {
      setIsProcessing(true);
      setStatus(`Extracting text from ${files.length} PDF(s)...`);
      const formData = new FormData();
      files.forEach(file => formData.append('pdfs', file));

      try {
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) {
          throw new Error('Server unavailable');
        }

        const data = await res.json();
        if (data.results) {
          const combinedText = data.results.map((r: any) => `--- Content from ${r.name} ---\n${r.text}`).join('\n\n');
          setInputText(prev => prev + (prev ? '\n\n' : '') + combinedText);
          setUploadedFiles(prev => [...prev, ...data.results.map((r: any) => ({ name: r.name, type: 'pdf' }))]);
          setStatus('PDFs extracted successfully.');
        }
      } catch (error) {
        console.warn("PDF extraction failed (likely static mode)", error);
        alert("Server-side PDF parsing is unavailable in this demo environment. Please copy and paste the text content directly.");
        setStatus('');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    if (fileToRemove.type === 'image') {
      // Find the index in selectedImages. This is a bit tricky since we don't store names there.
      // Let's find the image's position among other images.
      const imageIndex = uploadedFiles.slice(0, index).filter(f => f.type === 'image').length;
      setSelectedImages(prev => prev.filter((_, i) => i !== imageIndex));
    }
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (selectedSpeakers.length !== 2) {
      alert("Please select exactly 2 speakers.");
      return;
    }
    if (!inputText && selectedImages.length === 0 && segments.length === 0) {
      alert("Please provide some content or structure your podcast segments.");
      return;
    }

    if (!isPro) {
      // Free User Queue Logic
      // Simulate a random queue position between 5 and 20
      const position = Math.floor(Math.random() * 15) + 5;
      setQueuePosition(position);
      // Estimate 30 seconds per person ahead
      setEstimatedWaitTime(Math.ceil((position * 30) / 60)); 
      return;
    }

    // Pro User: Skip Queue
    startGeneration();
  };

  const startGeneration = async () => {
    setIsProcessing(true);
    setIsModalOpen(true);
    setAudioBlob(null);
    setScript(null);

    try {
      setStatus('Generating script and show notes...');
      const generatedScript = await generatePodcastScript(
        inputText, 
        duration, 
        notes, 
        selectedImages, 
        selectedSpeakers,
        mode === 'advanced' ? segments : undefined
      );

      setStatus('Designing podcast cover art...');
      const coverUrl = await generatePodcastCover(generatedScript.title, inputText || segments.map(s => s.notes).join(' '));
      generatedScript.coverImageUrl = coverUrl;
      
      setScript(generatedScript);

      setStatus('Generating audio (this may take a moment)...');
      const audioBase64 = await generatePodcastAudio(
        generatedScript, 
        selectedSpeakers,
        (current, total) => setStatus(`Generating audio part ${current} of ${total}...`)
      );
      
      if (audioBase64) {
        // Convert base64 to Uint8Array
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create WAV blob immediately and store it
        const wavBlob = createWavBlob(bytes.buffer, 24000);
        setAudioBlob(wavBlob);
        
        // Stop any currently playing audio
        if ((window as any).currentPodcastAudio) {
          ((window as any).currentPodcastAudio as HTMLAudioElement).pause();
        }
        
        // Play using standard HTML Audio element
        const url = URL.createObjectURL(wavBlob);
        const audio = new Audio(url);
        audio.onended = () => setIsPlaying(false);
        (window as any).currentPodcastAudio = audio;
        
        audio.play();
        setIsPlaying(true);
        setStatus('Podcast ready!');
        
        if (!isPro) {
          incrementGenerations();
        }
      }
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message || 'Failed to generate podcast.'}`);
      setIsModalOpen(false); // Close on error so they can retry
    } finally {
      setIsProcessing(false);
      // Keep modal open to show "Ready" state until user closes it
    }
  };

  const downloadAudio = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script?.title || 'podcast'}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const downloadCover = () => {
    if (!script?.coverImageUrl) return;
    const a = document.createElement('a');
    a.href = script.coverImageUrl;
    a.download = `${script.title || 'podcast'}-cover.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const togglePlayback = () => {
    const audio = (window as any).currentPodcastAudio as HTMLAudioElement;
    if (audio) {
      if (audio.paused) {
        audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="space-y-12">
      <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-2xl shadow-zinc-100 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                <Mic className="w-5 h-5 text-white" />
              </div>
              Generation Studio
            </h2>
            <p className="text-sm text-zinc-500">Select your creative workflow and provide source material.</p>
          </div>

          <div className="flex p-1.5 bg-zinc-50 border border-zinc-100 rounded-2xl w-fit">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('quick')}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-[14px] text-xs font-bold uppercase tracking-widest transition-all ${
                mode === 'quick' ? 'bg-white text-zinc-900 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-100' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Zap className="w-4 h-4" />
              Quick Mode
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode('advanced')}
              className={`flex items-center gap-2.5 px-6 py-2.5 rounded-[14px] text-xs font-bold uppercase tracking-widest transition-all ${
                mode === 'advanced' ? 'bg-white text-zinc-900 shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-100' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Layout className="w-4 h-4" />
              Scripting Tool
            </motion.button>
          </div>
        </div>

        {mode === 'quick' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  Source Material
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-100 rounded-[2rem] cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-all group">
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6 text-zinc-400 group-hover:text-zinc-900" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-600">Upload PDFs</span>
                    <input type="file" accept=".pdf" multiple className="hidden" onChange={handlePdfUpload} />
                  </label>
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-100 rounded-[2rem] cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-all group">
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6 text-zinc-400 group-hover:text-zinc-900" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-600">Upload Images</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Knowledge Base ({uploadedFiles.length}/10)</label>
                  <div className="grid grid-cols-1 gap-2">
                    <AnimatePresence>
                      {uploadedFiles.map((file, idx) => (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-2xl group"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                              {file.type === 'pdf' ? <FileText className="w-4 h-4 text-red-500" /> : <ImageIcon className="w-4 h-4 text-blue-500" />}
                            </div>
                            <span className="text-xs font-bold text-zinc-600 truncate">{file.name}</span>
                          </div>
                          <button 
                            onClick={() => removeFile(idx)}
                            className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {selectedImages.length > 0 && (
                <div className="grid grid-cols-5 gap-3">
                  {selectedImages.map((img, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative aspect-square rounded-xl overflow-hidden border border-zinc-100 shadow-sm"
                    >
                      <img src={img} alt={`Selected ${idx}`} className="w-full h-full object-cover" />
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" />
                  Creative Direction
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full h-32 px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-zinc-500/5 resize-none text-sm text-zinc-700 placeholder:text-zinc-300 transition-all"
                  placeholder="e.g. Use simpler English, include a heated debate with interruptions, add some friendly banter and laughing..."
                />
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Target Duration
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: '3 minutes', label: '3 Min', pro: false },
                    { val: '5 minutes', label: '5 Min', pro: false },
                    { val: '15 minutes', label: '15 Min', pro: false },
                    { val: '30 minutes', label: '30 Min', pro: false },
                    { val: '1 hour', label: '1 Hr', pro: false },
                    { val: '2 hours', label: '2 Hr', pro: true }
                  ].map(d => (
                    <motion.button
                      key={d.val}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (d.pro && !isPro) {
                          upgradeToPro();
                          return;
                        }
                        setDuration(d.val);
                      }}
                      className={`relative py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border overflow-hidden ${
                        duration === d.val 
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xl shadow-zinc-200' 
                          : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200'
                      }`}
                    >
                      {d.label}
                      {d.pro && !isPro && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
                          <Lock className="w-3 h-3 text-zinc-400" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Text Content
                </label>
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  className="w-full h-full min-h-[300px] px-6 py-6 bg-zinc-50 border border-zinc-100 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-zinc-500/5 resize-none text-sm text-zinc-700 placeholder:text-zinc-300 transition-all"
                  placeholder="Paste text here or upload a file..."
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <ScriptingTool 
                  segments={segments} 
                  setSegments={setSegments} 
                  speakers={selectedSpeakers} 
                  content={inputText}
                />
              </div>
              <div className="space-y-8">
                <div className="bg-zinc-50 p-8 rounded-[2.5rem] border border-zinc-100 space-y-8">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Global Settings</h4>
                  
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Total Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: '3 minutes', label: '3 Min', pro: false },
                        { val: '5 minutes', label: '5 Min', pro: false },
                        { val: '15 minutes', label: '15 Min', pro: false },
                        { val: '30 minutes', label: '30 Min', pro: false },
                        { val: '1 hour', label: '1 Hr', pro: false },
                        { val: '2 hours', label: '2 Hr', pro: true }
                      ].map(d => (
                        <motion.button
                          key={d.val}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (d.pro && !isPro) {
                              upgradeToPro();
                              return;
                            }
                            setDuration(d.val);
                          }}
                          className={`relative py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border overflow-hidden ${
                            duration === d.val 
                              ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-200' 
                              : 'bg-white text-zinc-400 border-zinc-100 hover:border-zinc-200'
                          }`}
                        >
                          {d.label}
                          {d.pro && !isPro && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
                              <Lock className="w-3 h-3 text-zinc-400" />
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                      <StickyNote className="w-3.5 h-3.5" />
                      Global Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full h-32 px-4 py-3 bg-white border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-zinc-500/5 text-sm text-zinc-700 placeholder:text-zinc-300 transition-all resize-none"
                      placeholder="Overall instructions..."
                    />
                  </div>
                </div>

                <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white space-y-4 shadow-2xl shadow-zinc-200">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Info className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Pro Tip</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                    The Scripting Tool allows you to define the exact flow. Use Quick Mode for base knowledge, then switch here to structure the debate.
                  </p>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      Human Realism Active
                    </p>
                    <p className="text-[10px] text-zinc-500 leading-tight">
                      AI now supports natural interruptions, laughing, fillers ("um", "uh"), and breath sounds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-8 border-t border-zinc-100">
          <div className="flex items-center gap-3">
            {isProcessing ? (
              <div className="flex items-center gap-3 text-sm text-zinc-900 font-bold uppercase tracking-widest">
                <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                {status}
              </div>
            ) : status.startsWith('Error') ? (
              <div className="flex items-center gap-2 text-xs font-bold text-red-600 uppercase tracking-widest bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {status}
              </div>
            ) : status ? (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                {status}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                  Ready to synthesize
                </div>
                {!isPro && (
                  <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-zinc-100 rounded-lg text-zinc-500">
                    Daily Limit: {profile?.daily_generation_count || 0}/{dailyLimit}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <motion.button
            whileHover={{ scale: canGenerate ? 1.02 : 1 }}
            whileTap={{ scale: canGenerate ? 0.98 : 1 }}
            onClick={canGenerate ? handleGenerate : upgradeToPro}
            disabled={isProcessing || selectedSpeakers.length !== 2}
            className={`px-10 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 shadow-2xl ${
              isProcessing || selectedSpeakers.length !== 2
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'
                : !canGenerate
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none' // Limit reached style
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-200'
            }`}
          >
            {isProcessing ? (
              <span>Processing...</span>
            ) : !canGenerate ? (
              <>
                <Lock className="w-5 h-5" />
                <span>Daily Limit Reached</span>
              </>
            ) : (
              <>
                <Radio className="w-5 h-5" />
                <span>Generate Master Audio</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {queuePosition !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-zinc-900">High Demand</h3>
                <p className="text-zinc-500">
                  Our servers are currently busy. You have been placed in the queue.
                </p>
              </div>

              <div className="bg-zinc-50 rounded-2xl p-6 space-y-4 border border-zinc-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Position</span>
                  <span className="text-xl font-bold text-zinc-900">#{queuePosition}</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-amber-500"
                    initial={{ width: "100%" }}
                    animate={{ width: `${Math.max(5, 100 - (queuePosition * 5))}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Est. Wait</span>
                  <span className="text-sm font-bold text-zinc-600">~{Math.ceil(estimatedWaitTime || 0)} mins</span>
                </div>
              </div>

              <button
                onClick={upgradeToPro}
                className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5 text-amber-400" />
                Skip Queue with Pro
              </button>
              
              <button
                onClick={() => {
                  setQueuePosition(null);
                  setEstimatedWaitTime(null);
                }}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest"
              >
                Cancel & Wait Later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {script && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-12"
          >
            <div className="lg:col-span-2 space-y-12">
              <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-2xl shadow-zinc-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                  <div className="space-y-2">
                    <h3 className="text-4xl font-bold text-zinc-900 tracking-tighter font-serif italic">{script.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[10px] font-bold uppercase tracking-widest">Mastered Audio</span>
                      <span className="text-zinc-200">•</span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{script.lines.length} Lines Generated</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {script.coverImageUrl && (
                      <button
                        onClick={downloadCover}
                        className="flex items-center gap-2 px-5 py-2.5 bg-zinc-50 text-zinc-600 rounded-2xl hover:bg-zinc-100 transition-all text-sm font-bold border border-zinc-100"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Cover
                      </button>
                    )}
                    {audioBlob && (
                      <button
                        onClick={downloadAudio}
                        className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 transition-all text-sm font-bold shadow-xl shadow-zinc-200"
                      >
                        <Download className="w-4 h-4" />
                        Export WAV
                      </button>
                    )}
                  </div>
                </div>

                {script.showNotes && (
                  <div className="mb-12 p-8 bg-zinc-50/50 rounded-[2rem] border border-zinc-100/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <FileJson className="w-20 h-20" />
                    </div>
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <StickyNote className="w-3.5 h-3.5" />
                      Episode Summary & Notes
                    </h4>
                    <p className="text-base text-zinc-600 leading-relaxed whitespace-pre-wrap relative z-10">
                      {script.showNotes}
                    </p>
                  </div>
                )}

                <div className="space-y-8 max-h-[700px] overflow-y-auto pr-6 custom-scrollbar">
                  {script.lines.map((line, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      viewport={{ once: true }}
                      className="group"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">{line.speakerName}</span>
                        <div className="h-px flex-1 bg-zinc-50 group-hover:bg-indigo-50 transition-colors" />
                      </div>
                      <p className="text-zinc-700 leading-relaxed text-lg">{line.text}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-zinc-900 text-white p-10 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] sticky top-24 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <div className="relative z-10 space-y-10">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {script.coverImageUrl ? (
                      <img src={script.coverImageUrl} alt="Cover" className="w-48 h-48 rounded-[2rem] object-cover shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700" />
                    ) : (
                      <div className="w-48 h-48 bg-zinc-800 rounded-[2rem] flex items-center justify-center shadow-2xl">
                        <Music className="w-16 h-16 text-zinc-700" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-xl font-bold tracking-tight mb-1">{script.title}</h4>
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Master Recording</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex justify-center">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={togglePlayback}
                        className="w-24 h-24 bg-white text-zinc-900 rounded-full flex items-center justify-center shadow-2xl hover:bg-zinc-50 transition-colors"
                      >
                        {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                      </motion.button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Live Preview
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden p-0.5">
                        <motion.div 
                          className="h-full bg-white rounded-full"
                          animate={{ width: isPlaying ? '100%' : '0%' }}
                          transition={{ duration: 60, ease: 'linear' }}
                        />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-zinc-800/50">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Cast Members</p>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedSpeakers.map(s => (
                          <div key={s.id} className="flex flex-col items-center text-center space-y-2">
                            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-sm font-bold text-zinc-400 border border-zinc-700/50">
                              {s.name[0]}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold truncate w-full">{s.name}</p>
                              <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">{s.profession}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <GenerationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        isGenerating={isProcessing} 
        type="podcast"
      />
    </div>
  );
}

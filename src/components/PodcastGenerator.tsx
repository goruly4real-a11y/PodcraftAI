import React, { useState, useRef } from 'react';
import { Speaker, PodcastScript } from '../types';
import { generatePodcastScript, generatePodcastAudio } from '../services/geminiService';
import { FileText, Image as ImageIcon, Upload, Play, Pause, Loader2, Music, CheckCircle2, AlertCircle, Download, StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PodcastGeneratorProps {
  selectedSpeakers: Speaker[];
}

export default function PodcastGenerator({ selectedSpeakers }: PodcastGeneratorProps) {
  const [inputText, setInputText] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('5 minutes');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [script, setScript] = useState<PodcastScript | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setStatus('Extracting text from PDF...');
      const formData = new FormData();
      formData.append('pdf', file);

      try {
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.text) {
          setInputText(data.text);
          setStatus('PDF text extracted successfully.');
        }
      } catch (error) {
        console.error(error);
        setStatus('Failed to extract PDF.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleGenerate = async () => {
    if (selectedSpeakers.length !== 2) {
      alert("Please select exactly 2 speakers.");
      return;
    }
    if (!inputText && !selectedImage) {
      alert("Please provide some content (text, image, or PDF).");
      return;
    }

    setIsProcessing(true);
    setAudioBlob(null);
    setScript(null);

    try {
      setStatus('Generating script...');
      const generatedScript = await generatePodcastScript(inputText, duration, notes, selectedImage || undefined, selectedSpeakers);
      setScript(generatedScript);

      setStatus('Generating audio (this may take a moment)...');
      const audioBase64 = await generatePodcastAudio(generatedScript, selectedSpeakers);
      
      if (audioBase64) {
        const res = await fetch(`data:audio/pcm;base64,${audioBase64}`);
        const blob = await res.blob();
        setAudioBlob(blob);
        
        // Play audio
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const arrayBuffer = await blob.arrayBuffer();
        const float32Array = new Float32Array(arrayBuffer.byteLength / 2);
        const view = new DataView(arrayBuffer);
        for (let i = 0; i < float32Array.length; i++) {
          float32Array[i] = view.getInt16(i * 2, true) / 32768;
        }
        
        const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        (window as any).currentPodcastSource = source;
        (window as any).currentPodcastContext = audioContext;
        
        source.onended = () => setIsPlaying(false);
        source.start();
        setIsPlaying(true);
        setStatus('Podcast ready!');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error generating podcast.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAudio = async () => {
    if (!audioBlob) return;

    // Convert PCM to WAV for downloading
    const arrayBuffer = await audioBlob.arrayBuffer();
    const wavBlob = createWavBlob(arrayBuffer, 24000);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script?.title || 'podcast'}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const createWavBlob = (pcmData: ArrayBuffer, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + pcmData.byteLength);
    const view = new DataView(buffer);

    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // file length
    view.setUint32(4, 36 + pcmData.byteLength, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, pcmData.byteLength, true);

    // write the PCM data
    const pcmView = new Uint8Array(pcmData);
    const wavView = new Uint8Array(buffer, 44);
    wavView.set(pcmView);

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const togglePlayback = () => {
    const ctx = (window as any).currentPodcastContext as AudioContext;
    if (ctx) {
      if (ctx.state === 'running') {
        ctx.suspend();
        setIsPlaying(false);
      } else {
        ctx.resume();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            Content Source
          </h2>
          <p className="text-sm text-zinc-500">Provide the text, image, or PDF you want to turn into a podcast.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group">
                <FileText className="w-8 h-8 text-zinc-400 group-hover:text-indigo-500 mb-2" />
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Upload PDF</span>
                <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
              </label>
              <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group">
                <ImageIcon className="w-8 h-8 text-zinc-400 group-hover:text-indigo-500 mb-2" />
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Upload Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            
            {selectedImage && (
              <div className="relative group">
                <img src={selectedImage} alt="Selected" className="w-full h-40 object-cover rounded-xl border border-zinc-200" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <AlertCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5" />
                Podcast Notes / Instructions
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-32 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-sm"
                placeholder="e.g. Use simpler English, talk about YouTube after, say something specific in the end..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Podcast Duration</label>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              >
                <option value="3 minutes">3 Minutes</option>
                <option value="5 minutes">5 Minutes</option>
                <option value="10 minutes">10 Minutes</option>
                <option value="15 minutes">15 Minutes</option>
                <option value="30 minutes">30 Minutes</option>
                <option value="45 minutes">45 Minutes</option>
                <option value="1 hour">1 Hour</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Text Content</label>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                className="w-full h-full min-h-[200px] px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none text-sm"
                placeholder="Paste text here or upload a file..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                {status}
              </div>
            ) : status ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {status}
              </div>
            ) : (
              <div className="text-sm text-zinc-400">Ready to generate</div>
            )}
          </div>
          
          <button
            onClick={handleGenerate}
            disabled={isProcessing || selectedSpeakers.length !== 2}
            className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              isProcessing || selectedSpeakers.length !== 2
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
            }`}
          >
            {isProcessing ? 'Generating...' : 'Generate Podcast'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {script && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-zinc-900 font-serif italic">{script.title}</h3>
                  {audioBlob && (
                    <button
                      onClick={downloadAudio}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl hover:bg-zinc-200 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download WAV
                    </button>
                  )}
                </div>
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                  {script.lines.map((line, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{line.speakerName}</span>
                      <p className="text-zinc-700 leading-relaxed">{line.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900 text-white p-8 rounded-3xl shadow-xl sticky top-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-indigo-500 rounded-xl">
                    <Music className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">Now Playing</h4>
                    <p className="text-xs text-zinc-400">Podcast Preview</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-center">
                    <button
                      onClick={togglePlayback}
                      className="w-20 h-20 bg-white text-zinc-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-2xl"
                    >
                      {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-xs font-mono text-zinc-500">
                      <span>00:00</span>
                      <span>LIVE</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-500"
                        animate={{ width: isPlaying ? '100%' : '0%' }}
                        transition={{ duration: 60, ease: 'linear' }}
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Featuring</p>
                    <div className="space-y-3">
                      {selectedSpeakers.map(s => (
                        <div key={s.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center text-xs font-bold">
                            {s.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-[10px] text-zinc-500">{s.profession}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

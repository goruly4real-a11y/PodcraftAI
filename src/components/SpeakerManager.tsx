import React, { useState, useEffect, useMemo } from 'react';
import { Speaker, Voice } from '../types';
import { generateSpeakerPreview } from '../services/geminiService';
import { createWavBlob } from '../utils/audioUtils';
import { DEFAULT_SPEAKERS } from '../data/defaultSpeakers';
import { Plus, Trash2, User, Mic2, Briefcase, MessageSquare, Quote, Activity, Search, Filter, Sliders, Volume2, FastForward, Heart, Upload, Mic, Users, Play, Loader2, StopCircle, Lock, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import GenerationModal from './GenerationModal';

interface SpeakerManagerProps {
  onSelectSpeakers: (speakers: Speaker[]) => void;
  selectedSpeakerIds: number[];
}

type Tab = 'all' | 'prebuilt' | 'custom';

export default function SpeakerManager({ onSelectSpeakers, selectedSpeakerIds }: SpeakerManagerProps) {
  const { isPro, canClone, incrementClones, upgradeToPro } = useAuth();
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneFeedback, setCloneFeedback] = useState<{message: string, type: 'success'|'warning'|'error'} | null>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<number | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newSpeaker, setNewSpeaker] = useState<Partial<Speaker>>({
    name: '',
    voice: Voice.Zephyr,
    profession: '',
    tone: '',
    mode: '',
    choiceOfWords: '',
    behavior: '',
    pitch: 'medium',
    speed: 'normal',
    emotion: 'neutral',
    gender: 'non-binary',
    accent: 'Neutral',
    language: 'English'
  });

  const voiceDescriptions = {
    [Voice.Zephyr]: { label: "Zephyr (Female / Soft)", pro: false },
    [Voice.Puck]: { label: "Puck (Male / Youthful)", pro: false },
    [Voice.Charon]: { label: "Charon (Male / Deep)", pro: true },
    [Voice.Kore]: { label: "Kore (Female / Professional)", pro: true },
    [Voice.Fenrir]: { label: "Fenrir (Male / Gruff)", pro: true }
  };

  const voiceGenders: Record<Voice, 'male' | 'female'> = {
    [Voice.Zephyr]: 'female',
    [Voice.Puck]: 'male',
    [Voice.Charon]: 'male',
    [Voice.Kore]: 'female',
    [Voice.Fenrir]: 'male'
  };

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const fetchSpeakers = async () => {
    try {
      const res = await fetch('/api/speakers');
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      setSpeakers(data);
    } catch (error) {
      console.warn('Backend API unavailable, falling back to local storage');
      const localCustom = JSON.parse(localStorage.getItem('custom_speakers') || '[]');
      setSpeakers([...DEFAULT_SPEAKERS, ...localCustom]);
    }
  };

  const filteredSpeakers = useMemo(() => {
    return speakers.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.profession.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'all' || 
                        (activeTab === 'prebuilt' && s.isPrebuilt) || 
                        (activeTab === 'custom' && !s.isPrebuilt);
      return matchesSearch && matchesTab;
    });
  }, [speakers, searchQuery, activeTab]);

  const handleAddSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/speakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSpeaker)
      });
      if (res.ok) {
        fetchSpeakers();
      } else {
        throw new Error('API failed');
      }
    } catch (error) {
      // Fallback to local storage
      const customSpeaker = { ...newSpeaker, id: Date.now(), isPrebuilt: false };
      const currentCustom = JSON.parse(localStorage.getItem('custom_speakers') || '[]');
      localStorage.setItem('custom_speakers', JSON.stringify([...currentCustom, customSpeaker]));
      fetchSpeakers();
    }

    setIsAdding(false);
    setNewSpeaker({
      name: '',
      voice: Voice.Zephyr,
      profession: '',
      tone: '',
      mode: '',
      choiceOfWords: '',
      behavior: '',
      pitch: 'medium',
      speed: 'normal',
      emotion: 'neutral',
      gender: 'non-binary',
      accent: 'Neutral',
      language: 'English'
    });
  };

  const handlePlayPreview = async (e: React.MouseEvent, speaker: Speaker) => {
    e.stopPropagation();

    // If currently playing this speaker, stop it
    if (playingPreviewId === speaker.id) {
      audioElement?.pause();
      setPlayingPreviewId(null);
      setAudioElement(null);
      return;
    }

    // If playing another speaker, stop it
    if (audioElement) {
      audioElement.pause();
      setPlayingPreviewId(null);
    }

    setLoadingPreviewId(speaker.id!);
    setIsModalOpen(true); // Open modal

    try {
      const audioBase64 = await generateSpeakerPreview(speaker);
      if (audioBase64) {
        // Convert base64 to Uint8Array (PCM data)
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create WAV blob with correct header (24kHz sample rate)
        const wavBlob = createWavBlob(bytes.buffer, 24000);
        const url = URL.createObjectURL(wavBlob);

        const audio = new Audio(url);
        audio.onended = () => {
          setPlayingPreviewId(null);
          setAudioElement(null);
          URL.revokeObjectURL(url);
        };
        
        setAudioElement(audio);
        setPlayingPreviewId(speaker.id!);
        
        // Close modal and play
        setIsModalOpen(false);
        audio.play();
      } else {
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to play preview", error);
      setIsModalOpen(false);
    } finally {
      setLoadingPreviewId(null);
    }
  };

  const handleVoiceClone = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCloning(true);
    setCloneFeedback(null);

    try {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        URL.revokeObjectURL(objectUrl);
        
        if (duration < 30) {
          setCloneFeedback({ message: `Sample is short (${Math.round(duration)}s). For best results, use a 1-3 minute clear audio sample.`, type: 'warning' });
        } else if (duration > 300) {
          setCloneFeedback({ message: `Sample is long (${Math.round(duration/60)}m). 1-3 minutes is usually sufficient.`, type: 'warning' });
        } else {
          setCloneFeedback({ message: `Optimal audio length detected (${Math.round(duration)}s). Quality looks good!`, type: 'success' });
        }
      });
      audio.src = objectUrl;

      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSpeaker(prev => ({
          ...prev,
          behavior: (prev.behavior || '') + "\n[Cloned Voice Profile: Analyzed from sample. Mimicking user's unique cadence and resonance.]",
          clonedVoiceData: reader.result as string
        }));
        setIsCloning(false);
        if (!isPro) {
          incrementClones();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setCloneFeedback({ message: "Failed to process audio file.", type: 'error' });
      setIsCloning(false);
    }
  };

  const handleDeleteSpeaker = async (id: number) => {
    await fetch('/api/speakers/' + id, { method: 'DELETE' });
    fetchSpeakers();
  };

  const toggleSpeakerSelection = (speaker: Speaker) => {
    if (selectedSpeakerIds.includes(speaker.id!)) {
      onSelectSpeakers(speakers.filter(s => selectedSpeakerIds.includes(s.id!) && s.id !== speaker.id));
    } else {
      if (selectedSpeakerIds.length >= 2) {
        alert("Please select only 2 speakers for the podcast.");
        return;
      }
      onSelectSpeakers([...speakers.filter(s => selectedSpeakerIds.includes(s.id!)), speaker]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-indigo-600" />
            Speaker Studio
          </h2>
          <p className="text-sm text-zinc-500">Manage your cast of AI characters</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search speakers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
            />
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl w-fit">
        {(['all', 'prebuilt', 'custom'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'bg-white text-zinc-900 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddSpeaker}
            className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-6 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Speaker Configuration
              </h3>
              <div className="flex flex-col items-end">
                <label 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold uppercase tracking-wider ${
                    canClone 
                      ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 cursor-pointer' 
                      : 'bg-zinc-50 text-zinc-400 cursor-not-allowed'
                  }`}
                  onClick={(e) => {
                    if (!canClone) {
                      e.preventDefault();
                      upgradeToPro();
                    }
                  }}
                >
                  {canClone ? <Upload className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {isCloning ? 'Analyzing...' : 'Clone Voice Sample'}
                  <input type="file" accept="audio/*" className="hidden" onChange={handleVoiceClone} disabled={!canClone} />
                </label>
                {!isPro && (
                  <span className="text-[9px] font-bold text-zinc-400 mt-1 flex items-center gap-1">
                    {canClone ? (
                      <span className="text-emerald-600">1 Free Clone Available</span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1"><Crown className="w-3 h-3" /> Upgrade for Unlimited</span>
                    )}
                  </span>
                )}
                {cloneFeedback && (
                  <div className={`mt-2 text-[10px] font-medium px-2 py-1 rounded-md max-w-xs text-right ${
                    cloneFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                    cloneFeedback.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {cloneFeedback.message}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Name</label>
                  <input
                    required
                    value={newSpeaker.name}
                    onChange={e => setNewSpeaker({ ...newSpeaker, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. Alex"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Base Voice</label>
                  <select
                    value={newSpeaker.voice}
                    onChange={e => {
                      const selectedVoice = e.target.value as Voice;
                      const voiceInfo = voiceDescriptions[selectedVoice];
                      if (voiceInfo.pro && !isPro) {
                        upgradeToPro();
                        return;
                      }
                      setNewSpeaker({ 
                        ...newSpeaker, 
                        voice: selectedVoice,
                        gender: voiceGenders[selectedVoice] || 'non-binary'
                      });
                    }}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {Object.values(Voice).map(v => {
                      const info = voiceDescriptions[v];
                      return (
                        <option key={v} value={v} disabled={info.pro && !isPro}>
                          {info.label} {info.pro && !isPro ? '(Pro)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Profession</label>
                  <input
                    required
                    value={newSpeaker.profession}
                    onChange={e => setNewSpeaker({ ...newSpeaker, profession: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. Tech Journalist"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Gender & Language</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newSpeaker.gender}
                      onChange={e => setNewSpeaker({ ...newSpeaker, gender: e.target.value as any })}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                    </select>
                    <input
                      required
                      value={newSpeaker.language}
                      onChange={e => setNewSpeaker({ ...newSpeaker, language: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="e.g. English"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Accent</label>
                  <input
                    required
                    value={newSpeaker.accent}
                    onChange={e => setNewSpeaker({ ...newSpeaker, accent: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. British, New York, Neutral"
                  />
                </div>
              </div>

              {/* Personality */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Tone, Mode & Accent</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      required
                      value={newSpeaker.tone}
                      onChange={e => setNewSpeaker({ ...newSpeaker, tone: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Tone"
                    />
                    <select
                      required
                      value={newSpeaker.mode}
                      onChange={e => setNewSpeaker({ ...newSpeaker, mode: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="" disabled>Mode</option>
                      <option value="Interviewer">Interviewer</option>
                      <option value="Educator">Educator</option>
                      <option value="Storytelling">Storytelling</option>
                      <option value="Narrator">Narrator</option>
                      <option value="Guide">Guide</option>
                      <option value="Debater">Debater</option>
                    </select>
                    <input
                      value={newSpeaker.accent}
                      onChange={e => setNewSpeaker({ ...newSpeaker, accent: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Accent"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Behavior</label>
                  <textarea
                    required
                    value={newSpeaker.behavior}
                    onChange={e => setNewSpeaker({ ...newSpeaker, behavior: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-[104px] resize-none"
                    placeholder="How do they act?"
                  />
                </div>
              </div>

              {/* Voice Modulation */}
              <div className="space-y-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Volume2 className="w-3 h-3" /> Pitch
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">{newSpeaker.pitch}</span>
                  </div>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewSpeaker({ ...newSpeaker, pitch: p })}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md border transition-all ${
                          newSpeaker.pitch === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <FastForward className="w-3 h-3" /> Speed
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">{newSpeaker.speed}</span>
                  </div>
                  <div className="flex gap-2">
                    {['slow', 'normal', 'fast'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewSpeaker({ ...newSpeaker, speed: s })}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md border transition-all ${
                          newSpeaker.speed === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Heart className="w-3 h-3" /> Emotion
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">{newSpeaker.emotion}</span>
                  </div>
                  <select
                    value={newSpeaker.emotion}
                    onChange={e => setNewSpeaker({ ...newSpeaker, emotion: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="happy">Happy / Cheerful</option>
                    <option value="serious">Serious / Authoritative</option>
                    <option value="excited">Excited / High Energy</option>
                    <option value="sarcastic">Sarcastic / Witty</option>
                    <option value="warm">Warm / Empathetic</option>
                    <option value="dramatic">Dramatic / Intense</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm font-bold"
              >
                Create Speaker
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpeakers.map(speaker => (
          <motion.div
            key={speaker.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4 }}
            onClick={() => toggleSpeakerSelection(speaker)}
            className={`relative p-6 rounded-[2rem] border cursor-pointer transition-all duration-300 group ${
              selectedSpeakerIds.includes(speaker.id!)
                ? 'border-zinc-900 bg-white shadow-2xl shadow-zinc-200 ring-1 ring-zinc-900'
                : 'border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-xl hover:shadow-zinc-100'
            }`}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  selectedSpeakerIds.includes(speaker.id!) 
                    ? 'bg-zinc-900 text-white rotate-3' 
                    : 'bg-zinc-50 text-zinc-400 group-hover:bg-zinc-100 group-hover:text-zinc-600'
                }`}>
                  {speaker.clonedVoiceData ? <Mic className="w-7 h-7" /> : <User className="w-7 h-7" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 tracking-tight">{speaker.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{speaker.voice}</span>
                    <span className="text-zinc-200">•</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{speaker.gender}</span>
                    {speaker.accent && (
                      <>
                        <span className="text-zinc-200">•</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{speaker.accent}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => handlePlayPreview(e, speaker)}
                  className={`p-2 rounded-xl transition-all ${
                    playingPreviewId === speaker.id 
                      ? 'text-indigo-600 bg-indigo-50' 
                      : 'text-zinc-300 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                  title="Preview Voice"
                >
                  {loadingPreviewId === speaker.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : playingPreviewId === speaker.id ? (
                    <StopCircle className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>
                {!speaker.isPrebuilt && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSpeaker(speaker.id!);
                    }}
                    className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{speaker.profession}</span>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {[speaker.tone, speaker.mode, speaker.emotion].map((tag, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-zinc-50 text-zinc-500 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-zinc-100">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-50">
                <div className="flex items-start gap-2 text-[11px] text-zinc-400 italic leading-relaxed">
                  <Quote className="w-3.5 h-3.5 text-zinc-200 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{speaker.behavior}</span>
                </div>
              </div>
            </div>

            {selectedSpeakerIds.includes(speaker.id!) && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 rounded-full border-4 border-white shadow-lg flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      
      {filteredSpeakers.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-3xl">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-zinc-500 font-medium">No speakers found matching your criteria.</p>
          <button onClick={() => { setSearchQuery(''); setActiveTab('all'); }} className="text-indigo-600 text-sm font-bold mt-2 hover:underline">Clear filters</button>
        </div>
      )}
      
      <GenerationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        isGenerating={true} 
        type="preview"
      />
    </div>
  );
}

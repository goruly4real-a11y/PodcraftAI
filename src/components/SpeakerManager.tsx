import React, { useState, useEffect } from 'react';
import { Speaker, Voice } from '../types';
import { Plus, Trash2, User, Mic2, Briefcase, MessageSquare, Quote, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpeakerManagerProps {
  onSelectSpeakers: (speakers: Speaker[]) => void;
  selectedSpeakerIds: number[];
}

export default function SpeakerManager({ onSelectSpeakers, selectedSpeakerIds }: SpeakerManagerProps) {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState<Partial<Speaker>>({
    name: '',
    voice: Voice.Zephyr,
    profession: '',
    tone: '',
    mode: '',
    choiceOfWords: '',
    behavior: ''
  });

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const fetchSpeakers = async () => {
    const res = await fetch('/api/speakers');
    const data = await res.json();
    setSpeakers(data);
  };

  const handleAddSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/speakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSpeaker)
    });
    if (res.ok) {
      fetchSpeakers();
      setIsAdding(false);
      setNewSpeaker({
        name: '',
        voice: Voice.Zephyr,
        profession: '',
        tone: '',
        mode: '',
        choiceOfWords: '',
        behavior: ''
      });
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 flex items-center gap-2">
          <Mic2 className="w-5 h-5 text-indigo-600" />
          Speakers
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Speaker
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleAddSpeaker}
            className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</label>
                <input
                  required
                  value={newSpeaker.name}
                  onChange={e => setNewSpeaker({ ...newSpeaker, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. Alex"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Voice</label>
                <select
                  value={newSpeaker.voice}
                  onChange={e => setNewSpeaker({ ...newSpeaker, voice: e.target.value as Voice })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {Object.values(Voice).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Profession</label>
                <input
                  required
                  value={newSpeaker.profession}
                  onChange={e => setNewSpeaker({ ...newSpeaker, profession: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. Tech Journalist"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tone</label>
                <input
                  required
                  value={newSpeaker.tone}
                  onChange={e => setNewSpeaker({ ...newSpeaker, tone: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. Enthusiastic"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mode</label>
                <input
                  required
                  value={newSpeaker.mode}
                  onChange={e => setNewSpeaker({ ...newSpeaker, mode: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. Interviewer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Choice of Words</label>
                <input
                  required
                  value={newSpeaker.choiceOfWords}
                  onChange={e => setNewSpeaker({ ...newSpeaker, choiceOfWords: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="e.g. Modern"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Behavior</label>
                <textarea
                  required
                  value={newSpeaker.behavior}
                  onChange={e => setNewSpeaker({ ...newSpeaker, behavior: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-20 resize-none"
                  placeholder="e.g. Curious and fast-paced, often asks follow-up questions."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Save Speaker
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {speakers.map(speaker => (
          <motion.div
            key={speaker.id}
            layout
            onClick={() => toggleSpeakerSelection(speaker)}
            className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
              selectedSpeakerIds.includes(speaker.id!)
                ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${selectedSpeakerIds.includes(speaker.id!) ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-100 text-zinc-600'}`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900">{speaker.name}</h3>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {speaker.voice}
                  </p>
                </div>
              </div>
              {!speaker.isPrebuilt && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSpeaker(speaker.id!);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium">{speaker.profession}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                <span>{speaker.tone} • {speaker.mode}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-zinc-500 italic">
                <Quote className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{speaker.behavior}</span>
              </div>
            </div>

            {selectedSpeakerIds.includes(speaker.id!) && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full" />
            )}
          </motion.div>
        ))}
      </div>
      
      {selectedSpeakerIds.length === 0 && (
        <p className="text-center text-sm text-zinc-500 py-4 border-2 border-dashed border-zinc-200 rounded-2xl">
          Select 2 speakers to start generating your podcast.
        </p>
      )}
    </div>
  );
}

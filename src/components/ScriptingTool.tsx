import React, { useState } from 'react';
import { PodcastSegment, Speaker } from '../types';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Layout, MessageSquare, Sparkles } from 'lucide-react';
import { motion, Reorder } from 'motion/react';
import { suggestSegmentNotes } from '../services/geminiService';

interface ScriptingToolProps {
  segments: PodcastSegment[];
  setSegments: (segments: PodcastSegment[]) => void;
  speakers: Speaker[];
  content: string;
}

export default function ScriptingTool({ segments, setSegments, speakers, content }: ScriptingToolProps) {
  const [isSuggestingNotes, setIsSuggestingNotes] = useState<string | null>(null);

  const handleSuggestNotes = async (segmentId: string, title: string) => {
    if (!title || !content) {
      alert("Please provide source material content and a segment title first.");
      return;
    }
    setIsSuggestingNotes(segmentId);
    try {
      const suggestions = await suggestSegmentNotes(title, content);
      updateSegment(segmentId, { notes: suggestions });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSuggestingNotes(null);
    }
  };
  const addSegment = () => {
    const newSegment: PodcastSegment = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'New Segment',
      notes: '',
      duration: '2 minutes',
    };
    setSegments([...segments, newSegment]);
  };

  const removeSegment = (id: string) => {
    setSegments(segments.filter(s => s.id !== id));
  };

  const updateSegment = (id: string, updates: Partial<PodcastSegment>) => {
    setSegments(segments.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Layout className="w-5 h-5 text-zinc-400" />
            Episode Structure
          </h3>
          <p className="text-[10px] text-zinc-400 uppercase tracking-[0.2em] font-bold">Design your narrative flow</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={addSegment}
          className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 text-xs font-bold uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" />
          Add Segment
        </motion.button>
      </div>

      {segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-100 rounded-[2.5rem] bg-zinc-50/30 text-zinc-400 space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
            <Layout className="w-8 h-8 opacity-20" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No segments added yet</p>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addSegment} 
              className="text-indigo-600 text-xs font-bold hover:underline uppercase tracking-widest"
            >
              Start building your script
            </motion.button>
          </div>
        </div>
      ) : (
        <Reorder.Group axis="y" values={segments} onReorder={setSegments} className="space-y-6">
          {segments.map((segment) => (
            <Reorder.Item
              key={segment.id}
              value={segment}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white border border-zinc-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:shadow-zinc-100 transition-all group relative"
            >
              <div className="flex gap-6">
                <div className="flex flex-col items-center gap-2 pt-1">
                  <div className="p-2 bg-zinc-50 rounded-xl cursor-grab active:cursor-grabbing hover:bg-zinc-100 transition-colors">
                    <GripVertical className="w-5 h-5 text-zinc-300" />
                  </div>
                </div>
                
                <div className="flex-1 space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Segment Title</label>
                      <input
                        type="text"
                        value={segment.title}
                        onChange={(e) => updateSegment(segment.id, { title: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-zinc-500/5 text-sm font-bold text-zinc-900 placeholder:text-zinc-300 transition-all"
                        placeholder="e.g. Introduction"
                      />
                    </div>
                    <div className="w-full md:w-40 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Duration</label>
                      <input
                        type="text"
                        value={segment.duration}
                        onChange={(e) => updateSegment(segment.id, { duration: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-zinc-500/5 text-sm font-bold text-zinc-900 transition-all"
                        placeholder="e.g. 2m"
                      />
                    </div>
                    <div className="w-full md:w-48 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lead Speaker</label>
                      <select
                        value={segment.leadSpeakerId || ''}
                        onChange={(e) => updateSegment(segment.id, { leadSpeakerId: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-zinc-500/5 text-sm font-bold text-zinc-900 transition-all"
                      >
                        <option value="">Auto-assign</option>
                        {speakers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3" />
                        Discussion Notes
                      </label>
                      <button
                        onClick={() => handleSuggestNotes(segment.id, segment.title)}
                        disabled={isSuggestingNotes === segment.id}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors disabled:opacity-50"
                      >
                        {isSuggestingNotes === segment.id ? (
                          <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        Auto-suggest
                      </button>
                    </div>
                    <textarea
                      value={segment.notes}
                      onChange={(e) => updateSegment(segment.id, { notes: e.target.value })}
                      className="w-full h-32 px-4 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-zinc-500/5 text-sm text-zinc-600 placeholder:text-zinc-300 transition-all resize-none"
                      placeholder="What should be discussed in this segment?"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => removeSegment(segment.id)}
                    className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

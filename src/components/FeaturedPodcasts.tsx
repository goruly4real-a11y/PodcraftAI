import React, { useState, useRef, useEffect } from 'react';
import { Play, Clock, Users, MoreHorizontal, Heart, Share2, Pause, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { generatePodcastScript, generatePodcastAudio } from '../services/geminiService';
import { Speaker, Voice } from '../types';
import { createWavBlob } from '../utils/audioUtils';

interface Podcast {
  id: string;
  title: string;
  category: string;
  duration: string;
  hosts: string[];
  description: string;
  coverSeed: string;
  color: string;
  speakers: Speaker[];
}

const PRESET_SPEAKERS: Record<string, Speaker> = {
  Alex: { name: 'Alex', voice: Voice.Puck, profession: 'Tech Host', tone: 'Sarcastic', mode: 'Casual', choiceOfWords: 'Slang', behavior: 'Interrupts', gender: 'male' },
  Sarah: { name: 'Sarah', voice: Voice.Kore, profession: 'Tech Host', tone: 'Witty', mode: 'Casual', choiceOfWords: 'Direct', behavior: 'Laughs', gender: 'female' },
  ProfMiller: { name: 'Prof. Miller', voice: Voice.Fenrir, profession: 'Astrophysicist', tone: 'Wise', mode: 'Lecture', choiceOfWords: 'Academic', behavior: 'Patient', gender: 'male' },
  Dave: { name: 'Dave', voice: Voice.Zephyr, profession: 'Student', tone: 'Curious', mode: 'Inquisitive', choiceOfWords: 'Simple', behavior: 'Asks questions', gender: 'male' },
  Narrator: { name: 'The Narrator', voice: Voice.Charon, profession: 'Storyteller', tone: 'Ominous', mode: 'Dramatic', choiceOfWords: 'Poetic', behavior: 'Slow pacing', gender: 'male' },
  Marcus: { name: 'Marcus', voice: Voice.Fenrir, profession: 'Manager', tone: 'Corporate', mode: 'Formal', choiceOfWords: 'Buzzwords', behavior: 'Assertive', gender: 'male' },
  Jessica: { name: 'Jessica', voice: Voice.Kore, profession: 'Developer', tone: 'Passionate', mode: 'Casual', choiceOfWords: 'Direct', behavior: 'Defensive', gender: 'female' }
};

const FEATURED_PODCASTS: Podcast[] = [
  {
    id: '1',
    title: 'The AI Dilemma',
    category: 'Tech & Comedy',
    duration: '3 min',
    hosts: ['Alex', 'Sarah'],
    description: 'Is AI going to take our jobs or just make us lazy? A hilarious look at the future of work.',
    coverSeed: 'tech',
    color: 'bg-indigo-500',
    speakers: [PRESET_SPEAKERS.Alex, PRESET_SPEAKERS.Sarah]
  },
  {
    id: '2',
    title: 'Into the Event Horizon',
    category: 'Education',
    duration: '3 min',
    hosts: ['Prof. Miller', 'Dave'],
    description: 'Understanding black holes without the math. A journey to the edge of the universe.',
    coverSeed: 'space',
    color: 'bg-violet-500',
    speakers: [PRESET_SPEAKERS.ProfMiller, PRESET_SPEAKERS.Dave]
  },
  {
    id: '3',
    title: 'The Midnight Signal',
    category: 'Thriller',
    duration: '3 min',
    hosts: ['The Narrator', 'The Narrator'],
    description: 'A short mystery about a train signal that shouldn\'t exist. Best listened to in the dark.',
    coverSeed: 'mystery',
    color: 'bg-rose-500',
    speakers: [PRESET_SPEAKERS.Narrator, PRESET_SPEAKERS.Narrator]
  },
  {
    id: '4',
    title: 'Office vs. Remote',
    category: 'Debate',
    duration: '3 min',
    hosts: ['Marcus', 'Jessica'],
    description: 'The ultimate showdown: Pajamas vs. Commutes. Who really wins in the modern workplace?',
    coverSeed: 'office',
    color: 'bg-amber-500',
    speakers: [PRESET_SPEAKERS.Marcus, PRESET_SPEAKERS.Jessica]
  }
];

export default function FeaturedPodcasts() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedAudioCache, setGeneratedAudioCache] = useState<Record<string, string>>({});
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = async (podcast: Podcast) => {
    // If currently playing this podcast, pause it
    if (playingId === podcast.id && !isLoading) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    // If playing another podcast, stop it
    if (playingId && playingId !== podcast.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    }

    // Check if we have cached audio
    if (generatedAudioCache[podcast.id]) {
      playAudio(generatedAudioCache[podcast.id], podcast.id);
      return;
    }

    // Generate new audio
    try {
      setIsLoading(true);
      setPlayingId(podcast.id);
      setGenerationStatus('Writing script...');

      // 1. Generate Script
      const script = await generatePodcastScript(
        podcast.description,
        '1 minute', // Force short duration for preview
        'Make it engaging and punchy. This is a preview.',
        [],
        podcast.speakers
      );

      setGenerationStatus('Synthesizing voices...');

      // 2. Generate Audio
      const audioBase64 = await generatePodcastAudio(
        script,
        podcast.speakers,
        (current, total) => setGenerationStatus(`Generating audio part ${current}/${total}...`)
      );

      if (!audioBase64) throw new Error('Failed to generate audio');

      // 3. Convert to Blob URL
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const wavBlob = createWavBlob(bytes.buffer, 24000);
      const url = URL.createObjectURL(wavBlob);

      // 4. Cache and Play
      setGeneratedAudioCache(prev => ({ ...prev, [podcast.id]: url }));
      playAudio(url, podcast.id);

    } catch (error) {
      console.error('Generation failed:', error);
      setPlayingId(null);
      alert('Failed to generate preview. Please try again.');
    } finally {
      setIsLoading(false);
      setGenerationStatus('');
    }
  };

  const playAudio = (url: string, id: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.play().catch(console.error);
    setPlayingId(id);
  };

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-widest"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Trending Now
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900"
            >
              Made with <span className="font-serif italic text-indigo-600">PodCraft.</span>
            </motion.h2>
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 max-w-md text-sm md:text-base"
          >
            Listen to what's possible. Click play to generate a fresh AI preview in real-time.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_PODCASTS.map((podcast, idx) => (
            <motion.div
              key={podcast.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative bg-zinc-50 rounded-[2rem] p-4 border border-zinc-100 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300"
            >
              {/* Cover Image */}
              <div className="relative aspect-square rounded-[1.5rem] overflow-hidden mb-4 bg-zinc-200">
                <img 
                  src={`https://picsum.photos/seed/${podcast.coverSeed}/400/400`} 
                  alt={podcast.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className={`absolute inset-0 bg-black/0 transition-colors duration-300 ${playingId === podcast.id ? 'bg-black/40' : 'group-hover:bg-black/20'}`} />
                
                {/* Play Button Overlay */}
                <button 
                  onClick={() => togglePlay(podcast)}
                  disabled={isLoading && playingId === podcast.id}
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${playingId === podcast.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl transform scale-50 group-hover:scale-100 transition-transform duration-300">
                    {isLoading && playingId === podcast.id ? (
                      <Loader2 className="w-6 h-6 text-zinc-900 animate-spin" />
                    ) : playingId === podcast.id && !isLoading ? (
                      <Pause className="w-6 h-6 text-zinc-900 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 text-zinc-900 fill-current ml-1" />
                    )}
                  </div>
                </button>

                {/* Status Badge (Generating...) */}
                {isLoading && playingId === podcast.id && (
                  <div className="absolute bottom-3 left-3 right-3 px-3 py-2 bg-black/80 backdrop-blur-md rounded-xl text-[10px] font-bold text-white text-center animate-pulse">
                    {generationStatus || 'Initializing AI...'}
                  </div>
                )}

                {/* Duration Badge */}
                {!isLoading && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {podcast.duration}
                  </div>
                )}
                
                {/* Playing Indicator */}
                {playingId === podcast.id && !isLoading && (
                  <div className="absolute bottom-3 left-3 flex gap-0.5 h-3 items-end">
                    {[1,2,3,4].map(i => (
                      <motion.div
                        key={i}
                        className="w-1 bg-white rounded-full"
                        animate={{ height: ['20%', '100%', '20%'] }}
                        transition={{ repeat: Infinity, duration: 0.5 + (i * 0.1), ease: "easeInOut" }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-3 px-2 pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-white mb-2 ${podcast.color}`}>
                      {podcast.category}
                    </span>
                    <h3 className="font-bold text-zinc-900 leading-tight group-hover:text-indigo-600 transition-colors">
                      {podcast.title}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                  {podcast.description}
                </p>

                <div className="pt-3 border-t border-zinc-200/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {podcast.hosts.map((host, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-zinc-500">
                          {host[0]}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] font-medium text-zinc-400">
                      {podcast.hosts.join(' & ')}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors">
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

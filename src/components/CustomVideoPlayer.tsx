import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  SkipForward, 
  Settings, 
  Loader2, 
  RotateCcw,
  RotateCw,
  Tv,
  Keyboard,
  Undo2,
  AlertTriangle
} from 'lucide-react';

interface CustomVideoPlayerProps {
  url: string;
  type: 'direct' | 'hls';
  sources?: { file: string; label: string; type: string }[] | null;
  poster?: string;
  episodeTitle?: string;
  onFallback?: () => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
}

export default function CustomVideoPlayer({ 
  url: initialUrl, 
  type: initialType, 
  sources = [], 
  poster, 
  episodeTitle,
  onFallback,
  onNextEpisode,
  hasNextEpisode = false
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [currentType, setCurrentType] = useState(initialType);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1); // 0 to 1
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Custom Dynamic HLS levels
  const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string }[]>([]);
  const [currentHlsLevel, setCurrentHlsLevel] = useState<number>(-1); // -1 is Auto
  
  // Double tap gesture state
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'forward' | 'backward' | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  
  // Controls overlay timeout
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Single/double click logic refs
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Resume state progress
  const [pendingResumeTime, setPendingResumeTime] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Autoplay countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showAutoplayOverlay, setShowAutoplayOverlay] = useState(false);
  const [autoplayTriggered, setAutoplayTriggered] = useState(false);

  // Auto hide continue watch toast
  useEffect(() => {
    if (showResumePrompt) {
      const t = setTimeout(() => {
        setShowResumePrompt(false);
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [showResumePrompt]);

  // Autoplay countdown ticker
  useEffect(() => {
    if (showAutoplayOverlay && countdown !== null && countdown > 0) {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            if (onNextEpisode) onNextEpisode();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showAutoplayOverlay, countdown, onNextEpisode]);

  // Sync with initial URL/type changes
  useEffect(() => {
    setCurrentUrl(initialUrl);
    setCurrentType(initialType);
    setHlsLevels([]);
    setCurrentHlsLevel(-1);
    setIsLoading(true);
    setShowResumePrompt(false);
    setPendingResumeTime(null);
    setShowAutoplayOverlay(false);
    setCountdown(null);
    setAutoplayTriggered(false);
  }, [initialUrl, initialType]);

  // HLS/Direct Initializer & Video Engine Mount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    setIsLoading(true);
    const isHlsUrl = currentUrl.includes('.m3u8') || currentType === 'hls';

    if (isHlsUrl) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxMaxBufferLength: 45,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60
        });
        
        hlsInstanceRef.current = hls;
        hls.loadSource(currentUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          // Auto detect video levels for quality picker
          if (hls.levels && hls.levels.length > 0) {
            const levels = hls.levels.map((lvl, index) => {
              const height = lvl.height || 0;
              const label = height > 0 ? `${height}p` : `جودة ${index + 1}`;
              return { index, label };
            });
            // Reverse to put highest quality on top
            setHlsLevels([...levels].reverse());
          }
          
          if (isPlaying) {
            video.play().catch(() => setIsPlaying(false));
          }
        });
        
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('Network error, attempting recovery...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('Media error, attempting recovery...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal HLS loading error. Triggering fallback view...');
                setIsLoading(false);
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentUrl;
        video.addEventListener('canplay', () => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    } else {
      video.src = currentUrl;
      const handleCanPlay = () => setIsLoading(false);
      video.addEventListener('canplay', handleCanPlay);
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
      };
    }

    // Ask to restore saved progress for this URL
    try {
      const savedTime = localStorage.getItem(`player_progress:${currentUrl}`);
      if (savedTime) {
        const parsed = parseFloat(savedTime);
        if (!isNaN(parsed) && isFinite(parsed) && parsed > 5) {
          setPendingResumeTime(parsed);
          setShowResumePrompt(true);
        }
      }
    } catch (_) {}

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [currentUrl, currentType]);

  // Handle progress & duration monitoring
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Auto-save watch progress periodically
      if (video.currentTime > 5 && video.currentTime < video.duration - 10) {
        try {
          localStorage.setItem(`player_progress:${currentUrl}`, video.currentTime.toString());
        } catch (_) {}
      }

      // Check for autoplay next episode triggering
      if (hasNextEpisode && onNextEpisode && video.duration > 30 && video.currentTime >= video.duration - 15) {
        if (!autoplayTriggered) {
          setAutoplayTriggered(true);
          setCountdown(8);
          setShowAutoplayOverlay(true);
        }
      }
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [currentUrl]);

  // Auto-hide UI controls overlay
  const triggerShowControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettings(false);
      }, 2000); // 2 seconds visibility as requested
    }
  };

  useEffect(() => {
    triggerShowControls();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, [isPlaying]);

  // Playback & seeking functions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
    triggerShowControls();
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const dur = isNaN(video.duration) || !isFinite(video.duration) ? 0 : video.duration;
    const cur = isNaN(video.currentTime) || !isFinite(video.currentTime) ? 0 : video.currentTime;
    const target = Math.max(0, Math.min(dur, cur + seconds));
    if (!isNaN(target) && isFinite(target)) {
      video.currentTime = target;
    }
    triggerShowControls();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekValue = parseFloat(e.target.value);
    if (!isNaN(seekValue) && isFinite(seekValue)) {
      video.currentTime = seekValue;
      setCurrentTime(seekValue);
    }
    triggerShowControls();
  };

  // Keyboard Shortcuts Engine (Arrow controls, space, mute, full screen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if user is typing on any input or text area
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
          e.preventDefault();
          // Skip forward (usually right arrow moves forward in Arabic layout or standard video)
          skipTime(10);
          break;
        case 'arrowleft':
          e.preventDefault();
          // Skip backward
          skipTime(-10);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => {
            const nextVol = Math.min(1, prev + 0.1);
            if (videoRef.current) videoRef.current.volume = nextVol;
            return nextVol;
          });
          setIsMuted(false);
          triggerShowControls();
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => {
            const nextVol = Math.max(0, prev - 0.1);
            if (videoRef.current) videoRef.current.volume = nextVol;
            return nextVol;
          });
          triggerShowControls();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, volume, isMuted]);

  // Smart Universal Click / Tap Interaction (Single Tap: controls toggle, Double Tap: skip/action without opening controls)
  const handleInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // Prevent default simulated mouse clicks on touch platforms
    if (e.type === 'touchstart') {
      e.preventDefault();
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let clientX = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
    } else if ('clientX' in e) {
      clientX = e.clientX;
    } else {
      return;
    }

    const x = clientX - rect.left;

    if (clickTimeoutRef.current) {
      // DOUBLE CLICK/TAP DETECTED!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;

      // Execute skip gesture
      const segmentWidth = rect.width / 3;
      if (x < segmentWidth) {
        // Left third: Skip backward
        skipTime(-10);
        setDoubleTapFeedback('backward');
        setTimeout(() => setDoubleTapFeedback(null), 800);
      } else if (x > segmentWidth * 2) {
        // Right third: Skip forward
        skipTime(10);
        setDoubleTapFeedback('forward');
        setTimeout(() => setDoubleTapFeedback(null), 800);
      } else {
        // Center: toggle play/pause without showing controls
        togglePlay();
      }
      
      // CRITICAL: We do NOT trigger controls showing on double click gesture!
    } else {
      // SINGLE CLICK/TAP CANDIDATE
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;

        // Single tap/click toggles the controls!
        setShowControls(prev => {
          const next = !prev;
          if (next) {
            // Show controls and schedule 2s auto-hide if playing
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            if (isPlaying) {
              controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
                setShowSettings(false);
              }, 2000);
            }
          } else {
            // Hide controls immediately
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            setShowSettings(false);
          }
          return next;
        });
      }, 250);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    triggerShowControls();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMute = !isMuted;
    video.muted = nextMute;
    setIsMuted(nextMute);
    triggerShowControls();
  };

  const changeSpeed = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
    triggerShowControls();
  };

  // Change HLS Adaptive Quality on-the-fly
  const selectHlsLevel = (levelIndex: number) => {
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.currentLevel = levelIndex;
      setCurrentHlsLevel(levelIndex);
      setShowSettings(false);
      triggerShowControls();
    }
  };

  const changeQuality = (newSourceUrl: string) => {
    const video = videoRef.current;
    if (!video) return;
    
    // Save current frame
    const currentTimeCache = video.currentTime;
    setCurrentUrl(newSourceUrl);
    
    // Resume cleanly
    setTimeout(() => {
      if (videoRef.current) {
        if (!isNaN(currentTimeCache) && isFinite(currentTimeCache) && currentTimeCache >= 0) {
          videoRef.current.currentTime = currentTimeCache;
        }
        if (isPlaying) {
          videoRef.current.play().catch(() => {});
        }
      }
    }, 100);

    setShowSettings(false);
    triggerShowControls();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Fullscreen request failed", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      console.error("Picture-in-picture failed:", e);
    }
  };

  // Listen to standard exit fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);
    
    const formattedMins = mins.toString().padStart(2, '0');
    const formattedSecs = secs.toString().padStart(2, '0');
    
    if (hrs > 0) {
      return `${hrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${formattedMins}:${formattedSecs}`;
  };

  return (
    <div 
      className="w-full h-full relative bg-black flex items-center justify-center overflow-hidden font-sans select-none text-white ring-1 ring-white/10 rounded-2xl"
      ref={containerRef}
      onMouseMove={triggerShowControls}
    >
      {/* Click / Tap interaction layer */}
      <div 
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
      />

      {/* Actual HTML5 Video element */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
      />

      {/* Double Tap Skip Overlay Animation Indicators */}
      {doubleTapFeedback === 'backward' && (
        <div className="absolute left-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center justify-center bg-purple-600/30 backdrop-blur-md rounded-full w-20 h-20 border border-purple-500/40 animate-ping z-30 pointer-events-none">
          <RotateCcw className="w-8 h-8 text-white" />
          <span className="text-[11px] font-black tracking-wider text-purple-200 mt-1">-10ث</span>
        </div>
      )}

      {doubleTapFeedback === 'forward' && (
        <div className="absolute right-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center justify-center bg-purple-600/30 backdrop-blur-md rounded-full w-20 h-20 border border-purple-500/40 animate-ping z-30 pointer-events-none">
          <RotateCw className="w-8 h-8 text-white" />
          <span className="text-[11px] font-black tracking-wider text-purple-200 mt-1">+10ث</span>
        </div>
      )}

      {/* Loading Spinner Overlays */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-30 pointer-events-none gap-3">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <span className="text-xs font-black tracking-widest text-purple-200 animate-pulse">جاري فك حماية البث وتثبيت الإشارة...</span>
          <span className="text-[10px] text-neutral-500">سوف تعمل الحلقة خلال ثوانٍ</span>
        </div>
      )}

      {/* Custom Control Overlay Panel */}
      <div 
        className={`absolute inset-0 z-20 flex flex-col justify-between bg-gradient-to-t from-black/85 via-black/10 to-black/70 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Control Bar: Title & Metadata */}
        <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent z-10 pointer-events-auto">
          <div className="text-right flex flex-col gap-0.5 pointer-events-none">
            <span className="text-[9px] font-black text-purple-400 tracking-wider">مشغل الميديا المباشر</span>
            <span className="text-xs md:text-sm font-black text-neutral-100 truncate max-w-xs">{episodeTitle || 'جاري المشاهدة...'}</span>
          </div>
          
          {/* Quick Info Tags & Custom Actions */}
          <div className="flex gap-2">
            {onFallback && (
              <button 
                onClick={onFallback}
                className="bg-red-950/40 border border-red-500/30 text-red-300 hover:bg-red-600 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow"
                title="في حال لم يعمل البث المباشر، يمكنك العودة على الفور إلى المشغل المدمج كبديل فوري جاهز للاستخدام"
              >
                <AlertTriangle size={12} />
                المشغل الاحتياطي
              </button>
            )}
            <span className="bg-purple-600/30 border border-purple-500/30 text-purple-300 text-[9px] font-black px-2.5 py-1 rounded-full select-none shadow">
              تلقائي HLS / MP4
            </span>
          </div>
        </div>

        {/* Center Control Actions: Play / Pause Big Button with 10s Skips */}
        <div className="flex items-center justify-center gap-10 md:gap-14 z-10 duration-200 pointer-events-auto">
          <button 
            onClick={() => skipTime(-10)} 
            className="w-11 h-11 md:w-13 md:h-13 rounded-full bg-black/40 border border-white/10 hover:bg-purple-600/30 hover:border-purple-400/40 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-md cursor-pointer"
            title="إرجاع 10 ثواني (سهم يسار)"
          >
            <RotateCcw size={20} className="md:w-6 md:h-6" />
          </button>

          <button 
            onClick={togglePlay} 
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-purple-500/25 cursor-pointer"
            title="تشغيل / إيقاف (مسافة)"
          >
            {isPlaying ? <Pause size={30} className="md:w-10 md:h-10" fill="currentColor" /> : <Play size={30} className="md:w-10 md:h-10 translate-x-0.5" fill="currentColor" />}
          </button>

          <button 
            onClick={() => skipTime(10)} 
            className="w-11 h-11 md:w-13 md:h-13 rounded-full bg-black/40 border border-white/10 hover:bg-purple-600/30 hover:border-purple-400/40 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-md cursor-pointer"
            title="تقديم 10 ثواني (سهم يمين)"
          >
            <RotateCw size={20} className="md:w-6 md:h-6" />
          </button>
        </div>

        {/* Bottom Control Area: Seekbar, Time Counter, Actions */}
        <div className="p-4 bg-gradient-to-t from-black/95 to-transparent flex flex-col gap-3 z-10 pointer-events-auto">
          {/* Seekbar Progress Tracker */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-neutral-400 min-w-[40px] text-right font-mono select-none">
              {formatTime(currentTime)}
            </span>
            
            <div className="flex-1 relative group py-2">
              <input 
                type="range" 
                min={0}
                max={duration || 1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-purple-500 group-hover:h-1.5 transition-all outline-none"
                style={{
                  background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(currentTime / (duration || 1)) * 100}%, #404040 ${(currentTime / (duration || 1)) * 100}%, #404040 100%)`
                }}
              />
            </div>

            <span className="text-[10px] font-bold text-neutral-400 min-w-[40px] font-mono select-none">
              {formatTime(duration)}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between">
            {/* Left side actions (Volume, Fullscreen, Quality, Speeds) */}
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleFullscreen}
                className="text-neutral-400 hover:text-white transition transform hover:scale-110 active:scale-95 py-1"
                title={isFullscreen ? "تصغير الشاشة" : "تكبير الشاشة ملء الشاشة (F)"}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>

              <button 
                onClick={togglePictureInPicture}
                className="text-neutral-400 hover:text-white transition transform hover:scale-110 active:scale-95 py-1"
                title="صورة داخل صورة (Picture-in-Picture)"
              >
                <Tv size={20} />
              </button>

              {/* Dynamic Skipping for Quick Intro skip (85s) */}
              <button 
                onClick={() => skipTime(85)}
                className="bg-purple-900/40 border border-purple-500/40 hover:bg-purple-600/80 hover:border-purple-400 text-purple-200 text-[10px] font-black px-3 py-1.5 rounded-xl transition flex items-center gap-1 active:scale-95 shadow-md cursor-pointer"
                title="تخطي شارة البداية أو النهاية (85 ثانية)"
              >
                <SkipForward size={12} className="rotate-180" /> تخطي المقدمة (85ث)
              </button>

              {/* Quality or Speed Dynamic Settings trigger */}
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`text-neutral-400 hover:text-white transition flex items-center gap-1 py-1 ${showSettings ? 'text-purple-400' : ''}`}
                >
                  <Settings size={20} className={showSettings ? "animate-spin" : ""} />
                  <span className="text-xs font-bold font-mono">{playbackRate}x</span>
                  {currentHlsLevel !== -1 && hlsLevels.length > 0 && (
                    <span className="bg-purple-600/20 border border-purple-500/30 text-purple-300 text-[9px] px-1.5 py-0.5 rounded ml-1 font-bold">
                      {hlsLevels.find(l => l.index === currentHlsLevel)?.label || 'تلقائي'}
                    </span>
                  )}
                </button>

                {showSettings && (
                  <div className="absolute bottom-10 left-0 bg-[#0c0c0c]/95 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 flex flex-col gap-4 min-w-[200px] shadow-2xl z-40 text-right font-sans">
                    
                    {/* HLS Adaptive Internal Playlist Qualities list */}
                    {hlsLevels.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black text-purple-400 border-b border-neutral-800 pb-1 flex items-center gap-1">
                          <Tv size={12} /> جودة البث (HLS)
                        </span>
                        <div className="max-h-[140px] overflow-y-auto flex flex-col gap-1 pr-1">
                          <button 
                            onClick={() => selectHlsLevel(-1)}
                            className={`text-[11px] font-bold py-1.5 px-2.5 rounded-lg text-right transition ${currentHlsLevel === -1 ? 'bg-purple-600 text-white shadow' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                          >
                            تلقائي (Adaptive)
                          </button>
                          {hlsLevels.map((lvl) => {
                            const isCurrent = currentHlsLevel === lvl.index;
                            return (
                              <button 
                                key={lvl.index}
                                onClick={() => selectHlsLevel(lvl.index)}
                                className={`text-[11px] font-bold py-1.5 px-2.5 rounded-lg text-right transition ${isCurrent ? 'bg-purple-600 text-white shadow' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                              >
                                {lvl.label} {isCurrent && '(نشط)'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quality list if sources are manually extracted */}
                    {sources.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black text-purple-400 border-b border-neutral-800 pb-1">مصادر الميديا وبدائلها</span>
                        <div className="max-h-[120px] overflow-y-auto flex flex-col gap-1 pr-1">
                          {sources.map((src, i) => {
                            const isCurrent = currentUrl === src.file;
                            return (
                              <button 
                                key={i}
                                onClick={() => changeQuality(src.file)}
                                className={`text-[11px] font-bold py-1.5 px-2.5 rounded-lg text-right transition ${isCurrent ? 'bg-purple-600 text-white shadow' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                              >
                                {src.label} {isCurrent && '(نشط)'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Speed controllers */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-purple-400 border-b border-neutral-800 pb-1">سرعة التشغيل</span>
                      <div className="grid grid-cols-3 gap-1">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <button 
                            key={rate}
                            onClick={() => changeSpeed(rate)}
                            className={`text-[10px] font-bold py-1 px-1 rounded-md transition text-center ${playbackRate === rate ? 'bg-purple-600 text-white' : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'}`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick shortcuts helper list */}
                    <div className="flex flex-col gap-1 text-[9px] text-neutral-500 border-t border-neutral-800 pt-1.5">
                      <span className="font-bold flex items-center gap-1"><Keyboard size={10} /> اختصارات الكيبورد:</span>
                      <span>• مسافة: تشغيل / مؤقت</span>
                      <span>• أسهم يمين / يسار: تقدم 10ث</span>
                      <span>• أسهم فوق / تحت: تعديل الـصوت</span>
                      <span>• F: شاشة كاملة • M: كتم الصوت</span>
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* Right side actions (Volume control, Playback rate state) */}
            <div className="flex items-center gap-3">
              {/* Volume Track */}
              <div className="flex items-center gap-2 group/volume py-2">
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-0 overflow-hidden group-hover/volume:w-16 h-1 rounded-lg appearance-none cursor-pointer accent-purple-500 bg-neutral-700 transition-all outline-none"
                  style={{
                    background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${volume * 100}%, #404040 ${volume * 100}%, #404040 100%)`
                  }}
                />
                <button 
                  onClick={toggleMute}
                  className="text-neutral-400 hover:text-white transition transform hover:scale-105 active:scale-95 py-1"
                  title="كتم / تفعيل الصوت (M)"
                >
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Continue Watching Prompt Overlay */}
      {showResumePrompt && pendingResumeTime && (
        <div className="absolute bottom-20 right-4 sm:right-6 bg-black/95 backdrop-blur-md rounded-2xl p-4 border border-purple-500/30 flex flex-col gap-2.5 max-w-xs shadow-2xl z-35 text-right font-sans">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-purple-400">متابعة المشاهدة</span>
            <span className="text-xs text-neutral-200 font-bold leading-relaxed">
              هل تريد الاستمرار من الدقيقة <span className="text-purple-400 font-mono">{formatTime(pendingResumeTime)}</span>؟
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = pendingResumeTime;
                  if (!isPlaying) {
                    videoRef.current.play().catch(() => {});
                  }
                }
                setShowResumePrompt(false);
              }}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black py-1.5 px-3 rounded-lg shadow-md transition active:scale-95 cursor-pointer"
            >
              متابعة
            </button>
            <button 
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = 0;
                setShowResumePrompt(false);
                try {
                  localStorage.removeItem(`player_progress:${currentUrl}`);
                } catch (_) {}
              }}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-[11px] font-bold py-1.5 px-3 rounded-lg transition active:scale-95 cursor-pointer"
            >
              من البداية
            </button>
          </div>
        </div>
      )}

      {/* Premium Netflix-style Autoplay Next Episode Countdown Overlay */}
      {showAutoplayOverlay && countdown !== null && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-40 text-center font-sans">
          <div className="max-w-md p-6 bg-neutral-950/80 border border-white/10 rounded-3xl shadow-2xl flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full border-4 border-purple-500 border-t-transparent animate-spin flex items-center justify-center">
              <span className="text-lg font-black font-mono text-white animate-pulse">{countdown}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase">الاستمرار في المتعة</span>
              <h3 className="text-xl font-black text-white">الحلقة التالية ستبدأ قريباً</h3>
              <p className="text-xs text-neutral-400 font-medium">سيتم الانتقال للحلقة التالية تلقائياً خلال {countdown} ثوانٍ...</p>
            </div>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => {
                  setShowAutoplayOverlay(false);
                  setAutoplayTriggered(true);
                  setCountdown(null);
                }}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-bold py-2.5 rounded-xl transition active:scale-95 cursor-pointer"
              >
                إلغاء التلقائي
              </button>
              <button 
                onClick={() => {
                  if (onNextEpisode) onNextEpisode();
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black py-2.5 rounded-xl shadow-lg hover:shadow-purple-500/20 transition active:scale-95 cursor-pointer"
              >
                تشغيل الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

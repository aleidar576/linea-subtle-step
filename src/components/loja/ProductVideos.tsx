import { useState, useEffect, useRef } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X, ArrowLeft, ChevronsUp } from 'lucide-react';

interface VideoItem {
  playback_id: string;
  asset_id: string;
}

interface ProductVideosProps {
  videos: VideoItem[];
  layout: 'stories' | 'carousel' | 'auto';
}

const MUX_IMG = 'https://image.mux.com';

export default function ProductVideos({ videos, layout }: ProductVideosProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  const reelsRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const playerRefs = useRef<(any | null)[]>([]);

  const isOpen = activeIndex !== null;

  // Scroll to clicked video on open
  useEffect(() => {
    if (activeIndex !== null && reelsRef.current) {
      requestAnimationFrame(() => {
        const child = reelsRef.current?.children[activeIndex] as HTMLElement | undefined;
        child?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
        setCurrentPlayingIndex(activeIndex);
      });
    }
  }, [activeIndex]);

  // IntersectionObserver for play/pause
  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = slideRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) setCurrentPlayingIndex(index);
          }
        });
      },
      { threshold: 0.8 }
    );

    // Small delay to ensure slides are rendered
    const timer = setTimeout(() => {
      slideRefs.current.forEach((slide) => {
        if (slide) observer.observe(slide);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [isOpen]);

  // Play/pause control
  useEffect(() => {
    playerRefs.current.forEach((player, i) => {
      if (!player) return;
      try {
        if (i === currentPlayingIndex) {
          player.play?.();
        } else {
          player.pause?.();
        }
      } catch (_) {}
    });
  }, [currentPlayingIndex]);

  // Cleanup on close
  const handleClose = () => {
    playerRefs.current.forEach((player) => {
      try { player?.pause?.(); } catch (_) {}
    });
    setCurrentPlayingIndex(null);
    setActiveIndex(null);
  };

  if (!videos || videos.length === 0) return null;

  // === SINGLE VIDEO ===
  if (videos.length === 1) {
    const v = videos[0];
    return (
      <div className="px-3 md:px-0 py-4">
        <h2 className="text-base font-semibold text-foreground mb-3">Vídeo do Produto</h2>
        <MuxPlayer
          playbackId={v.playback_id}
          preload="none"
          poster={`${MUX_IMG}/${v.playback_id}/thumbnail.jpg`}
          className="w-full aspect-[9/16] rounded-xl overflow-hidden"
          style={{ '--media-object-fit': 'cover', backgroundColor: 'transparent' } as any}
        />
      </div>
    );
  }

  // === STORIES ===
  if (layout === 'stories' || layout === 'auto') {
    return (
      <div className="px-3 md:px-0 py-4">
        <h2 className="text-base font-semibold text-foreground mb-3">Vídeos</h2>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {videos.map((v, i) => (
            <button
              key={v.playback_id}
              onClick={() => setActiveIndex(i)}
              className="w-20 h-20 shrink-0 rounded-full border-2 border-primary p-1 cursor-pointer"
            >
              <img
                src={`${MUX_IMG}/${v.playback_id}/animated.webp`}
                alt={`Vídeo ${i + 1}`}
                className="w-full h-full rounded-full object-cover"
              />
            </button>
          ))}
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
          <DialogContent className="max-w-none w-screen h-screen max-h-screen p-0 m-0 border-none bg-black rounded-none gap-0 [&>button]:hidden">
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 z-[60] p-2 bg-black/40 rounded-full text-white backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>

            <div
              ref={reelsRef}
              className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
            >
              {videos.map((v, i) => (
                <div
                  key={v.playback_id}
                  ref={(el) => { slideRefs.current[i] = el; }}
                  className="h-[100dvh] w-full snap-start snap-always relative flex items-center justify-center bg-black"
                >
                  <MuxPlayer
                    ref={(el: any) => { playerRefs.current[i] = el; }}
                    playbackId={v.playback_id}
                    loop
                    muted={false}
                    className="w-full h-full object-cover"
                    style={{ '--media-object-fit': 'cover', '--controls': 'none' } as any}
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === CAROUSEL ===
  return (
    <div className="px-3 md:px-0 py-4">
      <h2 className="text-base font-semibold text-foreground mb-3">Vídeos</h2>
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {videos.map((v) => (
          <div key={v.playback_id} className="w-[250px] shrink-0 rounded-lg overflow-hidden relative">
            <MuxPlayer
              playbackId={v.playback_id}
              preload="none"
              muted
              poster={`${MUX_IMG}/${v.playback_id}/thumbnail.jpg`}
              style={{ width: '100%', aspectRatio: '9/16' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

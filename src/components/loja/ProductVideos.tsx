import { useState } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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

        <Dialog open={activeIndex !== null} onOpenChange={() => setActiveIndex(null)}>
          <DialogContent className="max-w-md w-[95vw] p-0 border-0 bg-black">
            {activeIndex !== null && (
              <MuxPlayer
                playbackId={videos[activeIndex].playback_id}
                autoPlay
                style={{ width: '100%', aspectRatio: '9/16', borderRadius: '0.5rem' }}
              />
            )}
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
        {videos.map((v, i) => (
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

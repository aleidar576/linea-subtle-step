import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { midiasApi } from '@/services/saas-api';
import { settingsApi } from '@/services/api';
import { CloudUpload, Link as LinkIcon, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';

interface ImageUploaderProps {
  lojaId?: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  adminMode?: boolean;
}

const ImageUploader = ({ lojaId, value, onChange, placeholder = 'https://...', className, adminMode }: ImageUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState(value || '');
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Tipo inválido', description: 'Apenas JPG, PNG, WebP e GIF são aceitos.', variant: 'destructive' });
      return;
    }
    if (file.size > 4.5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é 4.5MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Compress image before upload
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        fileType: 'image/webp',
      });

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          let url: string;
          if (adminMode) {
            const result = await settingsApi.adminUpload(base64);
            url = result.url;
          } else {
            const result = await midiasApi.upload(lojaId!, base64);
            url = result.url;
          }
          onChange(url);
          setUrlInput(url);
          toast({ title: 'Upload concluído!' });
        } catch (err: any) {
          toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(compressed);
    } catch {
      setUploading(false);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUrlConfirm = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  const handleClear = () => {
    onChange('');
    setUrlInput('');
  };

  return (
    <div className={className}>
      {value && (
        <div className="relative inline-block mb-2">
          <img src={value} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
          <button
            type="button"
            onClick={handleClear}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:bg-destructive/90 transition"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex border-b border-border mb-2">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'upload'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CloudUpload className="h-3 w-3" /> Upload
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'url'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <LinkIcon className="h-3 w-3" /> URL
        </button>
      </div>

      {activeTab === 'upload' && (
        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileSelect} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-dashed border-2 border-muted-foreground/30 bg-muted/10 rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-muted/20 hover:border-muted-foreground/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 text-muted-foreground/50 animate-spin" />
            ) : (
              <CloudUpload className="h-6 w-6 text-muted-foreground/50" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {uploading ? 'Enviando...' : 'Arraste ou clique para enviar'}
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              JPG, PNG, WebP, GIF (comprimido automaticamente)
            </span>
          </button>
        </div>
      )}

      {activeTab === 'url' && (
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onBlur={handleUrlConfirm}
            onKeyDown={e => { if (e.key === 'Enter') handleUrlConfirm(); }}
            className="text-xs"
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

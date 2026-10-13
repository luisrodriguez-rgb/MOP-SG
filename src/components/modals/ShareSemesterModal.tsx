'use client';

import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useSemesterData } from '@/hooks/useSemesterData';
import { generateShareUrl, SharedSemesterPayload } from '@/lib/share/semesterShare';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  ExternalLink,
  BookOpen,
  Calendar,
  Sparkles,
} from 'lucide-react';

export function ShareSemesterModal() {
  const { isShareModalOpen, closeShareModal } = useUIStore();
  const { profile, semester, subjects, scheduleBlocks } = useSemesterData();
  const [copied, setCopied] = useState(false);

  if (!isShareModalOpen) return null;

  // Extraer NRCs o códigos de materias para empaquetar
  const nrcs = subjects.map((s) => {
    const match = s.code.match(/\b\d{5}\b/);
    return match ? match[0] : s.code.replace(/\s+/g, '');
  });

  const payload: SharedSemesterPayload = {
    u: profile?.university || 'Universidad Icesi',
    c: profile?.program || 'Carrera Universitaria',
    s: profile?.semesterNumber || 4,
    nrcs,
    author: profile?.name ? profile.name.split(' ')[0] : 'Estudiante',
  };

  const shareUrl = generateShareUrl(payload);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const handleWhatsApp = () => {
    const text = `🎓 ¡Hola! Te comparto mi horario de *${payload.c}* (${payload.s}° Semestre) para este periodo en *Mi Semestre | Icesi*.\n\nCárgalo con un solo clic aquí:\n${shareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0c102a] border border-[#232a58] rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] text-white space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Compartir mi Semestre
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Enlace Portátil
                </span>
              </div>
              <p className="text-xs text-[#8b95c2] mt-0.5">
                Tus compañeros de curso podrán cargar tu mismo horario sin registrarse.
              </p>
            </div>
          </div>

          <button
            onClick={closeShareModal}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tarjeta de Resumen del Semestre a Compartir */}
        <div className="bg-[#080b20] border border-[#1e2552] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>{payload.c}</span>
              </div>
              <div className="text-[11px] text-[#7a85b8] font-mono mt-0.5">
                {payload.s}° Semestre · {payload.u}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                {subjects.length} materias
              </span>
            </div>
          </div>

          {/* Micro-lista de materias incluidas */}
          <div className="pt-2 border-t border-[#181d45] flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {subjects.map((sub) => (
              <span
                key={sub.id}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 font-medium truncate max-w-[200px]"
                title={`${sub.name} (${sub.code})`}
              >
                {sub.name}
              </span>
            ))}
          </div>
        </div>

        {/* Acciones Rápidas de Compartir */}
        <div className="space-y-2.5">
          {/* Botón WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-98"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Compartir por WhatsApp con mis compañeros</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </button>

          {/* Enlace y Botón Copiar */}
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-[#080b20] border border-[#232a58] rounded-xl px-3.5 py-2.5 text-xs text-white/70 font-mono select-all focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'bg-[#2b31a8] hover:bg-[#383fc2] text-white shadow-md'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pie informativo */}
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Al abrir este enlace, tus compañeros verán tu horario con sus huecos libres calculados automáticamente.
          </span>
        </div>
      </div>
    </div>
  );
}

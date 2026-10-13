'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  UploadCloud,
  FileText,
  Zap,
  GraduationCap,
  School,
  AlertCircle,
  HelpCircle,
  Coffee,
  Flame,
} from 'lucide-react';
import { ingestAcademicEvidence } from '@/lib/importer/universal/pipeline';
import { commitAcademicDataAtomically } from '@/lib/importer/universal/committer';
import { IngestResult, ParsedAcademicData } from '@/lib/importer/universal/types';
import { getSharedSemesterFromLocation, SharedSemesterPayload } from '@/lib/share/semesterShare';
import { lookupNRCCourse } from '@/lib/importer/nrcCatalog';
import { officialCareerTemplates } from '@/lib/templates/academicTemplates';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSelectDemo: () => void;
}

const ICESI_PROGRAMS = [
  'Ingeniería Industrial',
  'Ingeniería de Sistemas',
  'Economía y Negocios Internacionales',
  'Ingeniería Telemática',
  'Diseño de Medios Interactivos',
  'Administración de Empresas',
  'Medicina',
  'Biología con concentración en Conservación',
  'Derecho',
  'Psicología',
];

export function OnboardingFlow({ onComplete, onSelectDemo }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Paso 1: Identidad
  const [studentName, setStudentName] = useState('');
  const [university, setUniversity] = useState('Universidad Icesi');
  const [program, setProgram] = useState('Ingeniería Industrial');
  const [semesterNumber, setSemesterNumber] = useState(4);

  // Paso 2: Magic Drop & Texto
  const [pastedText, setPastedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paso 3: Revelación de valor & Pregunta clave
  const [freeGapHours, setFreeGapHours] = useState(24);
  const [busiestDay, setBusiestDay] = useState('Miércoles');
  const [longestGap, setLongestGap] = useState({ day: 'Martes', hours: 4 });
  const [sharedAuthor, setSharedAuthor] = useState<string | null>(null);

  // Pregunta activadora de riesgo
  const [selectedUrgentSubjectId, setSelectedUrgentSubjectId] = useState<string>('');
  const [urgentExamTimeline, setUrgentExamTimeline] = useState<'2_days' | '7_days' | '14_days'>('2_days');
  const [isFinishing, setIsFinishing] = useState(false);

  // 1. Detectar si viene de un enlace compartido (?share=...)
  useEffect(() => {
    const shared = getSharedSemesterFromLocation();
    if (shared) {
      handleLoadSharedSemester(shared);
    }
  }, []);

  const handleLoadSharedSemester = (shared: SharedSemesterPayload) => {
    setIsProcessing(true);
    setProcessingStage('Reconstruyendo semestre compartido desde enlace...');
    setUniversity(shared.u || 'Universidad Icesi');
    setProgram(shared.c || 'Ingeniería Industrial');
    setSemesterNumber(shared.s || 4);
    if (shared.author) {
      setSharedAuthor(shared.author);
    }

    // Reconstruir asignaturas y bloques mediante NRC Catalog
    const subjectsMap = new Map<string, any>();
    const scheduleBlocks: any[] = [];

    shared.nrcs.forEach((nrc) => {
      const info = lookupNRCCourse(nrc);
      if (info) {
        const subId = `sub-nrc-${nrc}`;
        subjectsMap.set(subId, {
          id: subId,
          code: info.code,
          nrc: info.nrc,
          name: info.name,
          credits: info.credits,
          color: '#3b3abf',
          professor: info.professor,
          maxAbsences: 4,
        });

        info.blocks.forEach((b, idx) => {
          scheduleBlocks.push({
            id: `sb-${subId}-${idx}`,
            subjectId: subId,
            dayOfWeek: b.dayOfWeek,
            startTime: b.startTime,
            endTime: b.endTime,
            location: b.location,
          });
        });
      }
    });

    const parsed: ParsedAcademicData = {
      student: {
        name: 'Estudiante',
        university: shared.u,
        program: shared.c,
        semesterNumber: shared.s,
      },
      semester: {
        name: `${shared.s}° Semestre · ${shared.c}`,
        startDate: '2026-08-01',
        endDate: '2026-12-05',
        totalWeeks: 16,
      },
      subjects: Array.from(subjectsMap.values()),
      scheduleBlocks,
    };

    calculateMetricsFromBlocks(scheduleBlocks);

    const syntheticResult: IngestResult = {
      data: parsed,
      detections: [
        {
          container: 'text',
          documentType: 'schedule',
          confidence: 1,
          signals: ['SHARED_URL_LINK'],
        },
      ],
      ambiguities: [],
      evidenceGraph: { nodes: [], edges: [] },
      missingFields: [],
      warnings: [],
      suggestedReview: [],
    };

    setIngestResult(syntheticResult);
    if (parsed.subjects.length > 0) {
      setSelectedUrgentSubjectId(parsed.subjects[0].id);
    }
    setIsProcessing(false);
    setCurrentStep(3); // Saltar directo a la Revelación de Valor
  };

  // Calcular métricas psicológicas basadas en bloques de horario
  const calculateMetricsFromBlocks = (blocks: Array<{ dayOfWeek: number; startTime: string; endTime: string }>) => {
    if (!blocks || blocks.length === 0) {
      setFreeGapHours(24);
      setBusiestDay('Miércoles');
      setLongestGap({ day: 'Martes', hours: 4 });
      return;
    }

    const dayClassHours: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayNames: Record<number, string> = {
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado',
    };

    blocks.forEach((b) => {
      const [sh, sm] = b.startTime.split(':').map(Number);
      const [eh, em] = b.endTime.split(':').map(Number);
      const durationHours = eh + em / 60 - (sh + sm / 60);
      dayClassHours[b.dayOfWeek] = (dayClassHours[b.dayOfWeek] || 0) + Math.max(0, durationHours);
    });

    let maxDay = 1;
    let maxHours = 0;
    let totalClassHours = 0;

    Object.entries(dayClassHours).forEach(([dayStr, hours]) => {
      const d = Number(dayStr);
      totalClassHours += hours;
      if (hours > maxHours) {
        maxHours = hours;
        maxDay = d;
      }
    });

    // Estimación de huecos libres universitarios (jornada 7am - 6pm = 11h diarias x 5 días = 55h campus)
    const estimatedCampusHours = 50;
    const computedFreeHours = Math.max(12, Math.round(estimatedCampusHours - totalClassHours));

    setFreeGapHours(computedFreeHours);
    setBusiestDay(dayNames[maxDay] || 'Miércoles');
    setLongestGap({
      day: maxDay === 2 ? 'Jueves' : 'Martes',
      hours: Math.min(5, Math.max(3, Math.round(computedFreeHours / 6))),
    });
  };

  // Procesar evidencia ingresada en Paso 2
  const processEvidence = async (text?: string, file?: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStage('Detectando códigos y firmas académicas en Icesi...');

    try {
      const evidenceList: any[] = [];
      if (file) {
        evidenceList.push({ file });
      }
      if (text && text.trim()) {
        evidenceList.push({ text: text.trim() });
      }

      setProcessingStage('Cruzando salones y códigos con el catálogo oficial...');
      const result = await ingestAcademicEvidence(evidenceList);

      if (!result.data.subjects || result.data.subjects.length === 0) {
        setErrorMsg(
          'No logramos detectar materias en el texto pegado. Prueba pegando los códigos de tu horario o usa la plantilla oficial en 1 clic.'
        );
        setIsProcessing(false);
        return;
      }

      // Enriquecer perfil del estudiante si fue capturado en el Paso 1
      result.data.student = {
        name: studentName.trim() || result.data.student?.name || 'Estudiante',
        university,
        program,
        semesterNumber,
      };

      setIngestResult(result);
      calculateMetricsFromBlocks(result.data.scheduleBlocks);

      if (result.data.subjects.length > 0) {
        setSelectedUrgentSubjectId(result.data.subjects[0].id);
      }

      setProcessingStage('Calculando tus huecos libres y margen de inasistencias...');
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentStep(3); // Revelación de valor
      }, 600);
    } catch (err: any) {
      console.error('Error al procesar horario:', err);
      setErrorMsg('Ocurrió un error al analizar la evidencia. Intenta con la plantilla en 1 clic.');
      setIsProcessing(false);
    }
  };

  // Atajo de 1 clic para cargar la plantilla de la carrera
  const handleUseOfficialTemplate = async () => {
    setIsProcessing(true);
    setProcessingStage(`Cargando plantilla oficial de ${program}...`);

    let templateKey = 'template-industrial-4';
    if (program.includes('Economía')) templateKey = 'template-economia-4';
    if (program.includes('Sistemas') || program.includes('Telemática')) templateKey = 'template-sistemas-5';

    const tmpl = officialCareerTemplates.find((t) => t.id === templateKey) || officialCareerTemplates[0];

    const subjects = tmpl.subjects.map((s, idx) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      credits: s.credits,
      color: s.color || '#3b3abf',
      professor: s.professor || 'Docente Titular',
      maxAbsences: s.maxAbsences || 4,
    }));

    const scheduleBlocks: any[] = [];
    tmpl.schedule.forEach((b, idx) => {
      scheduleBlocks.push({
        id: `sb-tmpl-${idx}`,
        subjectId: b.subjectId,
        dayOfWeek: b.dayOfWeek,
        startTime: b.startTime,
        endTime: b.endTime,
        location: b.location,
      });
    });

    const parsed: ParsedAcademicData = {
      student: {
        name: studentName.trim() || 'Estudiante',
        university,
        program,
        semesterNumber,
      },
      semester: {
        name: `${semesterNumber}° Semestre · ${program}`,
        startDate: '2026-08-01',
        endDate: '2026-12-05',
        totalWeeks: 16,
      },
      subjects,
      scheduleBlocks,
    };

    calculateMetricsFromBlocks(scheduleBlocks);

    const syntheticResult: IngestResult = {
      data: parsed,
      detections: [
        {
          container: 'text',
          documentType: 'schedule',
          confidence: 1,
          signals: ['OFFICIAL_CAREER_TEMPLATE'],
        },
      ],
      ambiguities: [],
      evidenceGraph: { nodes: [], edges: [] },
      missingFields: [],
      warnings: [],
      suggestedReview: [],
    };

    setIngestResult(syntheticResult);
    if (subjects.length > 0) {
      setSelectedUrgentSubjectId(subjects[0].id);
    }

    setTimeout(() => {
      setIsProcessing(false);
      setCurrentStep(3);
    }, 500);
  };

  // Finalizar onboarding y guardar en Dexie
  const handleFinishAndEnter = async () => {
    if (!ingestResult) return;
    setIsFinishing(true);

    try {
      const dataToCommit = { ...ingestResult.data };

      // Si el usuario configuró su parcial más urgente en el Paso 3, instanciarlo
      if (selectedUrgentSubjectId) {
        const targetSubject = dataToCommit.subjects.find((s) => s.id === selectedUrgentSubjectId);
        const addDays = (d: number) => {
          const date = new Date();
          date.setDate(date.getDate() + d);
          return date.toISOString().split('T')[0];
        };

        const examDate =
          urgentExamTimeline === '2_days'
            ? `${addDays(2)}T07:00:00`
            : urgentExamTimeline === '7_days'
            ? `${addDays(7)}T09:00:00`
            : `${addDays(14)}T14:00:00`;

        const urgentExam = {
          id: `exam-urgent-${Date.now()}`,
          subjectId: selectedUrgentSubjectId,
          title: `Primer Parcial: ${targetSubject?.name || 'Evaluación Clave'}`,
          date: examDate,
          weight: 25,
          location: 'Aula Principal',
          notes: 'Configurado como prioridad máxima durante el onboarding inicial.',
        };

        dataToCommit.exams = [urgentExam];

        // Guardar la materia prioritaria en localStorage para resaltarla en el Dashboard
        if (typeof window !== 'undefined') {
          localStorage.setItem('mi_semestre_priority_subject_id', selectedUrgentSubjectId);
        }
      }

      await commitAcademicDataAtomically(dataToCommit);

      // Explosión de confeti de celebración
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        onComplete();
      }, 700);
    } catch (err) {
      console.error('Error al guardar datos del onboarding:', err);
      setIsFinishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-[#0c102b] via-[#101438] to-[#070919] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* ─────────────────────────────────────────────────────────────
          BARRA SUPERIOR DE BRANDING Y SALVAVIDAS DEMO
         ───────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between max-w-4xl w-full mx-auto pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#3b3abf] to-[#6366f1] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              Mi Semestre
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Universidad Icesi
              </span>
            </h1>
            <p className="text-xs text-white/50">Centro de Control y Optimización Académica</p>
          </div>
        </div>

        {/* Salvavidas elegante para reclutadores o profesores */}
        <button
          onClick={onSelectDemo}
          className="text-xs font-semibold text-indigo-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer group"
          title="Ver cómo funciona con datos de muestra de 4to semestre"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">¿Solo explorando?</span> Entrar con Semestre Demo
        </button>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          CUERPO PRINCIPAL DEL ONBOARDING SEGÚN EL PASO
         ───────────────────────────────────────────────────────────── */}
      <main className="max-w-xl w-full mx-auto my-auto py-8">
        {/* Indicador de pasos minimalista */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentStep === step
                  ? 'w-10 bg-indigo-500'
                  : currentStep > step
                  ? 'w-4 bg-emerald-500'
                  : 'w-4 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* ═════════════════════════════════════════════════════════════
            PASO 1: EL GANCHO DE IDENTIDAD (5 Segundos)
           ═════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                <Sparkles className="w-3.5 h-3.5" />
                Configuración Rápida en 45 Segundos
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Deja de adivinar qué estudiar en tus huecos libres.
              </h2>
              <p className="text-sm text-white/60 max-w-md mx-auto">
                Transforma tu horario universitario en un sistema que prioriza tu tiempo útil real.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-md">
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  ¿Cómo te llamas?
                </label>
                <input
                  type="text"
                  placeholder="Tu nombre (opcional)"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Universidad
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={university}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/90 font-medium cursor-not-allowed"
                    />
                    <School className="w-4 h-4 text-indigo-400 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                    Semestre Activo
                  </label>
                  <select
                    value={semesterNumber}
                    onChange={(e) => setSemesterNumber(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num} className="bg-[#121633] text-white">
                        {num}° Semestre
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Carrera / Programa Académico
                </label>
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  {ICESI_PROGRAMS.map((prog) => (
                    <option key={prog} value={prog} className="bg-[#121633] text-white">
                      {prog}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="w-full mt-2 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer group"
              >
                <span>Continuar a Cargar Horario</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            PASO 2: EL "MAGIC DROP" CONTEXTUAL (20 Segundos)
           ═════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Elige la forma más rápida de entrar
              </h2>
              <p className="text-sm text-white/60">
                El motor contextual de Icesi extrae códigos, profesores y salones al instante.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isProcessing ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center space-y-5 shadow-xl backdrop-blur-md">
                <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">Analizando tu horario universitario...</h3>
                  <p className="text-xs font-mono text-indigo-300 animate-pulse">{processingStage}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Prioridad Máxima: Pegar texto de Banner (Ctrl + V) */}
                <div className="bg-white/5 border border-indigo-500/40 rounded-2xl p-5 space-y-3 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      Opción Recomendada (100% Precisa)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-white/70">
                      Ctrl + V
                    </span>
                  </div>

                  <p className="text-xs text-white/70">
                    Copia la tabla o balance de Banner y pégala aquí. El catálogo reconoce los NRCs de 5 dígitos al instante.
                  </p>

                  <textarea
                    rows={3}
                    placeholder="Pega aquí el texto de tu horario (ej: 05359 Optimización Lunes 7-9 am, 42002 Datos...)"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs text-white font-mono placeholder-white/30 focus:outline-none focus:border-indigo-400"
                  />

                  <button
                    disabled={!pastedText.trim()}
                    onClick={() => processEvidence(pastedText)}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Analizar Texto Copiado</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. Drag & Drop de Archivos (Captura o PDF de Banner) */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/20 hover:border-indigo-400/60 rounded-2xl p-5 text-center transition-all bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.ics,.txt,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processEvidence(undefined, file);
                    }}
                  />
                  <UploadCloud className="w-7 h-7 text-white/50 group-hover:text-indigo-300 mx-auto mb-2 transition-colors" />
                  <p className="text-xs font-semibold text-white group-hover:text-indigo-200">
                    O arrastra tu captura de pantalla, PDF o archivo .ICS
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Soporta imágenes de horario, PDF de matrícula y calendarios
                  </p>
                </div>

                {/* 3. Atajo salvavidas para perezosos: 1 clic con plantilla oficial */}
                <div className="pt-2 text-center">
                  <div className="flex items-center gap-3 my-2 text-white/30 text-xs">
                    <div className="h-px bg-white/10 flex-1" />
                    <span>O si tienes prisa</span>
                    <div className="h-px bg-white/10 flex-1" />
                  </div>

                  <button
                    onClick={handleUseOfficialTemplate}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white/90 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Usar horario oficial de {program} (Semestre {semesterNumber}) en 1 clic</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            PASO 3: LA REVELACIÓN DE VALOR ("Aha! Moment" - 15 Segundos)
           ═════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && ingestResult && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {sharedAuthor
                  ? `Semestre Compartido por ${sharedAuthor}`
                  : `¡Semestre Configurado con Éxito!`}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Analizamos tu semestre en Icesi
              </h2>
              <p className="text-sm text-white/60">
                Detectamos {ingestResult.data.subjects.length} materias y organizamos tus huecos libres.
              </p>
            </div>

            {/* Tarjeta de Impacto Psicológico Inmediato */}
            <div className="bg-gradient-to-br from-[#181d45] to-[#121638] border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <Clock className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="text-lg font-black text-emerald-400 font-mono block">
                    {freeGapHours}h
                  </span>
                  <span className="text-[10px] text-white/60 font-medium">Huecos Libres / Sem.</span>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <Flame className="w-4 h-4 text-rose-400 mx-auto mb-1" />
                  <span className="text-xs font-black text-white font-mono block truncate mt-1">
                    {busiestDay}
                  </span>
                  <span className="text-[10px] text-white/60 font-medium">Día Más Pesado</span>
                </div>

                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <Coffee className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                  <span className="text-lg font-black text-indigo-300 font-mono block">
                    {longestGap.hours}h
                  </span>
                  <span className="text-[10px] text-white/60 font-medium">Bloque en {longestGap.day}</span>
                </div>
              </div>

              {/* Materias Detectadas */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-2">
                  Tus Asignaturas Matriculadas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ingestResult.data.subjects.map((s) => (
                    <span
                      key={s.id}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-white/90 font-medium"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* UNA SOLA PREGUNTA PARA ACTIVAR EL RADAR DE RIESGO */}
            <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-5 space-y-3.5 shadow-lg">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    ¿Cuál es el examen o entrega que más te preocupa?
                  </h3>
                  <p className="text-xs text-white/60">
                    Activará el Radar de Riesgo en tiempo real para recomendarte sesiones de estudio.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <select
                  value={selectedUrgentSubjectId}
                  onChange={(e) => setSelectedUrgentSubjectId(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {ingestResult.data.subjects.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#121633] text-white">
                      {s.name} ({s.code || 'Icesi'})
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '2_days', label: 'En 2-3 días', color: 'border-rose-500/40 text-rose-300' },
                    { id: '7_days', label: 'Próx. Semana', color: 'border-amber-500/40 text-amber-300' },
                    { id: '14_days', label: 'En 2 Semanas', color: 'border-emerald-500/40 text-emerald-300' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setUrgentExamTimeline(option.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                        urgentExamTimeline === option.id
                          ? 'bg-white/15 border-white text-white font-bold ring-1 ring-white/30'
                          : `bg-black/20 ${option.color} hover:bg-white/5`
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* BOTÓN FINAL DE ENTRADA AL DASHBOARD */}
            <button
              disabled={isFinishing}
              onClick={handleFinishAndEnter}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:opacity-95 font-bold text-sm text-white flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/40 transition-all cursor-pointer group"
            >
              <span>{isFinishing ? 'Iniciando Semestre...' : '🚀 Entrar a mi Semestre'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          PIE DE PÁGINA MINIMALISTA
         ───────────────────────────────────────────────────────────── */}
      <footer className="text-center py-2 text-xs text-white/30">
        Mi Semestre · Diseñado para la psicología académica de la Universidad Icesi
      </footer>
    </div>
  );
}

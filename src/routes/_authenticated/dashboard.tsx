import {createFileRoute} from '@tanstack/react-router';
import {PersonalApp} from '@/components/study/app';
import {studyOptions} from '@/lib/study-data';
import {pageMeta} from '@/lib/study';
export const Route=createFileRoute('/_authenticated/dashboard')({head:()=>pageMeta('Resumen'),loader:({context})=>context.queryClient.ensureQueryData(studyOptions),pendingComponent:()=> <div className="grid min-h-screen place-items-center text-muted-foreground">Cargando tu espacio…</div>,component:()=> <PersonalApp page="dashboard"/>});

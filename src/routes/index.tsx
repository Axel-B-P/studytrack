import {createFileRoute} from '@tanstack/react-router';
import {DemoApp} from '@/components/study/app';
import {pageMeta} from '@/lib/study';
export const Route=createFileRoute('/')({head:()=>pageMeta('Tu progreso de estudio'),component:DemoApp});

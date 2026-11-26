import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type StudyTimerState = {
  subject: string;
  setSubject: Dispatch<SetStateAction<string>>;
  seconds: number;
  setSeconds: Dispatch<SetStateAction<number>>;
  running: boolean;
  setRunning: Dispatch<SetStateAction<boolean>>;
  start: number;
  setStart: Dispatch<SetStateAction<number>>;
};

const StudyTimerContext = createContext<StudyTimerState | null>(null);

export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const [subject, setSubject] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [start, setStart] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, [running, start]);

  return (
    <StudyTimerContext.Provider
      value={{
        subject,
        setSubject,
        seconds,
        setSeconds,
        running,
        setRunning,
        start,
        setStart,
      }}
    >
      {children}
    </StudyTimerContext.Provider>
  );
}

export function useStudyTimer() {
  const context = useContext(StudyTimerContext);
  if (!context) throw new Error("useStudyTimer debe usarse dentro de StudyTimerProvider");
  return context;
}

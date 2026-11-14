"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  confirmVoiceTransactionAction,
  parseVoiceEntryAction,
  type ActionState,
  type ParseVoiceEntryResult,
} from "@/lib/actions";

type Customer = { id: string; name: string };
type ParsedVoiceEntry = Extract<ParseVoiceEntryResult, { ok: true }>["data"];
type Step = "idle" | "listening" | "parsing" | "confirm" | "error";

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Minimal typing for the Web Speech API — not in TypeScript's lib.dom.d.ts,
// and only Chrome/Chromium implement it (fine for this app's Android/Chrome
// PWA-first target per replica/architecture.md; everyone else keeps the
// regular typed Add Entry form as the fallback).
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: { results: { [alternativeIndex: number]: { transcript: string } }[] }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

// Browser support never changes during a session, so there's nothing to
// subscribe to — this is purely how useSyncExternalStore is meant to read a
// value that's genuinely different on the server (no `window`) vs the
// client without causing a hydration mismatch or a setState-in-effect.
function subscribeNever() {
  return () => {};
}
function getSupportedSnapshot() {
  return getSpeechRecognition() !== null;
}
function getSupportedServerSnapshot() {
  return false;
}

export function VoiceEntryFlow({ customers, language }: { customers: Customer[]; language: "hi" | "en" }) {
  const [step, setStep] = useState<Step>("idle");
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedVoiceEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const supported = useSyncExternalStore(subscribeNever, getSupportedSnapshot, getSupportedServerSnapshot);

  function startListening() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError("Voice entry needs Chrome, on Android or desktop. Use the regular Add entry form instead.");
      setStep("error");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === "hi" ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setStep("parsing");
      const result = await parseVoiceEntryAction(text);
      if (!result.ok) {
        setError(result.error);
        setStep("error");
        return;
      }
      setParsed(result.data);
      setStep("confirm");
    };
    recognition.onerror = () => {
      setError("Didn't catch that. Try again.");
      setStep("error");
    };
    recognition.onend = () => {
      setStep((current) => (current === "listening" ? "idle" : current));
    };

    recognitionRef.current = recognition;
    setError(null);
    setTranscript("");
    setParsed(null);
    setStep("listening");
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function reset() {
    setStep("idle");
    setError(null);
    setTranscript("");
    setParsed(null);
  }

  if (step === "confirm" && parsed) {
    return <VoiceConfirmForm parsed={parsed} customers={customers} transcript={transcript} onCancel={reset} />;
  }

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <button
        type="button"
        onClick={step === "listening" ? stopListening : startListening}
        disabled={step === "parsing"}
        aria-label={step === "listening" ? "Stop listening" : "Start voice entry"}
        className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl text-on-accent transition
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
          disabled:opacity-50
          ${step === "listening" ? "bg-danger animate-pulse" : "bg-accent"}`}
      >
        <span aria-hidden="true">🎙️</span>
      </button>

      <p className="text-sm font-medium text-ink">
        {step === "idle" && (supported ? "Tap and say an entry" : "Voice entry isn't supported in this browser")}
        {step === "listening" && "Listening… tap to stop"}
        {step === "parsing" && "Working it out…"}
        {step === "error" && (error ?? "Something went wrong")}
      </p>

      {step === "idle" && (
        <p className="max-w-xs text-xs text-muted">
          {language === "hi"
            ? 'उदाहरण: "रमेश को पांच सौ रुपये दिए"'
            : 'e.g. "Ramesh ko 500 rupaye diye" or "Got 200 from Suresh"'}
        </p>
      )}

      {transcript && step !== "idle" && (
        <p className="max-w-xs text-sm text-muted">&ldquo;{transcript}&rdquo;</p>
      )}

      {step === "error" && (
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      )}
    </div>
  );
}

function VoiceConfirmForm({
  parsed,
  customers,
  transcript,
  onCancel,
}: {
  parsed: ParsedVoiceEntry;
  customers: Customer[];
  transcript: string;
  onCancel: () => void;
}) {
  const initialState: ActionState = {};
  const [state, formAction, pending] = useActionState(confirmVoiceTransactionAction, initialState);
  const [customerChoice, setCustomerChoice] = useState(parsed.matchedCustomerId ?? "__new__");
  const [newName, setNewName] = useState(parsed.matchedCustomerId ? "" : parsed.spokenCustomerName);
  const [type, setType] = useState<"you_gave" | "you_got">(parsed.type);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="rounded-md bg-surface px-3 py-2 text-sm text-muted">&ldquo;{transcript}&rdquo;</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="voice-customer" className="text-sm font-medium text-ink">
          Customer
        </label>
        <select
          id="voice-customer"
          value={customerChoice}
          onChange={(e) => setCustomerChoice(e.target.value)}
          className="h-12 rounded-sm border border-input bg-bg px-3 text-base text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="__new__">+ New customer: {parsed.spokenCustomerName}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {customerChoice === "__new__" ? (
          <input type="hidden" name="newCustomerName" value={newName} />
        ) : (
          <input type="hidden" name="customerId" value={customerChoice} />
        )}
      </div>

      {customerChoice === "__new__" && (
        // No `required` — see NewCustomerForm.tsx: the server action's own
        // validation and styled error cover this consistently.
        <Input label="New customer's name" value={newName} onChange={(e) => setNewName(e.target.value)} />
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">Entry type</legend>
        <div className="flex gap-3">
          <label className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-input px-3 text-sm font-medium text-ink has-[:checked]:border-accent has-[:checked]:bg-accent/10">
            <input
              type="radio"
              name="type"
              value="you_gave"
              checked={type === "you_gave"}
              onChange={() => setType("you_gave")}
              className="accent-[var(--accent)]"
            />
            You Gave
          </label>
          <label className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-input px-3 text-sm font-medium text-ink has-[:checked]:border-accent has-[:checked]:bg-accent/10">
            <input
              type="radio"
              name="type"
              value="you_got"
              checked={type === "you_got"}
              onChange={() => setType("you_got")}
              className="accent-[var(--accent)]"
            />
            You Got
          </label>
        </div>
      </fieldset>

      <Input label="Amount (₹)" name="amount" numeric defaultValue={String(parsed.amountRupees)} />
      <Input label="Note (optional)" name="note" defaultValue={parsed.note ?? ""} />
      <input type="hidden" name="transactionDate" value={today()} />

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={pending}>
          Save
        </Button>
      </div>
    </form>
  );
}

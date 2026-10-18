"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/button";

type RequestMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
};

export function CustomRequestConversation({ requestId }: { requestId: string }) {
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/custom-requests/${requestId}/messages`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Messages could not be loaded.");
      setMessages(result.messages);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Messages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    let active = true;
    fetch(`/api/custom-requests/${requestId}/messages`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Messages could not be loaded.");
        return result;
      })
      .then((result) => {
        if (!active) return;
        setMessages(result.messages);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Messages could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [requestId]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/custom-requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Message could not be sent.");
      setMessage("");
      await loadMessages();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-label="Request messages" className="mt-4 rounded-xl border border-border/60 bg-background/70 p-4">
      <h3 className="text-sm font-semibold">Request messages</h3>
      {loading ? <p className="mt-2 text-xs text-muted-foreground" role="status">Loading messages…</p> : null}
      {!loading && messages.length ? (
        <ol aria-live="polite" className="mt-3 grid max-h-64 gap-2 overflow-y-auto">
          {messages.map((item) => (
            <li className="rounded-lg bg-card px-3 py-2" key={item.id}>
              <p className="text-[11px] font-semibold text-primary">{item.sender.name} · {item.sender.role.toLowerCase()}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.body}</p>
              <time className="mt-1 block text-[10px] text-muted-foreground" dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
      ) : null}
      {!loading && !messages.length ? (
        <p className="mt-2 text-xs text-muted-foreground">No messages have been sent for this request.</p>
      ) : null}
      <form className="mt-3 grid gap-2" method="post" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor={`message-${requestId}`}>Write a message</label>
        <textarea
          className="ui-textarea min-h-20"
          id={`message-${requestId}`}
          maxLength={3000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a message about this itinerary"
          required
          value={message}
        />
        {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
        <Button className="w-fit" disabled={sending || !message.trim()} size="sm" type="submit">
          {sending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </section>
  );
}

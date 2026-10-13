"use client";

import { useThread, useThreadList, type ChatStorage, type Message, type Thread } from "@openuidev/react-ui";
import { useEffect } from "react";

// Threads and their messages in the browser's localStorage, so a conversation
// survives switching threads and reloading the page. Assistant messages keep
// their page state (what the user typed, ticked or moved), which the chat
// saves into the message itself.

const THREADS = "oiu:threads";
const messagesKey = (id: string) => `oiu:messages:${id}`;
const MAX_THREADS = 50;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the chat keeps working, unsaved.
  }
}

const titleOf = (message: Message) => {
  const text = typeof message.content === "string" ? message.content : "";
  return text.replace(/\s+/g, " ").trim().slice(0, 60) || "New chat";
};

export function localChatStorage(): ChatStorage {
  return {
    thread: {
      async listThreads() {
        return { threads: read<Thread[]>(THREADS, []) };
      },
      async createThread(firstMessage) {
        const thread: Thread = { id: crypto.randomUUID(), title: titleOf(firstMessage as Message), createdAt: new Date().toISOString() };
        const threads = [thread, ...read<Thread[]>(THREADS, [])];
        for (const old of threads.slice(MAX_THREADS)) {
          try {
            localStorage.removeItem(messagesKey(old.id));
          } catch {
            // Eviction is best effort too: blocked storage must not stop chat.
          }
        }
        write(THREADS, threads.slice(0, MAX_THREADS));
        write(messagesKey(thread.id), [firstMessage]);
        return thread;
      },
      async getMessages(threadId) {
        return read<Message[]>(messagesKey(threadId), []);
      },
      async updateThread(thread) {
        write(THREADS, read<Thread[]>(THREADS, []).map((t) => (t.id === thread.id ? { ...t, ...thread, isPending: undefined } : t)));
        return thread;
      },
      async deleteThread(id) {
        write(THREADS, read<Thread[]>(THREADS, []).filter((t) => t.id !== id));
        try {
          localStorage.removeItem(messagesKey(id));
        } catch {}
      },
    },
  };
}

/**
 * Saves the open thread's messages whenever they change and no answer is
 * streaming. Render it inside AgentInterface (it needs the chat store).
 */
export function SaveMessages() {
  const messages = useThread((s) => s.messages);
  const isRunning = useThread((s) => s.isRunning);
  const threadId = useThreadList((s) => s.selectedThreadId);
  // Written at once: a debounce would lose the last change when the user
  // switches threads right after it.
  useEffect(() => {
    if (threadId && !isRunning && messages.length > 0) write(messagesKey(threadId), messages);
  }, [threadId, isRunning, messages]);
  return null;
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, Send, X, Sparkles, Bot, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/utils';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

export function AIChatbot() {
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [assistantMode, setAssistantMode] = useState<'live' | 'fallback'>('live');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hi! I can help refine destination, vibe, budget, and amenities before you book.'
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping, isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim()
        };

        const nextConversation = [...messages, userMsg];
        setMessages(nextConversation);
        setInputValue('');
        setIsTyping(true);

        try {
            const response = await fetch('/api/concierge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: nextConversation.slice(-20).map((item) => ({
                        role: item.role,
                        text: item.content
                    })),
                    trip: {
                        destination: searchParams.get('q') ?? undefined,
                        checkin: searchParams.get('checkin') ?? undefined,
                        checkout: searchParams.get('checkout') ?? undefined,
                        adults: Number(searchParams.get('adults') ?? '') || undefined,
                        rooms: Number(searchParams.get('rooms') ?? '') || undefined,
                        currency: searchParams.get('currency') ?? undefined,
                        language: searchParams.get('language') ?? undefined
                    }
                })
            });

            const payload = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
            if (!response.ok) {
                setAssistantMode('fallback');
                throw new Error(payload.error ?? 'Concierge is temporarily unavailable.');
            }

            const reply = payload.reply?.trim() || 'Tell me your destination and budget, and I will narrow top options.';
            setAssistantMode('live');
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: reply
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch {
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Concierge is temporarily unavailable. You can continue browsing and I can still guide with general tips.'
            };
            setMessages((prev) => [...prev, botMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-24 right-4 z-50 flex h-[min(500px,calc(100vh-8rem))] w-[calc(100vw-2rem)] max-w-[350px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 sm:right-8"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b bg-primary p-4 text-primary-foreground">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">TravelApp Assistant</h3>
                                    <p className="text-xs text-primary-foreground/80">
                                        {assistantMode === 'live' ? 'Live concierge' : 'Fallback guidance'}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full text-primary-foreground hover:bg-white/20"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close assistant"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto bg-muted/30 p-4" ref={scrollRef}>
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex w-full gap-2",
                                            msg.role === 'user' ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                                <Bot className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                                                msg.role === 'user'
                                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                                    : "bg-card text-foreground shadow-sm rounded-bl-sm border border-border/50"
                                            )}
                                        >
                                            {msg.content}
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex w-full gap-2 justify-start">
                                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                            <Bot className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border/50 bg-card px-4 py-3 shadow-sm">
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.3s]"></span>
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.15s]"></span>
                                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40"></span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Input */}
                        <div className="border-t bg-background p-3">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSend();
                                }}
                                className="flex items-center gap-2"
                            >
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Ask about destination, vibe, budget, or amenities..."
                                    className="rounded-full border-muted bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className={cn("h-10 w-10 rounded-full shrink-0 transition-transform", inputValue.trim() ? "scale-100" : "scale-90 opacity-80")}
                                    disabled={!inputValue.trim()}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                layout
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Open assistant"
                className={cn(
                    "fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-colors hover:bg-primary/90 sm:bottom-8 sm:right-8",
                    isOpen && "hidden"
                )}
            >
                <MessageSquare className="h-6 w-6" />
            </motion.button>
        </>
    );
}

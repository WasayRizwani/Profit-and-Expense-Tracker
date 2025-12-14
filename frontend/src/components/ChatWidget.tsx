import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
    role: "user" | "assistant";
    content: string;
}

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hello! I'm your TikTrack assistant. Ask me about your sales, inventory, or expenses." }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load session from local storage or create a new one is handled by backend if we send a stored one
    // but for now, let's keep it simple and just rely on the session returned by the first call
    // Ideally, we'd store the session_id in localStorage.
    const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem("chat_session_id"));

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const payload: any = { query: userMessage };
            if (sessionId) {
                payload.session_id = sessionId;
            }

            const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const response = await fetch(`${API_URL}/agent/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Failed to get response");

            const data = await response.json();

            // Save session ID if it's new
            if (data.session_id && data.session_id !== sessionId) {
                setSessionId(data.session_id);
                localStorage.setItem("chat_session_id", data.session_id);
            }

            setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error connecting to the agent." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 print:hidden">
            {isOpen && (
                <Card className="w-[380px] h-[500px] flex flex-col shadow-2xl border-border/50 backdrop-blur-xl bg-background/95 overflow-hidden animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Bot className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">TikTrack Assistant</h3>
                                <p className="text-xs text-muted-foreground">Powered by Gemini AI</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="flex flex-col gap-4">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex gap-3 max-w-[85%]",
                                        msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
                                    )}
                                >
                                    <div className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                                    )}>
                                        {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    <div className={cn(
                                        "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                        msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-muted/50 text-foreground border rounded-tl-none"
                                    )}>
                                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug prose-pre:bg-secondary/50 prose-pre:p-2 prose-pre:rounded-md">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3 max-w-[85%] self-start animate-pulse">
                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                        <Bot className="h-4 w-4" />
                                    </div>
                                    <div className="bg-muted/50 rounded-2xl px-4 py-2.5 rounded-tl-none flex gap-1 items-center h-[38px]">
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-4 border-t bg-background/50 backdrop-blur-sm">
                        <div className="relative">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about sales, stock, expenses..."
                                className="pr-12 rounded-full border-muted-foreground/20 focus-visible:ring-offset-0 focus-visible:ring-1"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-1 top-1 h-8 w-8 rounded-full"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* FAB */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg transition-transform duration-300 hover:scale-110",
                    isOpen ? "bg-muted text-foreground hover:bg-muted/90 rotate-90" : "bg-primary text-primary-foreground"
                )}
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-7 w-7" />}
            </Button>
        </div>
    );
};

export default ChatWidget;

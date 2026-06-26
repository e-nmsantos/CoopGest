import { useState, useRef, useEffect } from 'react';
import { useProjectChat } from '../../hooks/useProjectChat';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface ChatProps {
    projectId: string;
    currentUser: { name: string };
}

export function Chat({ projectId, currentUser }: ChatProps) {
    const { messages, sendMessage, isConnected } = useProjectChat(projectId);
    const [newMessage, setNewMessage] = useState('');
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
        }
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            sendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 p-4">
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-end gap-2 my-2 ${msg.user_nome === currentUser.name ? 'justify-end' : ''}`}>
                            {msg.user_nome !== currentUser.name && (
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{msg.user_nome.charAt(0)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={`rounded-lg px-3 py-2 max-w-xs lg:max-w-md ${msg.user_nome === currentUser.name ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm">{msg.texto}</p>
                                <p className="text-xs text-right mt-1 opacity-75">{new Date(msg.criado_em).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    ))}
                </ScrollArea>
            </div>
            <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isConnected ? "Escreva uma mensagem..." : "A ligar ao chat..."}
                        disabled={!isConnected}
                    />
                    <Button type="submit" disabled={!isConnected || !newMessage.trim()}>
                        Enviar
                    </Button>
                </form>
            </div>
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/apiClient';

interface Message {
    id: number;
    projeto_id: number;
    user_nome: string;
    texto: string;
    criado_em: string;
}

export function useProjectChat(projectId: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    const fetchMessages = useCallback(async () => {
        try {
            const data = await apiGet<Message[]>(`/api/projects/${projectId}/chat`);
            setMessages(data);
        } catch (error) {
            console.error("Failed to fetch messages", error);
        }
    }, [projectId]);

    const sendMessage = useCallback(async (text: string) => {
        try {
            await apiPost<Message>(`/api/projects/${projectId}/chat`, { texto: text });
        } catch (error) {
            console.error(error);
        }
    }, [projectId]);

    useEffect(() => {
        fetchMessages();

        const eventSource = new EventSource(`/api/projects/${projectId}/events`);

        eventSource.onopen = () => setIsConnected(true);
        eventSource.onerror = () => setIsConnected(false);

        eventSource.addEventListener('chat_message', (event) => {
            const newMessage = JSON.parse(event.data);
            setMessages((prevMessages) => [...prevMessages, newMessage]);
        });

        return () => {
            eventSource.close();
        };
    }, [projectId, fetchMessages]);

    return { messages, isConnected, sendMessage };
}

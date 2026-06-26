import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../lib/apiClient';

// This would typically be in a types definition file
interface Task {
    id: string;
    [key: string]: any;
}

export function useProjectEvents(projectId: string) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    const fetchTasks = useCallback(async () => {
        try {
            const data = await apiGet<Task[]>(`/api/projects/${projectId}/tasks`);
            setTasks(data);
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        }
    }, [projectId]);

    useEffect(() => {
        fetchTasks();

        const eventSource = new EventSource(`/api/projects/${projectId}/events`);

        eventSource.onopen = () => {
            setIsConnected(true);
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            eventSource.close();
        };

        eventSource.onmessage = (event) => {
            const parsedEvent = JSON.parse(event.data);
            const { type, data } = parsedEvent;

            setTasks(currentTasks => {
                switch (type) {
                    case 'task_created':
                        return [...currentTasks, data];
                    case 'task_updated':
                        return currentTasks.map(task => task.id === data.id ? data : task);
                    case 'task_deleted':
                        return currentTasks.filter(task => task.id !== data.id);
                    default:
                        return currentTasks;
                }
            });
        };

        return () => {
            eventSource.close();
        };
    }, [projectId, fetchTasks]);

    return { tasks, isConnected, refetchTasks: fetchTasks };
}

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Client } from '@/types';
import { clients as mockClients } from '@/mocks';

interface ClientContextValue {
  clients: Client[];
  addClient: (c: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClient: (id: string) => Client | undefined;
  linkCaseToClient: (clientId: string, caseId: string) => void;
  unlinkCaseFromClient: (clientId: string, caseId: string) => void;
  searchClients: (q: string) => Client[];
}

const ClientContext = createContext<ClientContextValue | undefined>(undefined);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<Client[]>(mockClients);

  const addClient = useCallback((c: Client) => {
    setClients((prev) => [...prev, c]);
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getClient = useCallback((id: string) => clients.find((c) => c.id === id), [clients]);

  const linkCaseToClient = useCallback((clientId: string, caseId: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId && !c.caseIds.includes(caseId)
          ? { ...c, caseIds: [...c.caseIds, caseId] }
          : c
      )
    );
  }, []);

  const unlinkCaseFromClient = useCallback((clientId: string, caseId: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, caseIds: c.caseIds.filter((id) => id !== caseId) } : c
      )
    );
  }, []);

  const searchClients = useCallback(
    (q: string) => {
      if (!q.trim()) return clients;
      const lower = q.toLowerCase();
      return clients.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.email.toLowerCase().includes(lower) ||
          c.phone.includes(q) ||
          (c.tan && c.tan.toLowerCase().includes(lower))
      );
    },
    [clients]
  );

  return (
    <ClientContext.Provider
      value={{ clients, addClient, updateClient, deleteClient, getClient, linkCaseToClient, unlinkCaseFromClient, searchClients }}
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClients() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClients must be used within ClientProvider');
  return ctx;
}

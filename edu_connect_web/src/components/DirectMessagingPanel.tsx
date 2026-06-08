import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { api } from '../lib/api';
import { useLocale, type Locale } from '../lib/i18n';

interface DmContact {
  user_id: string;
  full_name: string;
  role: string;
  email?: string | null;
}

interface DmParticipant {
  user_id: string;
  full_name: string;
  role: string;
}

interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  bulk_send_id?: string | null;
  created_at: string;
}

interface DmConversation {
  id: string;
  school_id: string;
  type: string;
  title?: string | null;
  created_by: string;
  created_at: string;
  unread_count: number;
  last_message?: DmMessage | null;
  participants: DmParticipant[];
}

interface DirectMessagingPanelProps {
  scopeKey: string;
}

const emptyContacts: DmContact[] = [];
const emptyConversations: DmConversation[] = [];
const emptyMessages: DmMessage[] = [];

function localeToIntl(locale: Locale) {
  if (locale === 'ar') return 'ar-DZ';
  if (locale === 'en') return 'en-US';
  return 'fr-DZ';
}

function formatTime(value: string, locale: Locale): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(localeToIntl(locale), { hour: '2-digit', minute: '2-digit' }).format(parsed);
}

function readCurrentUserId(): string | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as { id?: unknown };
    return typeof user.id === 'string' ? user.id : null;
  } catch {
    return null;
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
}

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown } } }).response;
    const detail = response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (detail) return JSON.stringify(detail);
  }
  if (error instanceof Error) return error.message;
  return null;
}

export default function DirectMessagingPanel({ scopeKey }: DirectMessagingPanelProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const currentUserId = useMemo(() => readCurrentUserId(), []);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [typedMessage, setTypedMessage] = useState('');

  const contactsQuery = useQuery<DmContact[]>({
    queryKey: [scopeKey, 'dm-contacts'],
    queryFn: async () => {
      const response = await api.get('/dm/contacts');
      return response.data;
    },
  });

  const conversationsQuery = useQuery<DmConversation[]>({
    queryKey: [scopeKey, 'dm-conversations'],
    queryFn: async () => {
      const response = await api.get('/dm/conversations');
      return response.data;
    },
  });

  const contacts = contactsQuery.data ?? emptyContacts;
  const conversations = conversationsQuery.data ?? emptyConversations;

  const selectedContact = contacts.find((contact) => contact.user_id === selectedContactId) ?? contacts[0] ?? null;

  const selectedConversation = useMemo(() => {
    if (!selectedContact) return null;
    return conversations.find((conversation) =>
      conversation.type === 'direct' &&
      conversation.participants.some((participant) => participant.user_id === selectedContact.user_id),
    ) ?? null;
  }, [conversations, selectedContact]);

  const messagesQuery = useQuery<DmMessage[]>({
    queryKey: [scopeKey, 'dm-messages', selectedConversation?.id],
    enabled: Boolean(selectedConversation?.id),
    queryFn: async () => {
      const response = await api.get(`/dm/conversations/${selectedConversation?.id}/messages`);
      return response.data;
    },
  });

  const messages = messagesQuery.data ?? emptyMessages;
  const loadError = contactsQuery.error || conversationsQuery.error || messagesQuery.error;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const content = typedMessage.trim();
      if (!content) return;
      if (!selectedContact) throw new Error(t('messages.recipientRequired'));

      if (selectedConversation) {
        await api.post(`/dm/conversations/${selectedConversation.id}/messages`, { content });
        return;
      }

      await api.post('/dm/conversations', {
        recipient_id: selectedContact.user_id,
        initial_message: content,
      });
    },
    onSuccess: () => {
      setTypedMessage('');
      void queryClient.invalidateQueries({ queryKey: [scopeKey, 'dm-conversations'] });
      void queryClient.invalidateQueries({ queryKey: [scopeKey, 'dm-messages'] });
    },
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
    if (!typedMessage.trim()) return;
    sendMutation.mutate();
  };

  const selectedLastMessage = selectedConversation?.last_message?.content;
  const visibleError = getErrorMessage(loadError) || getErrorMessage(sendMutation.error);

  return (
    <div className="animate-fade-in dashboard-split dashboard-split--chat" role="tabpanel">
      <div className="dashboard-side">
        <h3 className="dashboard-section-title">{t('messages.contactsTitle')}</h3>
        <div className="dashboard-list">
          {contactsQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
          {!contactsQuery.isLoading && contacts.length === 0 && (
            <p className="empty-list-copy">{t('messages.emptyContacts')}</p>
          )}
          {contacts.map((contact) => {
            const active = selectedContact?.user_id === contact.user_id;
            const lastMessage = conversations.find((conversation) =>
              conversation.type === 'direct' &&
              conversation.participants.some((participant) => participant.user_id === contact.user_id),
            )?.last_message?.content;
            return (
              <button
                type="button"
                key={contact.user_id}
                className={`class-card class-card-button contact-card ${active ? 'class-card--active' : ''}`}
                onClick={() => setSelectedContactId(contact.user_id)}
                aria-pressed={active}
                aria-label={t('messages.contactAria', {
                  name: contact.full_name,
                  role: t(`role.${contact.role}`),
                })}
              >
                <div className="contact-avatar">{initials(contact.full_name)}</div>
                <div className="contact-card-body">
                  <h4 className="contact-name">{contact.full_name}</h4>
                  <p className="contact-preview">{lastMessage || t(`role.${contact.role}`)}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="dashboard-toolbar">
          <div>
            <h3 className="dashboard-section-title dashboard-section-title--plain">
              {selectedContact?.full_name || t('messages.chooseRecipient')}
            </h3>
            <p className="dashboard-section-copy">{t('messages.policy')}</p>
          </div>
          {selectedContact && <span className="badge badge-success">{t('messages.recipientBadge')}</span>}
        </div>

        {visibleError && (
          <div className="login-error direct-message-error" role="alert">
            {visibleError}
          </div>
        )}

        <div className="chat-sim-container" aria-label={t('messages.messagesAria')}>
          <div className="chat-sim-messages">
            {messagesQuery.isLoading && <p className="empty-list-copy">{t('common.loading')}</p>}
            {!messagesQuery.isLoading && messages.length === 0 && (
              <p className="empty-list-copy">
                {selectedLastMessage || t('messages.emptyConversation')}
              </p>
            )}
            {messages.map((message) => {
              const outgoing = message.sender_id === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`chat-sim-bubble ${outgoing ? 'chat-sim-bubble-outgoing' : 'chat-sim-bubble-incoming'}`}
                >
                  <div className={`chat-message-header ${outgoing ? 'chat-message-header--outgoing' : 'chat-message-header--incoming'}`}>
                    {outgoing ? t('messages.senderYou') : message.sender_name}
                  </div>
                  <div>{message.content}</div>
                  <div className="chat-message-time">{formatTime(message.created_at, locale)}</div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="chat-sim-input-bar">
            <input
              type="text"
              className="input-field chat-input-field"
              value={typedMessage}
              onChange={(event) => setTypedMessage(event.target.value)}
              placeholder={t('messages.placeholder')}
              aria-label={t('messages.writeMessage')}
              disabled={!selectedContact || sendMutation.isPending}
            />
            <button
              type="submit"
              className="btn btn-primary btn-icon-square"
              aria-label={t('messages.sendMessage')}
              disabled={!selectedContact || sendMutation.isPending || !typedMessage.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
